import provincias from "@/datos/provincias-2023.json";
import { repartir } from "./dhondt";

// «¿Y si toda España fuera una sola circunscripción?»: los 350 escaños se reparten con los votos
// de todo el país, de modo que un voto vale lo mismo viva donde viva quien lo da.
//  - dhondt: la misma fórmula D'Hondt de la ley, pero aplicada a todo el país a la vez.
//  - proporcional: reparto exacto por restos mayores (cada partido, lo más cerca posible de su % de votos).
export type Metodo = "dhondt" | "proporcional";

export type FilaNacional = {
  grupo: string;
  votos: number;
  porcentaje: number;
  supera: boolean;
  escanos: number;
};

export type Nacional = {
  metodo: Metodo;
  barreraPct: number;
  escanos: number;
  votosValidos: number;
  umbral: number;
  filas: FilaNacional[];
};

export const ESCANOS_CONGRESO = provincias.reduce((suma, p) => suma + p.escanos, 0);

export function calcularNacional(barreraPct: number, metodo: Metodo): Nacional {
  const votos = new Map<string, number>();
  let blancos = 0;
  for (const p of provincias) {
    blancos += p.votosBlanco;
    for (const c of p.candidaturas) votos.set(c.grupo, (votos.get(c.grupo) ?? 0) + c.votos);
  }
  const candidaturas = [...votos].map(([nombre, v]) => ({ nombre, votos: v }));
  const votosValidos = candidaturas.reduce((s, c) => s + c.votos, 0) + blancos;
  const umbral = Math.ceil((votosValidos * barreraPct) / 100);

  if (metodo === "dhondt") {
    const r = repartir(candidaturas, blancos, ESCANOS_CONGRESO, barreraPct);
    return {
      metodo,
      barreraPct,
      escanos: ESCANOS_CONGRESO,
      votosValidos: r.votosValidos,
      umbral: r.umbral,
      filas: r.filas
        .map((f) => ({
          grupo: f.nombre,
          votos: f.votos,
          porcentaje: f.porcentaje,
          supera: f.supera,
          escanos: f.escanos,
        }))
        .sort((a, b) => b.escanos - a.escanos || b.votos - a.votos),
    };
  }

  // Proporcional exacto (restos mayores): solo entran las candidaturas que superan la barrera.
  const filas: FilaNacional[] = candidaturas.map((c) => ({
    grupo: c.nombre,
    votos: c.votos,
    porcentaje: (c.votos / votosValidos) * 100,
    supera: c.votos * 100 >= votosValidos * barreraPct,
    escanos: 0,
  }));
  const dentro = filas.filter((f) => f.supera);
  const base = dentro.reduce((s, f) => s + f.votos, 0);
  const cuota = base / ESCANOS_CONGRESO;
  const exactos = dentro.map((f) => ({ f, exacto: f.votos / cuota }));
  for (const e of exactos) e.f.escanos = Math.floor(e.exacto);
  let faltan = ESCANOS_CONGRESO - exactos.reduce((s, e) => s + e.f.escanos, 0);
  exactos
    .sort((a, b) => b.exacto - Math.floor(b.exacto) - (a.exacto - Math.floor(a.exacto)) || b.f.votos - a.f.votos)
    .forEach((e) => {
      if (faltan > 0) {
        e.f.escanos++;
        faltan--;
      }
    });

  return {
    metodo,
    barreraPct,
    escanos: ESCANOS_CONGRESO,
    votosValidos,
    umbral,
    filas: filas.sort((a, b) => b.escanos - a.escanos || b.votos - a.votos),
  };
}
