// Precalcula los embeddings de los fragmentos del chat y los guarda en
// src/datos/embeddings.json. Ejecútalo desde la raíz del repo cuando cambie
// contexto.md o el troceado:
//   bun scripts/embeber.ts
// Reutiliza los vectores cuyo fragmento no ha cambiado (mismo hash de texto).
// Solo guarda las primeras DIMS dimensiones (qwen3-embedding es Matryoshka),
// renormalizadas y redondeadas a 4 decimales, para que el JSON pese poco.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import actual from "../src/datos/embeddings.json";
import {
  fragmentos,
  hashTexto,
  recorteVector,
  textoEmbebible,
} from "../src/lib/chat/corpus";
import { embeber, MODELO_EMBEDDINGS } from "../src/lib/ia";

const DIMS = 512;
const LOTE = 24;

type Vectores = Record<string, { h: string; v: number[] }>;
const previos = actual as unknown as { dims: number; vectores: Vectores };

const todos = fragmentos();
const vectores: Vectores = {};
const pendientes = todos.filter((f) => {
  const h = hashTexto(textoEmbebible(f));
  const p = previos.dims === DIMS ? previos.vectores[f.id] : undefined;
  if (p && p.h === h) {
    vectores[f.id] = p;
    return false;
  }
  return true;
});

console.log(`${todos.length} fragmentos; ${pendientes.length} por embeber`);
for (let i = 0; i < pendientes.length; i += LOTE) {
  const lote = pendientes.slice(i, i + LOTE);
  const salida = await embeber(lote.map(textoEmbebible), { timeoutMs: 60_000 });
  lote.forEach((f, j) => {
    vectores[f.id] = {
      h: hashTexto(textoEmbebible(f)),
      v: recorteVector(salida[j], DIMS).map((x) => Math.round(x * 1e4) / 1e4),
    };
  });
  console.log(`  ${Math.min(i + LOTE, pendientes.length)}/${pendientes.length}`);
}

const ruta = join(process.cwd(), "src/datos/embeddings.json");
const json = JSON.stringify({ modelo: MODELO_EMBEDDINGS, dims: DIMS, vectores });
writeFileSync(ruta, json + "\n");
console.log(`Escrito ${ruta} (${(json.length / 1024).toFixed(0)} KB)`);
