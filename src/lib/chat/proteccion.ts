import { createHash, randomBytes } from "node:crypto";
import type { MensajeChat, RespuestaChat } from "@/app/api/chat/route";
import type { Source } from "@/components/Fuentes";

// Anti-abuso del chat: que nadie use /api/chat como LLM gratis.
// Todo es barato y se decide ANTES de llamar al modelo.
// Regla 3 de la plataforma: aquí nunca se guarda ni se registra el texto del
// ciudadano. Lo único que se guarda en memoria es un hash de la IP con sal
// aleatoria por proceso y las marcas de tiempo de sus peticiones.

// Tope de tokens de salida del chat. glm5.3-flash razona antes de responder
// (reasoning_content cuenta como salida): medido el 22/10 con preguntas
// largas reales, ~2.200-2.500 de razonamiento + ~300 de respuesta (≈2.800).
// 6.000 deja margen para preguntas difíciles y corta salidas desbocadas.
export const MAX_TOKENS_CHAT = 6000;

const LIMITES = {
  // Holgado: en el evento muchos salen por la misma IP del wifi.
  porMinutoIp: 15,
  porHoraIp: 120,
  porMinutoGlobal: 120,
  // El cliente manda todo el historial; solo se usan los 6 últimos mensajes.
  mensajes: 6,
  // Sin límite de longitud en las preguntas (decisión del equipo): el gasto
  // lo acotan la tasa por IP, el tamaño del cuerpo y maxTokens.
  caracteresAsistente: 500,
  // El cliente manda solo los 6 últimos mensajes (~1 KB por respuesta).
  // Cerca del máximo que acepta una función de Vercel (4,5 MB).
  bytesCuerpo: 4 * 1024 * 1024,
};

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

const error = (mensaje: string, status: number, cabeceras?: HeadersInit) =>
  Response.json({ error: mensaje }, { status, headers: cabeceras });

// ── 1. Origen ────────────────────────────────────────────────────────────────
// Un navegador en la propia web manda sec-fetch-site: same-origin y Origin.
// No es seguridad fuerte (curl puede falsearlas), pero corta el uso trivial.
const HOSTS_PERMITIDOS = [/^build\.barraca\.house$/, /\.vercel\.app$/, /^localhost$/, /^127\.0\.0\.1$/];

function origenValido(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  const origin = req.headers.get("origin");
  if (site && site !== "same-origin") return false;
  if (origin) {
    let host: string;
    try {
      host = new URL(origin).hostname;
    } catch {
      return false;
    }
    if (!HOSTS_PERMITIDOS.some((h) => h.test(host))) return false;
  }
  // Sin ninguna de las dos cabeceras no es un navegador: solo en desarrollo.
  if (!site && !origin) return process.env.NODE_ENV !== "production";
  return true;
}

// ── 2. Límite de tasa ────────────────────────────────────────────────────────
// En memoria y POR INSTANCIA: en Vercel (serverless) cada instancia lleva su
// propia cuenta y se reinicia al enfriarse, así que es un freno, no un límite
// exacto. Para uno global haría falta un almacén compartido (KV/Redis).
const SAL = randomBytes(16).toString("hex");
const porIp = new Map<string, number[]>();
let globales: number[] = [];
let ultimaLimpieza = 0;

const hashIp = (ip: string) => createHash("sha256").update(SAL + ip).digest("hex").slice(0, 32);

function ipDe(req: Request): string {
  const real = req.headers.get("x-real-ip");
  const reenviada = req.headers.get("x-forwarded-for")?.split(",")[0];
  return (real || reenviada || "desconocida").trim();
}

function limpiar(ahora: number) {
  if (ahora - ultimaLimpieza < MINUTO) return;
  ultimaLimpieza = ahora;
  for (const [clave, marcas] of porIp) {
    const vivas = marcas.filter((t) => ahora - t < HORA);
    if (vivas.length) porIp.set(clave, vivas);
    else porIp.delete(clave);
  }
}

// Devuelve los segundos que hay que esperar, o 0 si puede pasar (y la cuenta).
function esperaPorTasa(req: Request): number {
  const ahora = Date.now();
  limpiar(ahora);
  globales = globales.filter((t) => ahora - t < MINUTO);
  const clave = hashIp(ipDe(req));
  const marcas = (porIp.get(clave) ?? []).filter((t) => ahora - t < HORA);
  const ultimoMinuto = marcas.filter((t) => ahora - t < MINUTO);

  let espera = 0;
  if (globales.length >= LIMITES.porMinutoGlobal) espera = (globales[0] + MINUTO - ahora) / 1000;
  else if (ultimoMinuto.length >= LIMITES.porMinutoIp) espera = (ultimoMinuto[0] + MINUTO - ahora) / 1000;
  else if (marcas.length >= LIMITES.porHoraIp) espera = (marcas[0] + HORA - ahora) / 1000;
  if (espera > 0) {
    porIp.set(clave, marcas);
    return Math.max(1, Math.ceil(espera));
  }
  marcas.push(ahora);
  globales.push(ahora);
  porIp.set(clave, marcas);
  return 0;
}

// ── 4. Filtro previo ─────────────────────────────────────────────────────────
// Rechaza lo que claramente no es una duda sobre cómo votar, sin gastar tokens.
// Se compara sin tildes y en minúsculas. Ojo con los falsos positivos: solo
// patrones de jailbreak o de encargo de tareas, nunca palabras sueltas.
const normalizar = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const VERBOS_ENCARGO =
  "(?:escribe|escribeme|escribir|redacta|redactame|redactar|genera|generame|generar|haz|hazme|creame|programame|inventa|inventate|compon|componme|write|generate)";
const ENCARGOS =
  "(?:codigo|script|funcion|algoritmo|html|sql|python|javascript|poema|poesia|cancion|rap|versos?|ensayo|redaccion|cuento|relato|novela|chiste|articulo|tweet|tuit|receta|tfg|tfm|code|poem|essay|story|song|joke)";
// Inicio de frase: «Actúa como…» es una orden; «¿Quién actúa como presidente?», no.
const INICIO = String.raw`(?:^|[.!?¡¿,;:\n]\s*)`;

const PATRONES_FUERA: RegExp[] = [
  // Jailbreak / manipulación de instrucciones
  /\b(?:ignora|ignore|ignorar|olvida|olvidate|forget|omite|disregard)\s+(?:\S+\s+){0,4}(?:instrucci|regla|indicaci|prompt|restricci|instruction|rule|previous|above)/,
  /\b(?:system\s*prompt|prompt\s+del?\s+sistema|instrucciones\s+(?:del\s+sistema|iniciales|originales|ocultas))/,
  new RegExp(String.raw`${INICIO}(?:actua|comportate|responde)\s+como\b`),
  /\b(?:act|behave)\s+as\b/,
  /\b(?:finge|fingir|pretend|imagina\s+que\s+eres|haz\s+como\s+si|a\s+partir\s+de\s+ahora\s+(?:eres|seras|vas)|you\s+are\s+now|from\s+now\s+on|roleplay|juego\s+de\s+rol)\b/,
  /\b(?:jailbreak|dan\s+mode|modo\s+dan|developer\s+mode|modo\s+desarrollador|unfiltered)\b/,
  // Encargos ajenos: «escríbeme un script en Python», «hazme un poema»…
  new RegExp(String.raw`\b${VERBOS_ENCARGO}\s+(?:\S+\s+){0,3}${ENCARGOS}\b`),
  new RegExp(String.raw`\b(?:traduceme|traducelo|traducemelo|translate)\b|${INICIO}traduce\b`),
  // Código pegado
  /\b(?:def|function|const|let|var|import|console\.log|print|return|select|#include|public\s+static)\b[^\n]*[({;=]/,
  /<\/?(?:script|html|div|body|\?php)\b/,
];

export function fueraDeAlcance(texto: string): boolean {
  if (texto.includes("```")) return true;
  // Muchos símbolos de programación seguidos: casi seguro, código.
  if ((texto.match(/[{};<>=$\\]/g) ?? []).length >= 8) return true;
  const t = normalizar(texto);
  return PATRONES_FUERA.some((p) => p.test(t));
}

const FUERA_DE_ALCANCE =
  "Solo puedo ayudarte con dudas sobre cómo votar en las elecciones generales del 29 de noviembre: voto presencial, por correo, desde el extranjero, mesas electorales o plazos. Prueba a preguntarlo de otra forma.";

// ── Punto de entrada ─────────────────────────────────────────────────────────
// Devuelve el historial limpio (máx. 6 mensajes, recortados) o una Response
// lista para devolver. `fuentesGenerales` acompaña a la respuesta de fuera de
// alcance para que el ciudadano siempre tenga dónde ir.
export async function protegerChat(
  req: Request,
  fuentesGenerales: Source[],
): Promise<MensajeChat[] | Response> {
  if (!origenValido(req)) return error("Petición no permitida.", 403);

  // Se cuenta antes de validar: también frena a quien martillea con basura.
  const espera = esperaPorTasa(req);
  if (espera)
    return error(
      "Estás enviando muchas preguntas seguidas. Espera un momento y vuelve a intentarlo.",
      429,
      { "retry-after": String(espera) },
    );

  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return error("Formato no válido.", 415);
  if (Number(req.headers.get("content-length")) > LIMITES.bytesCuerpo)
    return error("La conversación es demasiado larga. Empieza una nueva conversación.", 413);
  const cuerpo = await req.text().catch(() => "");
  if (Buffer.byteLength(cuerpo) > LIMITES.bytesCuerpo)
    return error("La conversación es demasiado larga. Empieza una nueva conversación.", 413);

  let mensajes: unknown;
  try {
    mensajes = (JSON.parse(cuerpo) as { mensajes?: unknown })?.mensajes;
  } catch {
    mensajes = undefined;
  }
  const validos = Array.isArray(mensajes)
    ? mensajes.filter(
        (m): m is MensajeChat =>
          (m?.rol === "usuario" || m?.rol === "asistente") && typeof m.texto === "string",
      )
    : [];
  const ultimo = validos.at(-1);
  if (!ultimo || ultimo.rol !== "usuario" || !ultimo.texto.trim())
    return error("Escribe una pregunta.", 400);

  if (fueraDeAlcance(ultimo.texto))
    return Response.json({
      activo: true,
      respuesta: FUERA_DE_ALCANCE,
      fuentes: fuentesGenerales,
    } satisfies RespuestaChat);

  // Historial anterior: se descartan las preguntas que el filtro habría
  // rechazado (el cliente las sigue mandando) y se recorta el resto.
  return validos
    .slice(-LIMITES.mensajes)
    .filter((m, i, todos) => i === todos.length - 1 || m.rol === "asistente" || !fueraDeAlcance(m.texto))
    .map((m) => ({
      rol: m.rol,
      texto: m.rol === "usuario" ? m.texto : m.texto.slice(0, LIMITES.caracteresAsistente),
    }));
}
