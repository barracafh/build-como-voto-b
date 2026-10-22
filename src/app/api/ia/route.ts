// Ruta de ejemplo de la plantilla, desactivada: era un proxy abierto al LLM
// (cualquier pregunta, prompt genérico) y nadie la usa en el front.
// El chat de la herramienta está en /api/chat, con sus protecciones.
const desactivada = () => Response.json({ error: "No encontrado." }, { status: 404 });

export const GET = desactivada;
export const POST = desactivada;
