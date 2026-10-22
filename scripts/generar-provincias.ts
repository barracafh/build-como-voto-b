// Convierte datos/resultados_congreso_2023_provincias.csv (Ministerio del Interior)
// en src/datos/provincias-2023.json. Uso: bun scripts/generar-provincias.ts
import { readFileSync, writeFileSync } from "node:fs";

function filas(texto: string): string[][] {
  const out: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); campo = "";
      if (fila.length > 1) out.push(fila);
      fila = [];
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); out.push(fila); }
  return out;
}

const [cab, ...datos] = filas(readFileSync("datos/resultados_congreso_2023_provincias.csv", "utf8"));
const col = (f: string[], n: string) => f[cab.indexOf(n)];

const provincias = new Map<string, any>();
for (const f of datos) {
  const cod = col(f, "codigo_ine_provincia");
  if (!provincias.has(cod))
    provincias.set(cod, {
      codigo: cod,
      nombre: col(f, "provincia"),
      escanos: +col(f, "escanos"),
      censo: +col(f, "censo"),
      votantes: +col(f, "votantes"),
      votosValidos: +col(f, "votos_validos"),
      votosBlanco: +col(f, "votos_blanco"),
      votosNulos: +col(f, "votos_nulos"),
      candidaturas: [],
    });
  provincias.get(cod).candidaturas.push({
    nombre: col(f, "partido"),
    denominacion: col(f, "denominacion"), // nombre completo, en mayúsculas
    grupo: col(f, "partido_agrupado"),
    votos: +col(f, "votos"),
    escanosOficiales: +col(f, "escanos_obtenidos"),
  });
}
const lista = [...provincias.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
writeFileSync("src/datos/provincias-2023.json", JSON.stringify(lista));
console.log(lista.length, "provincias,", lista.reduce((s, p) => s + p.candidaturas.length, 0), "candidaturas");
