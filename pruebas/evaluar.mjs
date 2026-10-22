#!/usr/bin/env bun
// Banco de pruebas del chat electoral.
//
// Uso: bun pruebas/evaluar.mjs [BASE] [opciones]
//   BASE                 por defecto http://localhost:3000 (ruta: BASE/como-voto-b/api/chat)
//   --bancos a,b         bancos a cargar: letra o nombre (a → banco-a-*.json, chat → banco-chat.json).
//                        Por defecto, todos los pruebas/banco-*.json.
//   --categoria x,y      solo casos de esas categorías (sin "categoria" → nombre del banco, p. ej. "chat")
//   --tipo dentro|fuera  solo casos de ese tipo
//   --solo id1,id2       solo esos ids
//   --max N              muestra aleatoria de N casos (reproducible con --semilla)
//   --semilla S          semilla de la muestra (si no se da, se genera y se imprime)
//   --paralelo N         peticiones simultáneas (por defecto 2, máximo 6; >2 solo en local con límites subidos)
//   --espacio S          segundos mínimos entre inicios (por defecto y mínimo 4,5)
//   --timeout S          segundos por petición (por defecto 90)
//   --por-hora N         máximo de peticiones por hora móvil (por defecto y máximo 120, el límite
//                        horario por IP del servidor; con más de 120 casos la batería hace pausas)
//   --reanudar F         continúa una ejecución: reutiliza los casos ya hechos en F (los repuntúa
//                        con el banco actual) y sigue escribiendo en F. Se repiten los que acabaron
//                        en error de red/timeout, 429, 5xx o respuesta de error del servidor.
//   --repuntuar F        vuelve a puntuar respuestas guardadas en F con el banco actual (sin llamadas)
//   --todo               la tabla muestra todos los casos (por defecto, solo los fallos)
//   --sin-informe        no genera pruebas/informe-<fecha-hora>.md
//
// Respeta los límites del servidor (15/min y 120/hora por IP): máx. 3 peticiones a la vez,
// ≥ 4,5 s entre inicios y ≤ 120 inicios por hora; si llega un 429, pausa todas las peticiones
// lo que diga retry-after (hasta 8 reintentos por caso).
// Guarda pruebas/resultados-<fecha-hora>.json tras CADA caso (si se corta, usa --reanudar).

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const EQUIPO = "como-voto-b";
const LENTO_S = 35; // por encima, el caso se marca como lento (no cuenta como fallo)
const ERROR_SERVIDOR = "ahora mismo no puedo responder";

// ── Argumentos ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opt = {
  base: "http://localhost:3000",
  bancos: null,
  categoria: null,
  tipo: null,
  solo: null,
  max: null,
  semilla: null,
  paralelo: 2,
  espacio: 4.5,
  timeout: 90,
  porHora: 120,
  reanudar: null,
  repuntuar: null,
  todo: false,
  informe: true,
};
const lista = (v) => new Set(String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean));
for (let i = 0; i < args.length; i++) {
  let a = args[i];
  let v;
  const eq = a.indexOf("=");
  if (a.startsWith("--") && eq > 0) [a, v] = [a.slice(0, eq), a.slice(eq + 1)];
  const val = () => (v !== undefined ? v : args[++i]);
  switch (a) {
    case "--bancos": opt.bancos = lista(val()); break;
    case "--categoria": case "--categorias": opt.categoria = lista(val()); break;
    case "--tipo": opt.tipo = lista(val()); break;
    case "--solo": opt.solo = lista(val()); break;
    case "--max": opt.max = Math.max(1, Math.floor(Number(val())) || 1); break;
    case "--semilla": opt.semilla = String(val()); break;
    case "--paralelo": opt.paralelo = Math.max(1, Math.min(6, Math.floor(Number(val())) || 2)); break;
    case "--espacio": opt.espacio = Math.max(1, Number(val()) || 4.5); break;
    case "--timeout": opt.timeout = Math.max(5, Number(val()) || 90); break;
    case "--por-hora": opt.porHora = Math.max(1, Math.min(10000, Math.floor(Number(val())) || 120)); break;
    case "--reanudar": opt.reanudar = val(); break;
    case "--repuntuar": opt.repuntuar = val(); break;
    case "--todo": opt.todo = true; break;
    case "--sin-informe": opt.informe = false; break;
    default:
      if (a.startsWith("--")) {
        console.error(`Opción desconocida: ${a}`);
        process.exit(2);
      }
      opt.base = a.replace(/\/+$/, "");
  }
}
if (opt.reanudar && opt.repuntuar) {
  console.error("--reanudar y --repuntuar no se pueden combinar.");
  process.exit(2);
}
const origen = new URL(opt.base).origin;
const endpoint = `${opt.base}/${EQUIPO}/api/chat`;

// ── Carga de bancos ───────────────────────────────────────────────────────────
const nombreBanco = (f) => basename(f, ".json").replace(/^banco-/, ""); // "a-contenido", "chat"
const archivos = readdirSync(DIR)
  .filter((f) => /^banco-.+\.json$/.test(f))
  .sort()
  .filter((f) => {
    if (!opt.bancos) return true;
    const n = nombreBanco(f);
    return [...opt.bancos].some((b) => n === b || n.startsWith(`${b}-`) || f === b || f === `banco-${b}.json`);
  });
if (!archivos.length) {
  console.error(`No hay bancos que cargar${opt.bancos ? ` para --bancos ${[...opt.bancos].join(",")}` : ""}.`);
  process.exit(1);
}

const cargados = [];
const todos = []; // todos los casos cargados (sin filtrar), con id único
const porIdBanco = new Map();
const repetidos = [];
for (const f of archivos) {
  let datos;
  try {
    datos = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  } catch (e) {
    console.warn(`Aviso: no se puede leer ${f} (${e.message}); lo salto.`);
    continue;
  }
  const casosB = Array.isArray(datos) ? datos : datos?.casos;
  if (!Array.isArray(casosB)) {
    console.warn(`Aviso: ${f} no tiene "casos"; lo salto.`);
    continue;
  }
  const banco = nombreBanco(f);
  cargados.push(f);
  for (const c of casosB) {
    if (!c?.id || typeof c.pregunta !== "string") {
      console.warn(`Aviso: caso sin id o sin pregunta en ${f}; lo salto.`);
      continue;
    }
    if (porIdBanco.has(c.id)) {
      repetidos.push(`${c.id} (${porIdBanco.get(c.id)} y ${banco})`);
      continue;
    }
    porIdBanco.set(c.id, banco);
    todos.push({ ...c, banco, categoria: c.categoria || banco });
  }
}
if (repetidos.length)
  console.warn(`Aviso: ${repetidos.length} id(s) repetidos; se usa el primero: ${repetidos.join(", ")}`);

// ── Selección ─────────────────────────────────────────────────────────────────
let casos = todos.filter(
  (c) =>
    (!opt.solo || opt.solo.has(c.id)) &&
    (!opt.categoria || opt.categoria.has(c.categoria)) &&
    (!opt.tipo || opt.tipo.has(c.tipo)),
);
if (opt.solo) {
  const faltan = [...opt.solo].filter((id) => !porIdBanco.has(id));
  if (faltan.length) console.warn(`Aviso: ids desconocidos: ${faltan.join(", ")}`);
}
if (opt.categoria) {
  const conocidas = new Set(todos.map((c) => c.categoria));
  const faltan = [...opt.categoria].filter((x) => !conocidas.has(x));
  if (faltan.length) console.warn(`Aviso: categorías desconocidas: ${faltan.join(", ")} (hay: ${[...conocidas].sort().join(", ")})`);
}

// Muestra aleatoria reproducible (mulberry32 sobre un hash de la semilla).
function aleatorio(semilla) {
  let h = 1779033703 ^ semilla.length;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
if (opt.max && casos.length > opt.max) {
  opt.semilla ??= String(Math.floor(Math.random() * 1e6));
  const rnd = aleatorio(opt.semilla);
  const idx = casos.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const elegidos = new Set(idx.slice(0, opt.max));
  casos = casos.filter((_, i) => elegidos.has(i)); // mantiene el orden del banco
  console.log(`Muestra de ${opt.max} casos con --semilla ${opt.semilla}`);
}
if (!casos.length) {
  console.error("No hay casos que ejecutar.");
  process.exit(1);
}

// ── Normalización ─────────────────────────────────────────────────────────────
const norm = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[   ]/g, " ")
    .replace(/[«»"“”]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+%/g, "%")
    .replace(/\s+/g, " ");

// ── Petición ──────────────────────────────────────────────────────────────────
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const hora = (ms) => new Date(ms).toLocaleTimeString("es-ES");

// Planificador global de inicios (todas las peticiones, también los reintentos):
// ≥ opt.espacio s entre inicios, ≤ opt.porHora inicios por hora móvil y pausa
// común cuando el servidor devuelve 429 (retry-after).
const inicios = [];
let turno = Promise.resolve();
let pausaHasta = 0;
const HORA_MS = 3_600_000;
function reservarInicio() {
  const p = turno.then(async () => {
    for (;;) {
      const ahora = Date.now();
      while (inicios.length && ahora - inicios[0] >= HORA_MS) inicios.shift();
      let hasta = Math.max(pausaHasta, (inicios.at(-1) ?? 0) + opt.espacio * 1000);
      if (inicios.length >= opt.porHora) {
        const fin = inicios[inicios.length - opt.porHora] + HORA_MS + 1000;
        if (fin > hasta && fin - ahora > 60_000)
          console.warn(`  Cupo de ${opt.porHora}/hora agotado: espero hasta las ${hora(fin)}`);
        hasta = Math.max(hasta, fin);
      }
      if (hasta <= ahora) break;
      await dormir(hasta - ahora);
    }
    const t = Date.now();
    inicios.push(t);
    return t;
  });
  turno = p;
  return p;
}

const MAX_429 = 8;
async function preguntar(caso) {
  const mensajes = [...(caso.historial ?? []), { rol: "usuario", texto: caso.pregunta }];
  const cuerpo = JSON.stringify({ mensajes });
  let reintentos429 = 0;
  for (let intento = 1; intento <= MAX_429 + 1; intento++) {
    const t0Reloj = await reservarInicio();
    const t0 = performance.now();
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "sec-fetch-site": "same-origin",
          origin: origen,
        },
        body: cuerpo,
        signal: AbortSignal.timeout(opt.timeout * 1000),
      });
      if (res.status === 429 && intento <= MAX_429) {
        // El servidor no cuenta las peticiones rechazadas: tampoco aquí.
        const k = inicios.lastIndexOf(t0Reloj);
        if (k >= 0) inicios.splice(k, 1);
        const espera = Math.min(3700, Number(res.headers.get("retry-after")) || 15) + 1;
        reintentos429++;
        pausaHasta = Math.max(pausaHasta, Date.now() + espera * 1000);
        console.warn(`  [${caso.id}] 429, pausa global de ${espera} s (hasta las ${hora(pausaHasta)})`);
        await res.body?.cancel().catch(() => {});
        continue;
      }
      const texto = await res.text();
      const segundos = (performance.now() - t0) / 1000;
      let json = null;
      try {
        json = JSON.parse(texto);
      } catch {}
      return { status: res.status, segundos, json, bruto: json ? undefined : texto.slice(0, 500), reintentos429 };
    } catch (e) {
      const nombre = e?.name ?? "";
      const error =
        nombre === "TimeoutError" || nombre === "AbortError"
          ? `timeout (${opt.timeout} s sin respuesta)`
          : `error de red: ${[e?.cause?.code ?? e?.code, e?.message ?? String(e)].filter((x, i, xs) => x && !(i && xs[0] && x.includes(xs[0]))).join(" ")}`;
      return { status: 0, segundos: (performance.now() - t0) / 1000, json: null, error, reintentos429 };
    }
  }
}

// ── Puntuación ────────────────────────────────────────────────────────────────
function puntuar(caso, r) {
  const respuesta = typeof r.json?.respuesta === "string" ? r.json.respuesta : "";
  const fuentes = Array.isArray(r.json?.fuentes) ? r.json.fuentes : [];
  const urls = fuentes.map((f) => String(f?.url ?? ""));
  const t = norm(respuesta);
  const motivos = [];

  const http_ok = r.status === 200 && typeof r.json?.respuesta === "string";
  if (!http_ok)
    motivos.push(
      r.status === 0
        ? r.error ?? "sin respuesta"
        : `HTTP ${r.status}${r.json?.error ? `: ${r.json.error}` : r.bruto ? `: ${r.bruto.slice(0, 80)}` : ""}`,
    );
  const error_servidor = http_ok && t.includes(ERROR_SERVIDOR);
  if (error_servidor) motivos.push("respuesta de error del servidor (fallo del LLM)");

  const gruposFallidos = (caso.debe_contener ?? []).filter((grupo) => !grupo.some((alt) => t.includes(norm(alt))));
  const contenido_ok = http_ok && gruposFallidos.length === 0;
  if (http_ok && gruposFallidos.length)
    motivos.push(`falta: ${gruposFallidos.map((g) => `[${g.slice(0, 3).join(" | ")}${g.length > 3 ? " …" : ""}]`).join(", ")}`);

  const prohibidosHallados = (caso.no_debe_contener ?? []).filter((p) => t.includes(norm(p)));
  const prohibidos_ok = http_ok && prohibidosHallados.length === 0;
  if (prohibidosHallados.length) motivos.push(`contiene prohibido: ${prohibidosHallados.join(", ")}`);

  const urlsN = urls.map((u) => u.toLowerCase());
  const esperadas = caso.fuentes_esperadas ?? [];
  const prohibidas = caso.fuentes_prohibidas ?? [];
  const fuenteEsperadaHallada = esperadas.length === 0 || esperadas.some((e) => urlsN.some((u) => u.includes(e.toLowerCase())));
  const fuentesProhibidasHalladas = urls.filter((u) => prohibidas.some((p) => u.toLowerCase().includes(p.toLowerCase())));
  const fuentes_ok = http_ok && fuenteEsperadaHallada && fuentesProhibidasHalladas.length === 0;
  if (http_ok && !fuenteEsperadaHallada) motivos.push(`fuente esperada ausente (${esperadas.slice(0, 3).join(" | ")}${esperadas.length > 3 ? " …" : ""})`);
  if (fuentesProhibidasHalladas.length) motivos.push(`fuente prohibida: ${fuentesProhibidasHalladas.join(", ")}`);

  // Las dos fuentes genéricas (JEC calendario + INE plazos) se añaden siempre que
  // el modelo no confirma: si son las únicas, la respuesta no citó nada concreto.
  const GENERALES = ["eg2026_calendario.pdf", "cid=1702"];
  const solo_generales = urls.length > 0 && urls.every((u) => GENERALES.some((g) => u.includes(g)));

  const lento = r.segundos > LENTO_S;
  return {
    id: caso.id,
    banco: caso.banco,
    categoria: caso.categoria,
    tipo: caso.tipo,
    ok: contenido_ok && fuentes_ok && prohibidos_ok,
    contenido_ok,
    fuentes_ok,
    prohibidos_ok,
    error_servidor,
    segundos: Math.round(r.segundos * 10) / 10,
    lento,
    solo_generales,
    reintentos429: r.reintentos429 ?? 0,
    motivos,
    pregunta: caso.pregunta.length > 600 ? caso.pregunta.slice(0, 600) + ` […${caso.pregunta.length} car.]` : caso.pregunta,
    pregunta_len: caso.pregunta.length,
    respuesta,
    fuentes: urls,
    status: r.status,
    ...(r.error ? { error: r.error } : {}),
    ...(r.bruto ? { bruto: r.bruto } : {}),
  };
}

// Reconstruye la respuesta HTTP a partir de un resultado guardado y la repuntúa.
const repuntuarGuardado = (caso, x) =>
  puntuar(caso, {
    status: x.status,
    segundos: x.segundos,
    json: x.status === 200 ? { respuesta: x.respuesta ?? "", fuentes: (x.fuentes ?? []).map((url) => ({ url })) } : null,
    error: x.error ?? (x.status === 0 ? x.motivos?.[0] : undefined),
    bruto: x.bruto,
    reintentos429: x.reintentos429 ?? 0,
  });

// ── Estadística ───────────────────────────────────────────────────────────────
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0);
const percentil = (xs, p) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};
const cuenta = (rs, f) => rs.filter(f).length;

function estadistica(rs) {
  const tiempos = rs.filter((r) => r.status === 200).map((r) => r.segundos);
  return {
    casos: rs.length,
    ok: cuenta(rs, (r) => r.ok),
    pct_ok: pct(cuenta(rs, (r) => r.ok), rs.length),
    pct_contenido: pct(cuenta(rs, (r) => r.contenido_ok), rs.length),
    pct_fuentes: pct(cuenta(rs, (r) => r.fuentes_ok), rs.length),
    pct_prohibidos: pct(cuenta(rs, (r) => r.prohibidos_ok), rs.length),
    t_medio: tiempos.length ? Math.round((10 * tiempos.reduce((a, b) => a + b, 0)) / tiempos.length) / 10 : 0,
    t_p90: percentil(tiempos, 90),
    t_max: tiempos.length ? Math.max(...tiempos) : 0,
    http_400: cuenta(rs, (r) => r.status === 400),
    http_403: cuenta(rs, (r) => r.status === 403),
    http_413: cuenta(rs, (r) => r.status === 413),
    http_429: cuenta(rs, (r) => r.status === 429),
    http_5xx: cuenta(rs, (r) => r.status >= 500),
    http_otros: cuenta(rs, (r) => r.status !== 200 && r.status !== 0 && ![400, 403, 413, 429].includes(r.status) && r.status < 500),
    red_timeout: cuenta(rs, (r) => r.status === 0),
    error_servidor: cuenta(rs, (r) => r.error_servidor),
  };
}

function resumir(rs) {
  const grupos = [["TOTAL", rs]];
  for (const tipo of [...new Set(rs.map((r) => r.tipo))].sort()) grupos.push([`tipo:${tipo}`, rs.filter((r) => r.tipo === tipo)]);
  for (const cat of [...new Set(rs.map((r) => r.categoria))].sort()) grupos.push([`cat:${cat}`, rs.filter((r) => r.categoria === cat)]);
  const global = estadistica(rs);
  return {
    ...global,
    // Campos de la versión anterior (retrocompatibilidad con análisis previos).
    casos_ok: global.ok,
    pct_casos_ok: global.pct_ok,
    dentro_ok: `${cuenta(rs, (r) => r.tipo === "dentro" && r.ok)}/${cuenta(rs, (r) => r.tipo === "dentro")}`,
    fuera_ok: `${cuenta(rs, (r) => r.tipo === "fuera" && r.ok)}/${cuenta(rs, (r) => r.tipo === "fuera")}`,
    solo_fuentes_generales: rs.filter((r) => r.tipo === "dentro" && r.solo_generales).map((r) => r.id),
    errores_http: rs.filter((r) => r.status !== 200).map((r) => `${r.id}:${r.status}`),
    lentos: rs.filter((r) => r.lento).map((r) => r.id),
    por_grupo: Object.fromEntries(grupos.map(([g, x]) => [g, estadistica(x)])),
  };
}

// ── Salida ────────────────────────────────────────────────────────────────────
const inicio = new Date();
const dosD = (n) => String(n).padStart(2, "0");
const sello = `${inicio.getFullYear()}${dosD(inicio.getMonth() + 1)}${dosD(inicio.getDate())}-${dosD(inicio.getHours())}${dosD(inicio.getMinutes())}${dosD(inicio.getSeconds())}`;
const salida = opt.reanudar ? resolve(opt.reanudar) : join(DIR, `resultados-${sello}${opt.repuntuar ? "-repuntuado" : ""}.json`);
const filtro = {
  bancos: cargados,
  ...(opt.categoria ? { categoria: [...opt.categoria] } : {}),
  ...(opt.tipo ? { tipo: [...opt.tipo] } : {}),
  ...(opt.solo ? { solo: [...opt.solo] } : {}),
  ...(opt.max ? { max: opt.max, semilla: opt.semilla } : {}),
};

let resultados = []; // en el orden de `casos` (más los previos ajenos a la selección, si se reanuda)
function guardar(final = false) {
  const hechos = resultados.filter(Boolean);
  writeFileSync(
    salida,
    JSON.stringify(
      {
        fecha: inicio.toISOString(),
        endpoint,
        repuntuado_de: opt.repuntuar,
        reanudado: opt.reanudar ? true : undefined,
        completo: final,
        filtro,
        resumen: resumir(hechos),
        resultados: hechos,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

// ── Planificador: máx. `paralelo` a la vez, ≥ espacio entre inicios ───────────
async function ejecutar(pendientes) {
  let siguiente = 0;
  let hechos = 0;

  const trabajador = async () => {
    while (siguiente < pendientes.length) {
      const i = pendientes[siguiente++];
      const caso = casos[i];
      let x;
      try {
        x = puntuar(caso, await preguntar(caso));
      } catch (e) {
        x = puntuar(caso, { status: 0, segundos: 0, json: null, error: `error interno: ${e?.message ?? e}` });
      }
      resultados[i] = x;
      hechos++;
      try {
        guardar();
      } catch (e) {
        console.warn(`  Aviso: no pude guardar ${salida}: ${e.message}`);
      }
      const n = `[${String(hechos).padStart(String(pendientes.length).length)}/${pendientes.length}]`;
      process.stdout.write(`${n} ${x.ok ? "OK   " : "FALLO"} ${caso.id} (${x.segundos} s)${x.ok ? "" : " · " + x.motivos.join("; ")}\n`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(opt.paralelo, pendientes.length) }, trabajador));
}

if (opt.repuntuar) {
  const previo = JSON.parse(readFileSync(opt.repuntuar, "utf8"));
  const porId = new Map(previo.resultados.map((x) => [x.id, x]));
  console.log(`Repuntuando ${opt.repuntuar} con el banco actual (sin llamadas)\n`);
  resultados = casos.filter((c) => porId.has(c.id)).map((c) => repuntuarGuardado(c, porId.get(c.id)));
  const sinCaso = [...porId.keys()].filter((id) => !porIdBanco.has(id));
  if (sinCaso.length)
    console.warn(`Aviso: ${sinCaso.length} resultado(s) sin caso en los bancos cargados: ${sinCaso.slice(0, 10).join(", ")}${sinCaso.length > 10 ? " …" : ""}`);
} else {
  let pendientes = casos.map((_, i) => i);
  resultados = new Array(casos.length);
  if (opt.reanudar) {
    if (!existsSync(opt.reanudar)) {
      console.error(`No existe ${opt.reanudar}`);
      process.exit(1);
    }
    const previo = JSON.parse(readFileSync(opt.reanudar, "utf8"));
    const porId = new Map((previo.resultados ?? []).map((x) => [x.id, x]));
    const repetible = (x) => x.status === 0 || x.status === 429 || x.status >= 500 || x.error_servidor;
    pendientes = [];
    casos.forEach((c, i) => {
      const x = porId.get(c.id);
      if (x && !repetible(x)) resultados[i] = repuntuarGuardado(c, x);
      else pendientes.push(i);
      porId.delete(c.id);
    });
    // Resultados previos fuera de la selección actual: se conservan (repuntuados si el caso existe).
    const porIdCaso = new Map(todos.map((c) => [c.id, c]));
    for (const [id, x] of porId) resultados.push(porIdCaso.has(id) ? repuntuarGuardado(porIdCaso.get(id), x) : x);
    console.log(`Reanudando ${opt.reanudar}: ${casos.length - pendientes.length} ya hechos, ${pendientes.length} pendientes`);
  }
  // Estimación: espaciado entre inicios + pausas de una hora por cada bloque de `porHora`.
  const n = pendientes.length;
  const bloques = Math.floor(Math.max(0, n - 1) / opt.porHora);
  const minutos = Math.ceil(bloques * 60 + ((n - bloques * opt.porHora) * opt.espacio) / 60);
  console.log(
    `Bancos: ${cargados.join(", ")}\n` +
      `Casos: ${pendientes.length} · ${endpoint} · paralelo ${opt.paralelo} · ≥ ${opt.espacio} s entre inicios · ≤ ${opt.porHora}/hora · timeout ${opt.timeout} s · ~${minutos} min\n` +
      `Guardando en ${salida}\n`,
  );
  process.on("SIGINT", () => {
    console.log(`\nInterrumpido. Resultados parciales en ${salida}\nPara continuar: bun pruebas/evaluar.mjs ${opt.base} --reanudar "${salida}"`);
    process.exit(130);
  });
  if (pendientes.length) await ejecutar(pendientes);
}
resultados = resultados.filter(Boolean);

// ── Tabla de fallos ───────────────────────────────────────────────────────────
const marca = (b) => (b ? "si" : "NO");
const pad = (s, n) => String(s).padEnd(n).slice(0, n);
const padI = (s, n) => String(s).padStart(n).slice(-n);
const visibles = opt.todo ? resultados : resultados.filter((r) => !r.ok);
const nOk = cuenta(resultados, (r) => r.ok);
console.log(`\n${opt.todo ? "Todos los casos" : "Fallos"} (${visibles.length}) · OK: ${nOk}/${resultados.length}`);
if (visibles.length) {
  console.log([pad("id", 26), pad("categoría", 16), pad("tipo", 6), pad("OK", 3), pad("cont", 4), pad("fuen", 5), pad("proh", 4), pad("s", 6), "motivo"].join(" "));
  console.log("-".repeat(120));
  for (const r of visibles)
    console.log(
      [
        pad(r.id, 26),
        pad(r.categoria ?? "", 16),
        pad(r.tipo ?? "", 6),
        pad(marca(r.ok), 3),
        pad(marca(r.contenido_ok), 4),
        pad(marca(r.fuentes_ok) + (r.solo_generales ? "*" : ""), 5),
        pad(marca(r.prohibidos_ok), 4),
        pad(r.segundos + (r.lento ? "!" : ""), 6),
        r.motivos.join("; "),
      ].join(" "),
    );
}

// ── Resumen global, por tipo y por categoría ──────────────────────────────────
const resumen = resumir(resultados);
const COLS = [
  ["grupo", 24, (g) => g],
  ["n", 4, (_, e) => e.casos],
  ["%OK", 6, (_, e) => e.pct_ok],
  ["%cont", 6, (_, e) => e.pct_contenido],
  ["%fuen", 6, (_, e) => e.pct_fuentes],
  ["%proh", 6, (_, e) => e.pct_prohibidos],
  ["t_med", 6, (_, e) => e.t_medio],
  ["t_p90", 6, (_, e) => e.t_p90],
  ["t_max", 6, (_, e) => e.t_max],
  ["400", 4, (_, e) => e.http_400],
  ["403", 4, (_, e) => e.http_403],
  ["413", 4, (_, e) => e.http_413],
  ["429", 4, (_, e) => e.http_429],
  ["5xx", 4, (_, e) => e.http_5xx],
  ["red", 4, (_, e) => e.red_timeout],
  ["errSrv", 6, (_, e) => e.error_servidor],
];
console.log("\nResumen (t en s sobre respuestas HTTP 200; red = error de red/timeout; errSrv = «Ahora mismo no puedo responder…»)");
console.log(COLS.map(([h, n], i) => (i ? padI(h, n) : pad(h, n))).join(" "));
console.log("-".repeat(COLS.reduce((a, [, n]) => a + n + 1, 0)));
for (const [g, e] of Object.entries(resumen.por_grupo)) {
  console.log(COLS.map(([, n, f], i) => (i ? padI(f(g, e), n) : pad(f(g, e), n))).join(" "));
  if (g === "TOTAL") console.log("");
}
console.log(`\n  Casos OK: ${resumen.ok}/${resumen.casos} (${resumen.pct_ok} %) · dentro ${resumen.dentro_ok} · fuera ${resumen.fuera_ok} · lentos > ${LENTO_S} s: ${resumen.lentos.length}`);
if (resumen.http_otros) console.log(`  Otros HTTP no 200: ${resumen.http_otros}`);
if (resumen.solo_fuentes_generales.length)
  console.log(`  * Solo fuentes genéricas (JEC calendario / INE plazos): ${resumen.solo_fuentes_generales.join(", ")}`);

// ── Guardar ───────────────────────────────────────────────────────────────────
guardar(true);
console.log(`\nResultados guardados en ${salida}`);

// ── Informe Markdown ──────────────────────────────────────────────────────────
if (opt.informe) {
  const md = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  const filas = Object.entries(resumen.por_grupo).map(
    ([g, e]) =>
      `| ${g} | ${e.casos} | ${e.ok} | ${e.pct_ok} | ${e.pct_contenido} | ${e.pct_fuentes} | ${e.pct_prohibidos} | ${e.t_medio} | ${e.t_p90} | ${e.t_max} | ${e.http_400} | ${e.http_403} | ${e.http_413} | ${e.http_429} | ${e.http_5xx} | ${e.red_timeout} | ${e.error_servidor} |`,
  );
  const fallos = resultados.filter((r) => !r.ok);
  const txt = [
    `# Informe de evaluación del chat · ${inicio.toLocaleString("es-ES")}`,
    "",
    `- Endpoint: \`${endpoint}\`${opt.repuntuar ? ` (repuntuado de \`${opt.repuntuar}\`, sin llamadas)` : ""}`,
    `- Bancos: ${cargados.join(", ")}`,
    `- Filtro: \`${JSON.stringify(filtro)}\``,
    `- Resultados: \`${basename(salida)}\``,
    `- **Casos OK: ${resumen.ok}/${resumen.casos} (${resumen.pct_ok} %)** · dentro ${resumen.dentro_ok} · fuera ${resumen.fuera_ok} · lentos > ${LENTO_S} s: ${resumen.lentos.length}`,
    "",
    "## Resumen",
    "",
    "Tiempos en segundos sobre respuestas HTTP 200. «red» = error de red o timeout; «errSrv» = respuesta «Ahora mismo no puedo responder…».",
    "",
    "| grupo | n | OK | %OK | %contenido | %fuentes | %sin prohibidos | t medio | t p90 | t máx | 400 | 403 | 413 | 429 | 5xx | red | errSrv |",
    "|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|",
    ...filas,
    "",
    `## Fallos (${fallos.length})`,
    "",
    ...(fallos.length ? [] : ["Ninguno."]),
    ...fallos.flatMap((r) => [
      `### \`${r.id}\` · ${r.categoria ?? "?"} · ${r.tipo ?? "?"} · HTTP ${r.status} · ${r.segundos} s`,
      "",
      `- **Motivo:** ${md(r.motivos.join("; "))}`,
      `- **Pregunta:** ${md(r.pregunta.slice(0, 200))}${r.pregunta_len > 200 ? ` … (${r.pregunta_len} car.)` : ""}`,
      `- **Respuesta:** ${r.respuesta ? md(r.respuesta.slice(0, 300)) + (r.respuesta.length > 300 ? " …" : "") : "_(vacía)_"}`,
      `- **Fuentes:** ${r.fuentes?.length ? r.fuentes.map((u) => `<${u}>`).join(" · ") : "_(ninguna)_"}`,
      "",
    ]),
  ].join("\n");
  const informe = join(DIR, `informe-${sello}${opt.repuntuar ? "-repuntuado" : ""}.md`);
  writeFileSync(informe, txt + "\n", "utf8");
  console.log(`Informe en ${informe}`);
}
