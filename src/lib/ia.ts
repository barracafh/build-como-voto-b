// HelmCode habla la API de OpenAI. Úsalo solo desde el servidor (rutas de
// src/app/api o Server Actions): en el navegador la clave no existe, y así debe ser.
// El modelo del evento (glm5.3-flash) lee texto e imágenes: para una imagen,
// manda `content` como lista de partes, con la imagen en data URL o https.
export type Parte =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
export type Mensaje = {
  role: "system" | "user" | "assistant";
  content: string | Parte[];
};

// Con { json: true } se pide al modelo que responda con un objeto JSON.
// Con { maxTokens } se acota la salida (en glm5.3-flash incluye el razonamiento).
// Con { razonar: false } se desactiva el razonamiento previo de glm5.3-flash:
// la respuesta llega en ~0,3-5 s en lugar de 10-30 s (medido el 22/10).
// HelmCode acepta las dos formas a la vez; enable_thinking es la que manda.
export async function completar(
  messages: Mensaje[],
  {
    json = false,
    maxTokens,
    razonar = true,
  }: { json?: boolean; maxTokens?: number; razonar?: boolean } = {},
): Promise<string> {
  const { HELMCODE_API_KEY, HELMCODE_BASE_URL, HELMCODE_MODEL } = process.env;
  if (!HELMCODE_API_KEY || !HELMCODE_MODEL)
    throw new Error("Faltan HELMCODE_API_KEY o HELMCODE_MODEL en .env.local");
  // Todos los equipos comparten límites: ante un 429, espera y reintenta.
  for (let intento = 0; ; intento++) {
    const res = await fetch(
      `${HELMCODE_BASE_URL ?? "https://api.helmcode.com/v1"}/chat/completions`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${HELMCODE_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: HELMCODE_MODEL,
          messages,
          ...(json && { response_format: { type: "json_object" } }),
          ...(maxTokens && { max_tokens: maxTokens }),
          ...(!razonar && {
            chat_template_kwargs: { enable_thinking: false },
            thinking: { type: "disabled" },
          }),
        }),
      },
    );
    if (res.status === 429 && intento < 3) {
      const espera = Number(res.headers.get("retry-after")) || 2 ** intento;
      await new Promise((r) => setTimeout(r, Math.min(espera, 10) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`HelmCode respondió ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }
}

// Embeddings (vectores de significado) con el modelo de HelmCode. Devuelve un
// vector por texto, en el mismo orden. Con timeout: quien llama debe tener un
// plan B si falla (el chat cae a la búsqueda por palabras clave).
export const MODELO_EMBEDDINGS = "qwen3-embedding";

export async function embeber(
  textos: string[],
  { timeoutMs = 5000 }: { timeoutMs?: number } = {},
): Promise<number[][]> {
  const { HELMCODE_API_KEY, HELMCODE_BASE_URL } = process.env;
  if (!HELMCODE_API_KEY) throw new Error("Falta HELMCODE_API_KEY en .env.local");
  const res = await fetch(
    `${HELMCODE_BASE_URL ?? "https://api.helmcode.com/v1"}/embeddings`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${HELMCODE_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODELO_EMBEDDINGS, input: textos }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  if (!res.ok) throw new Error(`HelmCode (embeddings) respondió ${res.status}`);
  const data: { data: { index: number; embedding: number[] }[] } = await res.json();
  return [...data.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
