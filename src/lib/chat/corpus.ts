import { readFileSync } from "node:fs";
import { join } from "node:path";
import calendario from "../../../datos/calendario_29N_2026.json";

// Corpus del chat: los apartados de contexto.md y el calendario oficial.
// Solo se usa en el servidor (lee contexto.md del disco).

type Apartado = {
  titulo: string;
  texto: string;
  urls: string[];
  terminos: Map<string, number>;
};

// Fuera del chat: candidaturas y programas (neutralidad), el calendario en
// tabla (va entero desde el JSON) y las notas para quien construye la herramienta.
const EXCLUIDOS = /^(1\.2|4\.|4 |6\.[24-8]|Fuentes|BOE|Junta Electoral Central|Ministerio|INE|Correos|Estadística|Verificadores|Google)/;

// Palabras con las que pregunta la gente y que no siempre salen en el apartado.
const SINONIMOS: Record<string, string> = {
  "2.1": "presencial colegio dni documento identidad pasaporte papeleta sobre urna votar dia domingo horario hora",
  "2.2": "correo correos postal fuera ausente viaje viajo estoy solicitar solicitud certificado oficina",
  "2.3": "extranjero cera consulado embajada fuera residente pais berlin paris londres alemania francia",
  "2.4": "erasmus temporal temporalmente erta viaje trabajo extranjero estudios fuera",
  "2.5": "braille discapacidad accesible ciego ciega visual lengua signos",
  "2.6": "trabajo permiso horas laboral empresa jornada",
  "2.7": "mesa miembro presidente vocal sorteo excusa toca tocado librarme saltarme dieta multa",
  "3.1": "escanos diputados congreso circunscripcion provincia reparto",
  "3.2": "dhondt hondt reparto escanos formula barrera umbral porcentaje",
  "3.3": "blanco nulo abstencion abstenerse",
  "3.4": "senado senadores listas abiertas",
  "5": "campana encuestas debate propaganda reflexion",
  "6.1": "bulo verdad falso verificar comprobar",
  "6.3": "bulo verdad falso verificar comprobar",
};

// Apartados sin URL concreta en contexto.md: la fuente oficial que los respalda
// (ambas URL figuran en contexto.md, en «1.2 Calendario oficial» y «Fuentes»).
const INE_PLAZOS = "https://www.ine.es/dyngs/CEL/index.htm?cid=1702";
const LOREG = "https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672";
const URLS_EXTRA: Record<string, string> = {
  "2.3": INE_PLAZOS,
  "2.4": INE_PLAZOS,
  "3.1": LOREG,
  "3.2": LOREG,
  "3.3": LOREG,
  "3.4": LOREG,
};

const VACIAS = new Set(
  "a al algo como con cual de del donde el ella en es esta este hay la las lo los me mi mis no o para pero por puedo que se si sin sobre su sus te tengo tu un una y ya yo voto votar vota votacion elecciones electoral generales 2026 noviembre".split(
    " ",
  ),
);

const normalizar = (s: string) =>
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
  [...s.matchAll(/https?:\/\/[^\s<>()|\]]+/g)].map((m) =>
    m[0].replace(/[.,;:]+$/, ""),
  );

function cargar() {
  const md = readFileSync(join(process.cwd(), "contexto.md"), "utf8");
  const trozos = md.split(/^(?=#{2,3} )/m).slice(1);

  // Nombres legibles de las fuentes, sacados del apartado «Fuentes».
  const nombres = new Map<string, string>();
  let organismo = "";
  for (const linea of md.slice(md.indexOf("\n## Fuentes")).split("\n")) {
    if (linea.startsWith("### ")) organismo = linea.slice(4).trim();
    const m = linea.match(/^- ([^:]+):/);
    if (m) for (const url of urlsDe(linea)) nombres.set(url, `${organismo} · ${m[1]}`);
  }

  const apartados: Apartado[] = [];
  for (const trozo of trozos) {
    const titulo = trozo.split("\n")[0].replace(/^#+\s*/, "").trim();
    const cuerpo = trozo.slice(trozo.indexOf("\n") + 1).trim();
    if (EXCLUIDOS.test(titulo) || cuerpo.length < 200) continue;
    const numero = titulo.match(/^[\d.]+/)?.[0].replace(/\.$/, "") ?? "";
    const tf = new Map<string, number>();
    const pesos: [string, number][] = [
      [titulo, 3],
      [SINONIMOS[numero] ?? "", 3],
      [cuerpo, 1],
    ];
    for (const [texto, peso] of pesos)
      for (const t of terminos(texto)) tf.set(t, (tf.get(t) ?? 0) + peso);
    const urls = urlsDe(cuerpo);
    let texto = cuerpo;
    const extra = URLS_EXTRA[numero];
    if (extra && !urls.includes(extra)) {
      urls.unshift(extra);
      texto += `

Fuente: ${extra}`;
    }
    apartados.push({ titulo, texto, urls, terminos: tf });
  }

  const df = new Map<string, number>();
  for (const a of apartados)
    for (const t of a.terminos.keys()) df.set(t, (df.get(t) ?? 0) + 1);

  return { apartados, nombres, df };
}

let cache: ReturnType<typeof cargar> | undefined;
const corpus = () => (cache ??= cargar());

// Los apartados más parecidos a la pregunta, por términos en común ponderados
// por lo raros que son. Si nada casa, los básicos de cómo votar.
export function buscar(pregunta: string, max = 4): Apartado[] {
  const { apartados, df } = corpus();
  const consulta = [...new Set(terminos(pregunta))];
  const puntuados = apartados
    .map((a) => {
      let puntos = 0;
      for (const t of consulta) {
        const f = a.terminos.get(t);
        if (f)
          puntos +=
            Math.log(1 + f) * Math.log(1 + apartados.length / (df.get(t) ?? 1));
      }
      return { a, puntos };
    })
    .filter((p) => p.puntos > 0)
    .sort((x, y) => y.puntos - x.puntos);

  if (puntuados.length === 0 || puntuados[0].puntos < 1.5)
    return apartados.filter((a) => /^2\.[123] /.test(a.titulo));

  // Solo los que se acercan al mejor, y sin pasar de ~10.000 caracteres
  // (el primero entra siempre, aunque lo supere).
  const minimo = puntuados[0].puntos * 0.35;
  const elegidos: Apartado[] = [];
  let tamano = 0;
  for (const { a, puntos } of puntuados) {
    if (puntos < minimo || elegidos.length >= max) break;
    if (elegidos.length > 0 && tamano + a.texto.length > 10000) break;
    elegidos.push(a);
    tamano += a.texto.length;
  }
  return elegidos;
}

// El calendario oficial en una línea por fecha, con su fuente.
export function calendarioTexto(): string {
  return calendario.fechas
    .map((f) => {
      const cuando =
        "fecha" in f && f.fecha
          ? f.fecha
          : `del ${f.fecha_inicio} al ${f.fecha_fin}, ambos incluidos`;
      const nota = "nota" in f && f.nota ? ` (${f.nota})` : "";
      return `- ${cuando}: ${f.evento}${nota}. Fuente: ${f.fuente}`;
    })
    .join("\n");
}

export const urlsCalendario = () => [
  ...new Set(
    calendario.fechas.flatMap((f) => [
      f.fuente,
      ...("fuentes_adicionales" in f && Array.isArray(f.fuentes_adicionales)
        ? (f.fuentes_adicionales as string[])
        : []),
    ]),
  ),
];

const ORGANISMOS: [RegExp, string][] = [
  [/boe\.es/, "BOE"],
  [/juntaelectoralcentral\.es/, "Junta Electoral Central"],
  [/infoelectoral\.interior\.gob\.es/, "Ministerio del Interior · Infoelectoral"],
  [/ine\.(es|gob\.es)/, "INE · Oficina del Censo Electoral"],
  [/correos\.es/, "Correos"],
  [/exteriores\.gob\.es/, "Ministerio de Asuntos Exteriores"],
];

// Nombre legible de una URL oficial: el del apartado «Fuentes» o el del organismo.
export function nombreFuente(url: string): string {
  const conocido = corpus().nombres.get(url);
  if (conocido) return conocido;
  const host = new URL(url).hostname.replace(/^www\./, "");
  return ORGANISMOS.find(([re]) => re.test(host))?.[1] ?? host;
}
