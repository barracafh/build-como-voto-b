// Comprueba que D'Hondt + barrera del 3 % reproduce los escaños oficiales de 2023.
// Uso: bun scripts/comprobar-dhondt.ts
import provincias from "../src/datos/provincias-2023.json";
import { repartir } from "../src/lib/dhondt";

let fallos = 0;
let total = 0;
for (const p of provincias) {
  const r = repartir(p.candidaturas, p.votosBlanco, p.escanos);
  if (r.votosValidos !== p.votosValidos)
    console.log(`${p.nombre}: votos válidos ${r.votosValidos} ≠ ${p.votosValidos}`);
  for (const f of r.filas) {
    const oficial = p.candidaturas.find((c) => c.nombre === f.nombre)!.escanosOficiales;
    total += f.escanos;
    if (f.escanos !== oficial) {
      fallos++;
      console.log(`${p.nombre} · ${f.nombre}: calculado ${f.escanos}, oficial ${oficial}`);
    }
  }
  if (r.empateEnElLimite) console.log(`${p.nombre}: empate exacto en el límite`);
}
console.log(`${provincias.length} provincias, ${total} escaños, ${fallos} diferencias`);
process.exit(fallos ? 1 : 0);
