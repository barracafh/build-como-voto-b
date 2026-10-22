import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Source } from "@/components/Fuentes";
import embeddingsDatos from "@/datos/embeddings.json";
import { embeber } from "@/lib/ia";
import calendario from "../../../datos/calendario_29N_2026.json";

// Corpus del chat: contexto.md troceado en fragmentos pequeños (párrafos,
// grupos de puntos de lista y cada fila de tabla), el calendario oficial y una
// ficha por cada fuente oficial del apartado «Fuentes». Cada fragmento lleva
// sus fuentes oficiales: el modelo cita fragmentos por id y el servidor pone
// los enlaces, así que no puede inventar URL.
// Solo se usa en el servidor (lee contexto.md del disco).

export type Fragmento = {
  id: string;
  apartado: string;
  texto: string;
  fuentes: Source[];
};

type Indexado = Fragmento & { terminos: Map<string, number> };

// ── URL oficiales ────────────────────────────────────────────────────────────
const U = {
  rd806: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20742",
  sumarioBoe: "https://www.boe.es/boe/dias/2026/10/06/",
  loreg: "https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672",
  ordenDieta: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-13948",
  et: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430",
  etOriginal: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2015-11430",
  rd605: "https://www.boe.es/buscar/act.php?id=BOE-A-1999-8583",
  jecAcuerdos: "https://juntaelectoral.parlamentodeandalucia.es/acuerdos-de-la-junta-electoral-central",
  jecCalendario: "https://www.juntaelectoralcentral.es/cs/jec/documentos/eg2026_calendario.pdf",
  jecEg2026: "https://www.juntaelectoralcentral.es/cs/jec/eleccionesEnCurso/Elecciones_generales_2026",
  jecInicio: "http://www.juntaelectoralcentral.es/cs/jec/inicio",
  intInicio: "https://infoelectoral.interior.gob.es/",
  intEg29n: "https://infoelectoral.interior.gob.es/es/proceso-electoral/Elecciones-Generales-29-N/",
  intMural:
    "https://infoelectoral.interior.gob.es/export/sites/default/pdf/procesos_electorales/Elecciones-Generales-29-N/Calendario-mural-elecciones-Cortes-Generales-2026.pdf",
  intAccesibilidad: "https://infoelectoral.interior.gob.es/es/proceso-electoral/accesibilidad-y-procesos-electorales/",
  intDietas:
    "https://infoelectoral.interior.gob.es/es/proceso-electoral/miembros-de-mesa/informacion-general/permisos-y-dietas/",
  intSustitucion:
    "https://infoelectoral.interior.gob.es/es/proceso-electoral/miembros-de-mesa/informacion-general/sustitucion-y-recurso-contra-la-designacion/",
  intSufragio: "https://infoelectoral.interior.gob.es/es/proceso-electoral/preguntas-frecuentes/el-derecho-de-sufragio/",
  intDesarrollo:
    "https://infoelectoral.interior.gob.es/es/proceso-electoral/preguntas-frecuentes/desarrollo-de-la-votacion/",
  ineEg2026: "https://www.ine.es/dyngs/CEL/en/index.htm?cid=1699",
  ineGuia: "https://www.ine.es/dyngs/CEL/index.htm?cid=1700",
  inePlazos: "https://www.ine.es/dyngs/CEL/index.htm?cid=1702",
  inePrensa: "https://www.ine.es/dyngs/Prensa/es/EG2026.htm",
  correos: "https://www.correos.es/es/es/particulares/para-el-ciudadano/voto-por-correo",
};

// Solo dominios oficiales (más Maldita.es, solo en los bulos del 6.3).
const DOMINIOS = /(^|\.)(boe\.es|juntaelectoralcentral\.es|interior\.gob\.es|ine\.es|ine\.gob\.es|correos\.es|exteriores\.gob\.es|parlamentodeandalucia\.es)$/;
const NO_CITABLES = /formaciones-politicas|DataLab|wstempus|resultados-electorales/;

function citable(url: string, apartado: string): boolean {
  if (NO_CITABLES.test(url)) return false;
  try {
    const host = new URL(url).hostname;
    if (DOMINIOS.test(host)) return true;
    return apartado === "6.3" && /(^|\.)maldita\.es$/.test(host);
  } catch {
    return false;
  }
}

// Nombres legibles que no salen bien del apartado «Fuentes».
const NOMBRES_EXTRA: Record<string, string> = {
  [U.et]: "BOE · Estatuto de los Trabajadores (texto consolidado)",
  [U.etOriginal]: "BOE · Estatuto de los Trabajadores (texto original)",
  [U.intSufragio]: "Ministerio del Interior · Preguntas frecuentes: el derecho de sufragio",
  [U.intDesarrollo]: "Ministerio del Interior · Preguntas frecuentes: desarrollo de la votación",
  [U.intDietas]: "Ministerio del Interior · Miembros de mesa: permisos y dietas",
  [U.intSustitucion]: "Ministerio del Interior · Miembros de mesa: sustitución y recurso",
  [U.jecAcuerdos]: "Junta Electoral Central · Acuerdos (relación de la Junta Electoral de Andalucía)",
  [U.rd605]: "BOE · Real Decreto 605/1999, de regulación complementaria de los procesos electorales",
  "https://sede.ine.gob.es/ce-mesas/?lang=es_ES": "INE · Consulta de mesa y local electoral",
  "https://sede.ine.gob.es/ce-votoxcorreo/?lang=es_ES": "INE · Estado de tu voto por correo",
  "https://sede.ine.gob.es/censoElectoralTramitesVxCWeb?cierre=0000517": "INE · Solicitud de voto por correo (sede)",
  "https://www.ine.es/descarga_candidaturas_elecciones": "INE · Descarga de papeletas (residentes en el extranjero)",
  "https://maldita.es/desinfo/20261006/para-asegurar-el-voto-por-correo-hay-que-ir-a-votar-a-la-mesa-electoral-tambien/":
    "Maldita.es · Verificación: voto por correo y voto en la mesa",
};

// De qué trata cada fuente oficial: su ficha recuperable y citable.
const TEMAS: Record<string, string> = {
  [U.rd806]: "convocatoria de las elecciones generales del 29 de noviembre de 2026, disolución de las Cortes, campaña y escaños",
  [U.sumarioBoe]: "BOE del 6 de octubre de 2026 en el que se publicó la convocatoria de elecciones",
  [U.loreg]: "Ley Orgánica del Régimen Electoral General: derecho de voto, voto por correo, mesas, campaña, sistema electoral",
  [U.ordenDieta]: "dieta de los miembros de mesa: 75 euros por titular y jornada electoral; cuánto se cobra por estar en la mesa",
  [U.et]: "permiso retribuido para votar en horario de trabajo; horas libres para votar que la empresa debe dar",
  [U.etOriginal]: "permiso retribuido de los trabajadores para cumplir deberes públicos como votar",
  [U.jecAcuerdos]: "acuerdos de la Junta Electoral Central, como la suspensión de miDGT y miDNI como identificación para votar",
  [U.jecCalendario]: "calendario electoral oficial con todas las fechas y plazos de las elecciones del 29N",
  [U.jecEg2026]: "página de la Junta Electoral Central sobre las elecciones generales 2026: acuerdos, instrucciones y calendario",
  [U.jecInicio]: "Junta Electoral Central, órgano que supervisa las elecciones",
  [U.intInicio]: "información electoral oficial del Ministerio del Interior",
  [U.intEg29n]: "página oficial del Ministerio del Interior sobre las elecciones generales del 29N y su calendario",
  [U.intMural]: "calendario mural de las elecciones a Cortes Generales 2026 con las fechas clave",
  [U.intAccesibilidad]: "voto accesible para personas con discapacidad, voto en Braille, locales accesibles",
  [U.intDietas]: "miembros de mesa: permiso laboral el día de la votación, reducción de jornada al día siguiente y dieta",
  [U.intSustitucion]: "miembros de mesa: excusas, alegaciones, sustitución y recurso contra la designación",
  [U.intSufragio]: "quién puede votar, derecho de sufragio, si votar es obligatorio",
  [U.intDesarrollo]: "cómo se vota el día de las elecciones, documentos de identidad válidos, justificante de voto",
  [U.ineEg2026]: "elecciones generales del 29/11/2026 en la Oficina del Censo Electoral: periodo electoral",
  [U.ineGuia]: "guía de la Oficina del Censo Electoral: voto por correo, tarjeta censal, teléfono de información",
  [U.inePlazos]: "plazos para electores: voto por correo, residentes en el extranjero (CERA) y temporalmente fuera (ERTA)",
  [U.inePrensa]: "censo electoral de las elecciones de 2026: número de electores y quienes votan por primera vez",
  [U.correos]: "solicitar y enviar el voto por correo en Correos, en oficina o por internet",
};

// Referencias normativas y menciones → URL. Se buscan en el texto del fragmento.
// `en`: solo en esos apartados.
const REFERENCIAS: { re: RegExp; urls: string[]; en?: RegExp }[] = [
  { re: /Orden INT\/650\/2026|BOE-A-2026-13948/, urls: [U.ordenDieta, U.intDietas] },
  { re: /\bdietas?\b/i, urls: [U.ordenDieta, U.intDietas] },
  { re: /Estatuto de los Trabajadores|\bET\b|BOE-A-2015-11430/, urls: [U.et, U.etOriginal] },
  { re: /permiso[^.]*mesa|mesa[^.]*permiso|Permiso laboral/i, urls: [U.intDietas], en: /^2\.[67]$/ },
  { re: /Real Decreto 806\/2026|RD 806\/2026|BOE-A-2026-20742|\bRD art\.|\bRD de convocatoria/, urls: [U.rd806] },
  { re: /Real Decreto 605\/1999|RD 605\/1999|BOE-A-1999-8583/, urls: [U.rd605] },
  { re: /Acuerdo 94\/2026|Acuerdo 56\/2025|miDGT|miDNI/, urls: [U.jecAcuerdos] },
  { re: /\bdesarrollo de la votaci[oó]n\b|fotocopia/i, urls: [U.intDesarrollo], en: /^(2\.1|6\.3)$/ },
  { re: /obligatorio votar|Votar no es obligatorio|No es obligatorio votar|derecho de sufragio|Derecho de sufragio/i, urls: [U.intSufragio] },
  { re: /Interior/, urls: [U.intDesarrollo], en: /^2\.1$/ },
  { re: /Interior/, urls: [U.intAccesibilidad], en: /^2\.5$/ },
  { re: /Interior|[Ee]xcusa|sustitu/, urls: [U.intSustitucion], en: /^2\.7$/ },
  { re: /Interior/, urls: [U.intSufragio], en: /^3\.3$/ },
  { re: /\bJEC\b|calendario/, urls: [U.jecCalendario], en: /^1\.2$/ },
  { re: /calendario/i, urls: [U.jecCalendario], en: /^(2\.[2-4]|6\.3)$/ },
  { re: /\bINE\b/, urls: [U.ineGuia], en: /^2\.2$/ },
  { re: /\bINE\b/, urls: [U.inePlazos], en: /^(1\.2|2\.[34])$/ },
  { re: /\bINE\b.*guía de funciones/, urls: [U.ineGuia] },
  { re: /\bBOE\b/, urls: [U.rd806], en: /^1\.2$/ },
  { re: /Correos/, urls: [U.correos] },
  { re: /\bcenso\b.*electores|38\.728\.356|primera vez/, urls: [U.inePrensa], en: /^1\.1$/ },
];

// Si el fragmento no trae nada más concreto, la fuente de su apartado.
const POR_DEFECTO: Record<string, string[]> = {
  "1.1": [U.rd806, U.sumarioBoe],
  "1.2": [U.jecCalendario, U.inePlazos],
  "1.3": [U.rd806, U.loreg],
  "2.1": [U.intDesarrollo],
  "2.2": [U.ineGuia, U.correos],
  "2.3": [U.inePlazos],
  "2.4": [U.inePlazos],
  "2.5": [U.intAccesibilidad],
  "2.6": [U.et],
  "2.7": [U.intSustitucion, U.intDietas],
  "3.1": [U.loreg],
  "3.2": [U.loreg],
  "3.3": [U.loreg],
  "3.4": [U.loreg],
  "5": [U.loreg],
  "6.1": [U.loreg],
  "6.3": [U.loreg],
};
// Fuentes de apoyo del calendario: van detrás de las concretas.
const APOYO_CALENDARIO = [U.intMural, U.jecEg2026, U.intEg29n];

// ── Artículos de la LOREG con ancla en el BOE consolidado (#asetentaytres…) ──
const UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const DIEZ_29 = [
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidos", "veintitres", "veinticuatro", "veinticinco", "veintiseis", "veintisiete",
  "veintiocho", "veintinueve",
];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
function enLetras(n: number): string {
  if (n >= 200) return "doscientos" + enLetras(n - 200);
  if (n === 100) return "cien";
  if (n > 100) return "ciento" + enLetras(n - 100);
  if (n < 10) return UNIDADES[n];
  if (n < 30) return DIEZ_29[n - 10];
  const d = Math.floor(n / 10);
  return DECENAS[d] + (n % 10 ? "y" + UNIDADES[n % 10] : "");
}
// «art. 73», «arts. 162-164»… pero no los del Estatuto, de un RD o de la CE.
const ART = /(RD )?\b[Aa]rts?\.\s*(\d{1,3})(?![\d.]*[a-z]?\s*(?:del? (?:Estatuto|Real Decreto|RD)|CE\b))/g;
const articuloLoreg = (n: number) => `${U.loreg}#a${enLetras(n)}`;

// ── Texto y términos ─────────────────────────────────────────────────────────
// Palabras con las que pregunta la gente y que no siempre salen en el apartado.
const SINONIMOS: Record<string, string> = {
  "1.2": "fecha fechas plazo plazos cuando calendario dia",
  "2.1": "presencial colegio dni documento identidad pasaporte papeleta sobre urna votar dia domingo horario hora censo consultar estoy inscrito donde",
  "2.2": "correo correos postal fuera ausente viaje viajo estoy solicitar solicitud certificado oficina",
  "2.3": "extranjero cera consulado embajada fuera residente pais berlin paris londres alemania francia vivo",
  "2.4": "erasmus temporal temporalmente erta viaje trabajo extranjero estudios fuera",
  "2.5": "braille discapacidad accesible ciego ciega visual lengua signos",
  "2.6": "trabajo permiso horas laboral empresa jornada jefe",
  "2.7": "mesa miembro presidente vocal sorteo excusa toca tocado librarme saltarme dieta multa cobra cobro pagan",
  "3.1": "escanos diputados congreso circunscripcion provincia reparto",
  "3.2": "dhondt hondt reparto escanos formula barrera umbral porcentaje",
  "3.3": "blanco nulo abstencion abstenerse",
  "3.4": "senado senadores listas abiertas",
  "5": "campana encuestas debate propaganda reflexion",
  "6.1": "bulo verdad falso verificar comprobar",
  "6.3": "bulo verdad falso verificar comprobar",
};

const VACIAS = new Set(
  "a al algo como con cual de del donde el ella en es esta este hay la las lo los me mi mis no o para pero por puedo que se si sin sobre su sus te tengo tu un una y ya yo voto votar vota votacion elecciones electoral generales 2026 noviembre".split(
    " ",
  ),
);

export const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ");

// Raíz tosca: los primeros 5 caracteres bastan para casar correo/correos.
const terminos = (s: string) =>
  normalizar(s)
    .split(/\s+/)
    .filter((t) => t.length > 2 && !VACIAS.has(t))
    .map((t) => t.slice(0, 5));

const urlsDe = (s: string) =>
  [...s.matchAll(/https?:\/\/[^\s<>()|\]`]+/g)].map((m) => m[0].replace(/[.,;:]+$/, ""));

// Texto para el modelo: sin URL (los enlaces los pone el servidor), sin markdown.
const limpiar = (s: string) =>
  s
    .replace(/<https?:\/\/[^>]+>/g, "[enlace oficial]")
    .replace(/https?:\/\/[^\s)|]+/g, "[enlace oficial]")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Hash del texto (FNV-1a de 32 bits): detecta embeddings desfasados.
export function hashTexto(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ── Troceado de contexto.md ─────────────────────────────────────────────────
// Fuera del chat: candidaturas y programas (neutralidad), la introducción del
// verificador y las notas para quien construye la herramienta (6, 6.2, 6.4-6.8).
const EXCLUIDOS = /^(4|4\.\d+|6|6\.[24-8])$/;

type Crudo = { apartado: string; numero: string; raw: string; texto: string };

const celdas = (linea: string) =>
  linea
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

function trocear(titulo: string, numero: string, cuerpo: string): Crudo[] {
  const fuera: Crudo[] = [];
  const nuevo = (raw: string) =>
    fuera.push({ apartado: titulo, numero, raw, texto: `${titulo} — ${limpiar(raw)}` });

  const bloques = cuerpo
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+$/, ""))
    .filter((b) => b.trim() && b.trim() !== "---");

  let anterior = "";
  for (const bloque of bloques) {
    const lineas = bloque.split("\n").filter((l) => l.trim());
    // Entradillas sueltas («Reglas:», «Notas:») no aportan nada solas.
    if (lineas.length === 1 && lineas[0].trim().endsWith(":") && lineas[0].length < 80) {
      anterior = bloque;
      continue;
    }
    if (lineas.every((l) => l.trim().startsWith("|"))) {
      // Tabla: cada fila es un fragmento, con la cabecera como etiquetas.
      const ultima = anterior.split("\n").pop()?.trim() ?? "";
      const entrada =
        ultima.endsWith(":") && ultima.length < 250 ? ultima.replace(/^(-|\d+\.)\s*/, "") + " " : "";
      const cabecera = celdas(lineas[0]);
      for (const fila of lineas.slice(2)) {
        const valores = celdas(fila);
        const partes = valores
          .map((v, i) => (v ? (cabecera[i] ? `${cabecera[i]}: ${v}` : v) : ""))
          .filter(Boolean);
        if (partes.length) nuevo(entrada + partes.join("; "));
      }
    } else {
      // Párrafos y listas: cada punto de primer nivel (con sus subpuntos),
      // agrupando los cortos hasta ~450 caracteres.
      const items: string[] = [];
      for (const l of lineas) {
        if (/^(\d+\.|-)\s/.test(l) || items.length === 0) items.push(l.trim());
        else items[items.length - 1] += "\n" + l.trim();
      }
      let grupo = "";
      for (const item of items) {
        // Entradillas sueltas («Reglas:», «Notas:») no aportan nada solas.
        if (items.length > 1 && item.length < 40 && item.endsWith(":")) continue;
        if (grupo && grupo.length + item.length > 450) {
          nuevo(grupo);
          grupo = "";
        }
        grupo = grupo ? `${grupo}\n${item}` : item;
      }
      if (grupo) nuevo(grupo);
    }
    anterior = bloque;
  }
  return fuera;
}

function fuentesDe(c: Crudo, nombre: (u: string) => string, urlsApartado: string[]): Source[] {
  const propias = urlsDe(c.raw);
  const especificas = REFERENCIAS.filter(
    (r) => (!r.en || r.en.test(c.numero)) && r.re.test(c.raw),
  ).flatMap((r) => r.urls);
  const arts = [...c.raw.matchAll(ART)]
    .filter((m) => !m[1])
    .map((m) => Number(m[2]))
    .filter((n) => n > 0 && n < 300);
  const usaLoreg =
    arts.length > 0 || /LOREG/.test(c.raw) || /^(3\.|5$|6\.)/.test(c.numero);
  const concretas = [...propias, ...especificas].filter((u) => citable(u, c.numero));
  const respaldo = concretas.length
    ? []
    : (POR_DEFECTO[c.numero] ?? urlsApartado.filter((u) => citable(u, c.numero)));
  const urls = [
    ...concretas,
    ...respaldo,
    ...(arts.length ? [articuloLoreg(arts[0])] : []),
    ...(usaLoreg && !arts.length ? [U.loreg] : []),
    ...(c.numero === "1.2" ? APOYO_CALENDARIO : []),
  ];
  return [...new Set(urls)].slice(0, 5).map((url) => ({ url, nombre: nombre(url) }));
}

function cargar() {
  const md = readFileSync(join(process.cwd(), "contexto.md"), "utf8");
  const inicioFuentes = md.indexOf("\n## Fuentes");
  const cuerpoMd = md.slice(0, inicioFuentes);
  const fuentesMd = md.slice(inicioFuentes);

  // Nombres legibles de las fuentes, sacados del apartado «Fuentes».
  const nombres = new Map<string, string>(Object.entries(NOMBRES_EXTRA));
  const listaFuentes: { organismo: string; titulo: string; url: string }[] = [];
  let organismo = "";
  for (const linea of fuentesMd.split("\n")) {
    if (linea.startsWith("### ")) organismo = linea.slice(4).trim();
    const m = linea.match(/^- ([^:]+):/);
    if (!m) continue;
    for (const url of urlsDe(linea)) {
      const org = organismo.replace(/ \(Infoelectoral\)$/, "");
      if (!nombres.has(url)) nombres.set(url, `${org} · ${m[1].trim()}`);
      listaFuentes.push({ organismo: org, titulo: m[1].trim(), url });
    }
  }
  const nombre = (url: string) => nombres.get(url) ?? nombreOrganismo(url);
  const nombreArticulo = (url: string) => {
    const base = url.split("#")[0];
    if (base !== U.loreg || !url.includes("#")) return nombre(url);
    const m = fragmentoArticulo.get(url);
    return m ? `BOE · LOREG, art. ${m}` : nombre(base);
  };
  const fragmentoArticulo = new Map<string, number>();
  for (let n = 1; n < 300; n++) fragmentoArticulo.set(articuloLoreg(n), n);

  const fragmentos: Indexado[] = [];
  const indexar = (f: Fragmento, numero: string) => {
    const tf = new Map<string, number>();
    const pesos: [string, number][] = [
      [f.apartado, 2],
      [SINONIMOS[numero] ?? "", 1],
      [f.texto, 1],
    ];
    for (const [texto, peso] of pesos)
      for (const t of terminos(texto)) tf.set(t, (tf.get(t) ?? 0) + peso);
    fragmentos.push({ ...f, terminos: tf });
  };

  for (const seccion of cuerpoMd.split(/^(?=#{2,3} )/m).slice(1)) {
    const titulo = seccion.split("\n")[0].replace(/^#+\s*/, "").trim();
    const numero = titulo.match(/^(\d+(?:\.\d+)?)/)?.[1] ?? "";
    if (!numero || EXCLUIDOS.test(numero)) continue;
    let cuerpo = seccion.slice(seccion.indexOf("\n") + 1);
    // En el 5, las implicaciones «para el hack» son notas para constructores.
    const corte = cuerpo.indexOf("Implicaciones para el hack");
    if (corte >= 0) cuerpo = cuerpo.slice(0, corte);
    const urlsApartado = urlsDe(cuerpo);
    trocear(titulo, numero, cuerpo).forEach((c, i) =>
      indexar(
        {
          id: `${numero}#${i + 1}`,
          apartado: c.apartado,
          texto: c.texto,
          fuentes: fuentesDe(c, nombreArticulo, urlsApartado),
        },
        numero,
      ),
    );
  }

  // Una ficha por fuente oficial, para que se pueda recuperar y citar.
  let n = 0;
  for (const f of listaFuentes) {
    if (!citable(f.url, "") || !TEMAS[f.url]) continue;
    n++;
    indexar(
      {
        id: `F#${n}`,
        apartado: "Fuentes oficiales",
        texto: `Fuente oficial: ${nombre(f.url)}. Trata de: ${TEMAS[f.url]}.`,
        fuentes: [{ url: f.url, nombre: nombre(f.url) }],
      },
      "F",
    );
  }

  // El calendario oficial, una entrada por fecha. Va siempre entero.
  const fechas: Fragmento[] = calendario.fechas.map((f) => {
    const cuando =
      "fecha" in f && f.fecha
        ? f.fecha
        : `del ${f.fecha_inicio} al ${f.fecha_fin}, ambos incluidos`;
    const nota = "nota" in f && f.nota ? ` (${f.nota})` : "";
    const adicionales =
      "fuentes_adicionales" in f && Array.isArray(f.fuentes_adicionales)
        ? (f.fuentes_adicionales as string[])
        : [];
    const urls = [...new Set([f.fuente, ...adicionales, ...APOYO_CALENDARIO])].filter((u) =>
      citable(u, "cal"),
    );
    return {
      id: `cal#${f.id}`,
      apartado: "Calendario oficial",
      texto: `${cuando}: ${f.evento}${nota}.`,
      fuentes: urls.map((url) => ({ url, nombre: nombreArticulo(url) })),
    };
  });

  const df = new Map<string, number>();
  for (const f of fragmentos)
    for (const t of f.terminos.keys()) df.set(t, (df.get(t) ?? 0) + 1);

  return { fragmentos, fechas, df, nombre: nombreArticulo };
}

let cache: ReturnType<typeof cargar> | undefined;
const corpus = () => (cache ??= cargar());

// Todos los fragmentos recuperables (sin el calendario, que va siempre).
export const fragmentos = (): Fragmento[] =>
  corpus().fragmentos.map(({ terminos: _t, ...f }) => f);

// Las fechas del calendario oficial como fragmentos citables.
export const fragmentosCalendario = (): Fragmento[] => corpus().fechas;

// Texto que se embebe de cada fragmento (el script y el servidor deben coincidir).
export const textoEmbebible = (f: Fragmento) => f.texto;

// ── Recuperación híbrida ─────────────────────────────────────────────────────
type Embeddings = {
  modelo: string;
  dims: number;
  vectores: Record<string, { h: string; v: number[] }>;
};
const EMB = embeddingsDatos as unknown as Embeddings;

const INSTRUCCION_CONSULTA =
  "Instruct: Given a citizen's question about how to vote in the Spanish general election, retrieve the passages that answer it\nQuery: ";

export const recorteVector = (v: number[], dims: number) => {
  const c = v.slice(0, dims);
  const norma = Math.sqrt(c.reduce((s, x) => s + x * x, 0)) || 1;
  return c.map((x) => x / norma);
};

function lexico(pregunta: string): Indexado[] {
  const { fragmentos, df } = corpus();
  const consulta = [...new Set(terminos(pregunta))];
  return fragmentos
    .map((f) => {
      let puntos = 0;
      for (const t of consulta) {
        const tf = f.terminos.get(t);
        if (tf) puntos += Math.log(1 + tf) * Math.log(1 + fragmentos.length / (df.get(t) ?? 1));
      }
      return { f, puntos };
    })
    .filter((p) => p.puntos > 0)
    .sort((x, y) => y.puntos - x.puntos)
    .map((p) => p.f);
}

async function semantico(pregunta: string): Promise<Indexado[]> {
  if (!EMB.dims) return [];
  const { fragmentos } = corpus();
  const conVector = fragmentos.filter((f) => EMB.vectores[f.id]?.h === hashTexto(textoEmbebible(f)));
  if (conVector.length === 0) return [];
  const [bruto] = await embeber([INSTRUCCION_CONSULTA + pregunta.slice(0, 1500)], { timeoutMs: 5000 });
  const q = recorteVector(bruto, EMB.dims);
  return conVector
    .map((f) => {
      const v = EMB.vectores[f.id].v;
      let s = 0;
      for (let i = 0; i < q.length; i++) s += q[i] * (v[i] ?? 0);
      return { f, s };
    })
    .sort((a, b) => b.s - a.s)
    .map((p) => p.f);
}

const SIN_INDICE = ({ terminos: _t, ...f }: Indexado): Fragmento => f;

// Los fragmentos más útiles para la pregunta: fusión (Reciprocal Rank Fusion)
// de palabras clave y embeddings. Si los embeddings fallan, solo palabras clave.
export async function recuperar(
  pregunta: string,
  { max = 8, caracteres = 6000 }: { max?: number; caracteres?: number } = {},
): Promise<Fragmento[]> {
  const lex = lexico(pregunta).slice(0, 30);
  let sem: Indexado[] = [];
  try {
    sem = (await semantico(pregunta)).slice(0, 30);
  } catch (e) {
    console.error("chat: embeddings no disponibles:", e instanceof Error ? e.message : "error");
  }

  const K = 60;
  const puntos = new Map<string, { f: Indexado; s: number }>();
  for (const lista of [lex, sem])
    lista.forEach((f, i) => {
      const p = puntos.get(f.id) ?? { f, s: 0 };
      p.s += 1 / (K + i + 1);
      puntos.set(f.id, p);
    });
  let orden = [...puntos.values()].sort((a, b) => b.s - a.s).map((p) => p.f);

  // Nada casa: los básicos de cómo votar.
  if (orden.length === 0)
    orden = corpus().fragmentos.filter((f) => /^2\.[12]#/.test(f.id));

  const elegidos: Fragmento[] = [];
  let tamano = 0;
  for (const f of orden) {
    if (elegidos.length >= max) break;
    if (elegidos.length > 0 && tamano + f.texto.length > caracteres) continue;
    elegidos.push(SIN_INDICE(f));
    tamano += f.texto.length;
  }
  return elegidos;
}

const ORGANISMOS: [RegExp, string][] = [
  [/boe\.es/, "BOE"],
  [/juntaelectoralcentral\.es/, "Junta Electoral Central"],
  [/interior\.gob\.es/, "Ministerio del Interior"],
  [/ine\.(es|gob\.es)/, "INE · Oficina del Censo Electoral"],
  [/correos\.es/, "Correos"],
  [/exteriores\.gob\.es/, "Ministerio de Asuntos Exteriores"],
];

function nombreOrganismo(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return ORGANISMOS.find(([re]) => re.test(host))?.[1] ?? host;
}

// Nombre legible de una URL oficial: el del apartado «Fuentes» o el del organismo.
export const nombreFuente = (url: string): string => corpus().nombre(url);
