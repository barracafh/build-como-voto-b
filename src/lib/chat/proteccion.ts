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
  // Ajustables por entorno solo para pruebas locales (CHAT_POR_MINUTO_IP y
  // CHAT_POR_HORA_IP en .env.local); en producción, los valores por defecto.
  porMinutoIp: Number(process.env.CHAT_POR_MINUTO_IP) || 15,
  porHoraIp: Number(process.env.CHAT_POR_HORA_IP) || 120,
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
// PRIORIDAD: cero falsos positivos. Bloquear a un ciudadano es peor que dejar
// pasar un ataque: detrás están la regla 8 del prompt y maxTokens. Por eso solo
// patrones de jailbreak o de encargo de tareas, nunca palabras sueltas, y
// cualquier cambio se mide contra todos los «dentro» de pruebas/banco-*.json.
//
// Normalización: NFKC pliega full-width y compatibles («Ｉｇｎｏｒａ» → «Ignora»);
// luego se quitan los caracteres de formato (ancho cero, guion blando, bidi),
// después NFD + quitar tildes y minúsculas.
const normalizar = (t: string) =>
  t
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

// Leet («1gn0r4 l4s 1nstrucc10n3s»). Solo se usa con los patrones de
// manipulación de instrucciones, que son frases muy concretas.
const desleet = (t: string) =>
  t.replace(/[0134578@$]/g, (c) => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", $: "s" })[c] ?? c);

const VERBOS_ENCARGO =
  "(?:escribe|escribeme|redacta|redactame|genera|generame|haz|hazme|haces|hacerme|creame|programame|inventa|inventate|compon|componme|write|generate)";
// Sin infinitivos: «¿es nulo si escribir un poema en la papeleta…?».
// «artículo» no está: «hazme un resumen del artículo de la LOREG» es legítimo.
// «código» y «función» con excepciones: «escribir el código postal», «el
// código de la solicitud», «hacer la función de vocal».
const ENCARGOS = String.raw
  `(?:codigo(?!\s+(?:postal|electoral|civil|penal|qr|csv|seguro|pin|de\s+(?!python|javascript|programacion)))|script|funcion(?!\s+de\b)|algoritmo|html|sql|python|javascript|poema|poesia|cancion|rap|versos?|ensayo|redaccion|cuento|relato|novela|chiste|tweet|tuit|receta|tfg|tfm|excel|code|poem|essay|story|song|joke)`;
// Inicio de frase: «Actúa como…» es una orden; «¿Quién actúa como presidente?», no.
const INICIO = String.raw`(?:^|[.!?¡¿,;:\n]\s*)`;
const IA = String.raw`(?:una?\s+)?(?:ia|asistente|modelo|chatbot|bot|llm|ai|dan)\b`;

// Manipulación de instrucciones: también se prueban sobre el texto «desleet».
const PATRONES_JAILBREAK: RegExp[] = [
  // «ignora/olvida TUS/LAS instrucciones/reglas» (no «olvida mi pregunta
  // anterior; ¿qué reglas…?» ni «ignora mis faltas de ortografía»).
  /\b(?:ignora|ignore|olvida|olvidate\s+de|forget|omite|disregard|saltate)\s+(?:de\s+)?(?:todas?\s+)?(?:tus|las|sus|your|all|the|any)\s+(?:\S+\s+){0,2}?(?:instrucci|regla|indicaci|prompt|restricci|directri|normas|instruction|rule|guideline)/,
  // «ignora todo lo anterior», «olvida todas las instrucciones anteriores»
  /\b(?:ignora|ignore|ignorar|olvida|olvidate\s+de|forget|disregard)\s+(?:todo\s+lo|todas?\s+las?|todos\s+los|all\s+(?:the\s+)?|everything)\s*(?:\S+\s+)?(?:anterior(?:es)?|previo|previous|above|before)/,
  // Pedir el prompt o las instrucciones ocultas
  /\b(?:system\s*prompt|prompt\s+(?:del?\s+sistema|inicial|original|oculto)|(?:tu|your|the)\s+prompt\b)/,
  /\binstrucciones\s+(?:(?:del?\s+sistema)(?!\s+(?:electoral|de\s+voto|d'?hondt|proporcional))|iniciales|originales|ocultas|internas|secretas)/,
  /\btus\s+(?:instrucciones|reglas|directrices|normas)\s+(?:exactas|completas|originales|literales|internas|ocultas|secretas|iniciales)\b/,
  /\b(?:cuales|que)\s+son\s+tus\s+(?:instrucciones|reglas|directrices|normas)\b(?!\s+(?:para|de|sobre))/,
  /\b(?:antes|anterior)\s+(?:a|de)\s+(?:la\s+palabra\s+)?contexto\b/,
  /\btexto\s+(?:anterior|previo)\s+a\s+(?:esta|la|nuestra)\s+conversacion\b/,
  /\bempezando\s+por\s+\W*eres\b/,
  /\b(?:fragmentos|chunks)\s+(?:del|de\s+tu)\s+contexto\b/,
];

const PATRONES_FUERA: RegExp[] = [
  // Juego de rol / cambio de identidad
  // No «actúa como si fuera mi primera vez…» ni «responde como un experto: …».
  new RegExp(String.raw`${INICIO}(?:actua|comportate)\s+como\s+(?!si\b|(?:una?\s+)?(?:experto|experta|especialista|guia|asesora?|profesor|profesora)\b)`),
  // Solo a inicio de frase: «¿Quién finge ser yo…?» o «who will act as…» son legítimas.
  new RegExp(String.raw`${INICIO}(?:please\s+)?(?:act|behave|pretend)\s+(?:as|to\s+be|you)\b`),
  new RegExp(String.raw`${INICIO}finge\b|\bquiero\s+que\s+finjas\b`),
  /\b(?:you\s+are\s+now|from\s+now\s+on,?\s+you|roleplay|juego\s+de\s+rol)\b/,
  /\bhaz\s+como\s+si\s+(?:fueras|fueses|tu\s+fueras|no\s+tuvieras|no\s+existieran)\b/,
  new RegExp(String.raw`\bimagina\s+que\s+(?:eres|fueras)\s+${IA}`),
  /\ba\s+partir\s+de\s+ahora\s+(?:(?:eres|seras|vas\s+a\s+ser)\s+(?!mi\b|mis\b|nuestr)|(?:ignora|olvida|responde|respondes|vas\s+a\s+(?:ignorar|olvidar|responder|actuar)))/,
  new RegExp(String.raw`\b(?:olvidate\s+de\s+(?:ser|que\s+eres)|ya\s+no\s+eres|ahora\s+eres)\s+${IA}`),
  /\b(?:jailbreak|dan\s+mode|modo\s+dan|developer\s+mode|modo\s+desarrollador|unfiltered)\b/,
  // Mensajes de «sistema» falsos al inicio de línea o de frase
  /(?:^|\n|[.!?]\s+)\s*(?:\[\s*(?:system|sistema|admin)\s*\]|(?:system|developer)\s*:)/,
  // Formatos de salida forzados y decodificación
  /\b(?:en|con\s+(?:este|un|el))\s+(?:formato\s+)?json\b/,
  /\b(?:decodifica|descodifica|decode|descifra|desencripta)\b[^\n]{0,60}\bbase\s*64\b/,
  // Encargos ajenos: «escríbeme un script en Python», «hazme un poema»…
  new RegExp(String.raw`\b${VERBOS_ENCARGO}\s+(?:\S+\s+){0,3}${ENCARGOS}\b`),
  /\b(?:escribe|escribeme|redacta|redactame|write)\s+(?:me\s+)?(?:un|an?)\s+(?:\S+\s+)?(?:articulo|article)\b/,
  /\bcover\s+letter\b/,
  /\b(?:script|programa|funcion)\s+(?:en|de|in)\s+(?:python|javascript|typescript|php|bash)\b/,
  /\b(?:pasa(?:me|lo)?|esto|convierte(?:lo)?)\s+(?:\S+\s+){0,2}(?:a|en)\s+(?:python|javascript|typescript|php)\b/,
  /\b(?:consulta|query)\s+(?:en\s+)?sql\b/,
  new RegExp(String.raw`\b(?:traduceme|traducelo|traducemelo|translate)\b|${INICIO}traduce\b`),
  // Código pegado (patrones concretos, no palabras sueltas)
  /\bdef\s+\w+\s*\(/,
  /\bfunction\s+\w+\s*\(/,
  /\b(?:const|let|var)\s+\w+\s*=/,
  /(?:^|\n)\s*(?:import\s+[\w.*{}, ]+(?:\s+from\s|\s+as\s|\s*;|\s*$|\s*\n)|from\s+[\w.]+\s+import\s)/,
  // SQL, no «select one candidate from each party».
  /\bselect\s+(?:\*|distinct\b|count\s*\(|\w+(?:\s*,\s*\w+)+\s)[^\n]*?\bfrom\s+\w+|\bselect\s+\w+\s+from\s+\w+\s+(?:where|group|order|limit)\b/,
  /\b(?:console\.log|system\.out\.print\w*|printf?)\s*\(/,
  /#include\s*</,
  /\bpublic\s+static\b/,
  /<\/?(?:script|html|div|body|\?php)\b/,
];

export function fueraDeAlcance(texto: string): boolean {
  const t = normalizar(texto);
  if (t.includes("```")) return true;
  // Símbolos de programación por DENSIDAD: un mensaje largo con muchos «;» es
  // prosa, no código. Las llaves, en cambio, no las escribe un ciudadano.
  const simbolos = (t.match(/[{};<>=$\\]/g) ?? []).length;
  if (simbolos >= 8 && simbolos / t.length > 0.03) return true;
  if ((t.match(/[{}]/g) ?? []).length >= 6) return true;
  // Bloques base64 largos (sin espacios).
  if (/[a-z0-9+/=]{200,}/i.test(texto.replace(/\p{Cf}/gu, ""))) return true;
  if (PATRONES_JAILBREAK.some((p) => p.test(t))) return true;
  if (/\d/.test(t)) {
    const l = desleet(t);
    if (PATRONES_JAILBREAK.some((p) => p.test(l))) return true;
  }
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
