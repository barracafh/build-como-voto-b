import type { Source } from "@/components/Fuentes";

// Chat de dudas. POST {"mensajes": [{ "rol": "usuario" | "asistente", "texto": "…" }]}
// devuelve {"activo": boolean, "respuesta": "…", "fuentes": [{ nombre, url }]}.
// No se guarda nada de lo que escribe el ciudadano: ni base de datos ni logs.

// Mientras sea false, el chat responde que el asistente aún no está activado.
const LLM_ACTIVO = false;

// Dónde mandar a quien pregunta mientras el asistente no responde.
const FUENTES_GENERALES: Source[] = [
  {
    nombre: "Junta Electoral Central · Calendario electoral 29-N",
    url: "https://www.juntaelectoralcentral.es/cs/jec/documentos/eg2026_calendario.pdf",
  },
  {
    nombre: "INE · Oficina del Censo Electoral",
    url: "https://www.ine.es/dyngs/CEL/index.htm?cid=1702",
  },
];

export type MensajeChat = { rol: "usuario" | "asistente"; texto: string };
export type RespuestaChat = {
  activo: boolean;
  respuesta: string;
  fuentes: Source[];
};

export async function POST(req: Request) {
  const { mensajes } = await req.json().catch(() => ({}));
  const ultimo = Array.isArray(mensajes) ? mensajes.at(-1) : undefined;
  if (
    !ultimo ||
    typeof ultimo.texto !== "string" ||
    !ultimo.texto.trim() ||
    ultimo.texto.length > 2000
  )
    return Response.json(
      { error: "Escribe una pregunta de hasta 2.000 caracteres." },
      { status: 400 },
    );

  if (!LLM_ACTIVO)
    return Response.json({
      activo: false,
      respuesta:
        "El asistente todavía no está activado. Mientras tanto, puedes consultar las fuentes oficiales.",
      fuentes: FUENTES_GENERALES,
    } satisfies RespuestaChat);

  return Response.json(
    { error: "El asistente no está disponible." },
    { status: 503 },
  );
}
