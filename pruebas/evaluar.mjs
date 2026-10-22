#!/usr/bin/env bun
// Banco de pruebas del chat electoral.
// Uso: bun pruebas/evaluar.mjs [BASE] [--solo id1,id2] [--paralelo 2] [--espacio 4.5]
//      bun pruebas/evaluar.mjs --repuntuar pruebas/resultados-XXXX.json
//      (vuelve a puntuar respuestas ya guardadas con el banco actual, sin llamar al LLM)
// BASE por defecto: http://localhost:3000 (la ruta es BASE/como-voto-b/api/chat).
// Respeta el límite de tasa (15/min por IP): máx. 2 peticiones a la vez y
// ≥ 4,5 s entre inicios; si llega un 429, espera lo que diga retry-after.
// Guarda los resultados en pruebas/resultados-<fecha-hora>.json.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const EQUIPO = "como-voto-b";
const LENTO_S = 35; // por encima, el caso se marca como lento (no cuenta como fallo)
const TIMEOUT_S = 120;

// ── Argumentos ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let base = "http://localhost:3000";
let solo = null;
let paralelo = 2;
let espacioS = 4.5;
let repuntuar = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--solo") solo = new Set(args[++i].split(",").map((s) => s.trim()).filter(Boolean));
  else if (a.startsWith("--solo=")) solo = new Set(a.slice(7).split(",").map((s) => s.trim()).filter(Boolean));
  else if (a === "--repuntuar") repuntuar = args[++i];
  else if (a === "--paralelo") paralelo = Math.max(1, Math.min(2, Number(args[++i]) || 2));
  else if (a === "--espacio") espacioS = Math.max(4.5, Number(args[++i]) || 4.5);
  else if (!a.startsWith("--")) base = a.replace(/\/+$/, "");
}
const origen = new URL(base).origin;
const endpoint = `${base}/${EQUIPO}/api/chat`;

const banco = JSON.parse(readFileSync(join(DIR, "banco-chat.json"), "utf8"));
const casos = banco.casos.filter((c) => !solo || solo.has(c.id));
if (solo) {
  const faltan = [...solo].filter((id) => !banco.casos.some((c) => c.id === id));
  if (faltan.length) console.warn(`Aviso: ids desconocidos: ${faltan.join(", ")}`);
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
    .replace(/[   ]/g, " ")
    .replace(/[«»"“”]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+%/g, "%")
    .replace(/\s+/g, " ");

// ── Petición ──────────────────────────────────────────────────────────────────
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function preguntar(caso) {
  const mensajes = [...(caso.historial ?? []), { rol: "usuario", texto: caso.pregunta }];
  const cuerpo = JSON.stringify({ mensajes });
  let reintentos429 = 0;
  for (let intento = 1; intento <= 4; intento++) {
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
        signal: AbortSignal.timeout(TIMEOUT_S * 1000),
      });
      const segundos = (performance.now() - t0) / 1000;
      if (res.status === 429 && intento < 4) {
        const espera = Math.min(90, Number(res.headers.get("retry-after")) || 15) + 1;
        reintentos429++;
        console.warn(`  [${caso.id}] 429, espero ${espera} s`);
        await dormir(espera * 1000);
        continue;
      }
      const texto = await res.text();
      let json = null;
      try {
        json = JSON.parse(texto);
      } catch {}
      return { status: res.status, segundos, json, bruto: json ? undefined : texto.slice(0, 500), reintentos429 };
    } catch (e) {
      return { status: 0, segundos: (performance.now() - t0) / 1000, json: null, error: String(e?.message ?? e), reintentos429 };
    }
  }
}

// ── Puntuación ────────────────────────────────────────────────────────────────
function puntuar(caso, r) {
  const respuesta = r.json?.respuesta ?? "";
  const fuentes = Array.isArray(r.json?.fuentes) ? r.json.fuentes : [];
  const urls = fuentes.map((f) => String(f?.url ?? ""));
  const t = norm(respuesta);
  const motivos = [];

  const http_ok = r.status === 200 && typeof r.json?.respuesta === "string";
  if (!http_ok) motivos.push(`HTTP ${r.status}${r.error ? ` (${r.error})` : ""}${r.json?.error ? `: ${r.json.error}` : ""}`);

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
    tipo: caso.tipo,
    ok: contenido_ok && fuentes_ok && prohibidos_ok,
    contenido_ok,
    fuentes_ok,
    prohibidos_ok,
    segundos: Math.round(r.segundos * 10) / 10,
    lento,
    solo_generales,
    reintentos429: r.reintentos429,
    motivos,
    pregunta: caso.pregunta,
    respuesta,
    fuentes: urls,
    status: r.status,
    ...(r.bruto ? { bruto: r.bruto } : {}),
  };
}

// ── Planificador: máx. `paralelo` a la vez, ≥ espacioS entre inicios ──────────
async function ejecutar() {
  const resultados = new Array(casos.length);
  let siguiente = 0;
  let ultimoInicio = 0;
  let turno = Promise.resolve();

  // Reserva un hueco de inicio respetando el espaciado (serializado).
  const reservarInicio = () => {
    const p = turno.then(async () => {
      const espera = ultimoInicio + espacioS * 1000 - Date.now();
      if (espera > 0) await dormir(espera);
      ultimoInicio = Date.now();
    });
    turno = p;
    return p;
  };

  const trabajador = async () => {
    while (siguiente < casos.length) {
      const i = siguiente++;
      await reservarInicio();
      const caso = casos[i];
      process.stdout.write(`→ ${caso.id}\n`);
      const r = await preguntar(caso);
      resultados[i] = puntuar(caso, r);
      const x = resultados[i];
      process.stdout.write(`  ${x.ok ? "OK  " : "FALLO"} ${caso.id} (${x.segundos} s)${x.motivos.length ? " · " + x.motivos.join("; ") : ""}\n`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(paralelo, casos.length) }, trabajador));
  return resultados;
}

const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0);
const percentil = (xs, p) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};
const marca = (b) => (b ? "si" : "NO");
const pad = (s, n) => String(s).padEnd(n).slice(0, n);

const inicio = new Date();
let resultados;
if (repuntuar) {
  const previo = JSON.parse(readFileSync(repuntuar, "utf8"));
  const porId = new Map(previo.resultados.map((x) => [x.id, x]));
  console.log(`Repuntuando ${repuntuar} con el banco actual (sin llamadas)\n`);
  resultados = casos
    .filter((c) => porId.has(c.id))
    .map((c) => {
      const x = porId.get(c.id);
      const json = x.status === 200 ? { respuesta: x.respuesta, fuentes: x.fuentes.map((url) => ({ url })) } : null;
      return puntuar(c, { status: x.status, segundos: x.segundos, json, reintentos429: x.reintentos429 ?? 0 });
    });
} else {
  console.log(`Banco: ${casos.length} casos · ${endpoint} · paralelo ${paralelo} · ≥ ${espacioS} s entre inicios\n`);
  resultados = await ejecutar();
}

// ── Tabla ─────────────────────────────────────────────────────────────────────
console.log("\n" + [pad("id", 24), pad("tipo", 7), pad("OK", 4), pad("cont.", 6), pad("fuent.", 7), pad("prohib.", 8), pad("s", 6), "motivo"].join(" "));
console.log("-".repeat(110));
for (const r of resultados)
  console.log(
    [
      pad(r.id, 24),
      pad(r.tipo, 7),
      pad(marca(r.ok), 4),
      pad(marca(r.contenido_ok), 6),
      pad(marca(r.fuentes_ok) + (r.solo_generales ? "*" : ""), 7),
      pad(marca(r.prohibidos_ok), 8),
      pad(r.segundos + (r.lento ? "!" : ""), 6),
      r.motivos.join("; "),
    ].join(" "),
  );

const tiempos = resultados.filter((r) => r.status === 200).map((r) => r.segundos);
const resumen = {
  casos: resultados.length,
  casos_ok: resultados.filter((r) => r.ok).length,
  pct_casos_ok: pct(resultados.filter((r) => r.ok).length, resultados.length),
  pct_contenido_ok: pct(resultados.filter((r) => r.contenido_ok).length, resultados.length),
  pct_fuentes_ok: pct(resultados.filter((r) => r.fuentes_ok).length, resultados.length),
  pct_prohibidos_ok: pct(resultados.filter((r) => r.prohibidos_ok).length, resultados.length),
  dentro_ok: `${resultados.filter((r) => r.tipo === "dentro" && r.ok).length}/${resultados.filter((r) => r.tipo === "dentro").length}`,
  fuera_ok: `${resultados.filter((r) => r.tipo === "fuera" && r.ok).length}/${resultados.filter((r) => r.tipo === "fuera").length}`,
  solo_fuentes_generales: resultados.filter((r) => r.tipo === "dentro" && r.solo_generales).map((r) => r.id),
  errores_http: resultados.filter((r) => r.status !== 200).map((r) => `${r.id}:${r.status}`),
  tiempo_medio_s: tiempos.length ? Math.round((10 * tiempos.reduce((a, b) => a + b, 0)) / tiempos.length) / 10 : 0,
  tiempo_p90_s: percentil(tiempos, 90),
  tiempo_max_s: tiempos.length ? Math.max(...tiempos) : 0,
  lentos: resultados.filter((r) => r.lento).map((r) => r.id),
};

console.log("\nResumen");
console.log(`  Casos OK:      ${resumen.casos_ok}/${resumen.casos} (${resumen.pct_casos_ok} %)  · dentro ${resumen.dentro_ok} · fuera ${resumen.fuera_ok}`);
console.log(`  Contenido OK:  ${resumen.pct_contenido_ok} %   Fuentes OK: ${resumen.pct_fuentes_ok} %   Sin prohibidos: ${resumen.pct_prohibidos_ok} %`);
console.log(`  Tiempo medio:  ${resumen.tiempo_medio_s} s   p90: ${resumen.tiempo_p90_s} s   máx: ${resumen.tiempo_max_s} s   (lentos > ${LENTO_S} s: ${resumen.lentos.length})`);
if (resumen.solo_fuentes_generales.length)
  console.log(`  * Solo fuentes genéricas (JEC calendario / INE plazos): ${resumen.solo_fuentes_generales.join(", ")}`);
if (resumen.errores_http.length) console.log(`  Errores HTTP: ${resumen.errores_http.join(", ")}`);

// ── Guardar ───────────────────────────────────────────────────────────────────
const dosD = (n) => String(n).padStart(2, "0");
const sello = `${inicio.getFullYear()}${dosD(inicio.getMonth() + 1)}${dosD(inicio.getDate())}-${dosD(inicio.getHours())}${dosD(inicio.getMinutes())}${dosD(inicio.getSeconds())}`;
const salida = join(DIR, `resultados-${sello}${repuntuar ? "-repuntuado" : ""}.json`);
writeFileSync(
  salida,
  JSON.stringify({ fecha: inicio.toISOString(), endpoint, repuntuado_de: repuntuar, filtro: solo ? [...solo] : null, resumen, resultados }, null, 2) + "\n",
  "utf8",
);
console.log(`\nResultados guardados en ${salida}`);
