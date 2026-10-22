import provincias from "@/datos/provincias-2023.json";

// Datos de la escena del hemiciclo que se deshace en montañas de bolitas por provincia.
// Cada bolita es un escaño real: sale de un asiento del hemiciclo y llega a un sitio concreto
// de la pila de su provincia, siempre con el color de su partido.

export type PartidoEscanos = { grupo: string; escanos: number };

/** Escaños oficiales de 2023 por partido, de más a menos. */
export const PARTIDOS_2023: PartidoEscanos[] = (() => {
  const total = new Map<string, number>();
  for (const p of provincias)
    for (const c of p.candidaturas)
      if (c.escanosOficiales > 0) total.set(c.grupo, (total.get(c.grupo) ?? 0) + c.escanosOficiales);
  return [...total]
    .map(([grupo, escanos]) => ({ grupo, escanos }))
    .sort((a, b) => b.escanos - a.escanos || a.grupo.localeCompare(b.grupo));
})();

export const TOTAL_ESCANOS = PARTIDOS_2023.reduce((s, p) => s + p.escanos, 0);

/** Partido de cada asiento del hemiciclo, de izquierda a derecha. */
export const ASIENTOS: string[] = PARTIDOS_2023.flatMap((p) => Array<string>(p.escanos).fill(p.grupo));

const ALTO_FILA = Math.sqrt(3) / 2;

/** Montaña de n bolitas: filas que se estrechan hacia arriba. Unidades: diámetros de bolita; (0,0) = centro. */
export function posicionesPila(n: number) {
  let base = 1;
  while ((base * (base + 1)) / 2 < n) base++;
  const slots: { dx: number; dy: number }[] = [];
  let quedan = n;
  let fila = 0;
  while (quedan > 0) {
    const m = Math.min(quedan, base - fila);
    for (let k = 0; k < m; k++) slots.push({ dx: k - (m - 1) / 2, dy: fila * ALTO_FILA });
    quedan -= m;
    fila++;
  }
  const alto = (fila - 1) * ALTO_FILA;
  return {
    slots: slots.map((s) => ({ dx: s.dx, dy: s.dy - alto / 2 })), // centrada en vertical
    ancho: base,
    alto: alto + 1,
  };
}

export type Pila = { n: number; ancho: number; alto: number };
export const PILAS = new Map<string, Pila>();

export type Destino = { codigo: string; dx: number; dy: number };

/** Sitio de cada bolita en su provincia, alineado con ASIENTOS (el asiento i va a DESTINOS[i]). */
export const DESTINOS: Destino[] = (() => {
  const rango = new Map(PARTIDOS_2023.map((p, i) => [p.grupo, i]));
  const colas = new Map<string, Destino[]>();
  for (const prov of [...provincias].sort((a, b) => a.codigo.localeCompare(b.codigo))) {
    // Escaños de esta provincia por partido, el mayor abajo del todo
    const porPartido = new Map<string, number>();
    for (const c of prov.candidaturas)
      if (c.escanosOficiales > 0) porPartido.set(c.grupo, (porPartido.get(c.grupo) ?? 0) + c.escanosOficiales);
    const escanos = [...porPartido]
      .sort((a, b) => b[1] - a[1] || (rango.get(a[0]) ?? 0) - (rango.get(b[0]) ?? 0))
      .flatMap(([g, n]) => Array<string>(n).fill(g));
    const pila = posicionesPila(escanos.length);
    PILAS.set(prov.codigo, { n: escanos.length, ancho: pila.ancho, alto: pila.alto });
    // Las filas se rellenan de abajo arriba: el primer asiento es el de abajo a la izquierda
    escanos.forEach((g, j) => {
      const cola = colas.get(g) ?? [];
      cola.push({ codigo: prov.codigo, dx: pila.slots[j].dx, dy: pila.slots[j].dy });
      colas.set(g, cola);
    });
  }
  const usados = new Map<string, number>();
  return ASIENTOS.map((g) => {
    const k = usados.get(g) ?? 0;
    usados.set(g, k + 1);
    return colas.get(g)![k];
  });
})();
