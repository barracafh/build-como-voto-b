import provincias from "@/datos/provincias-2023.json";
import { COMUNIDADES, provinciasDe } from "./comunidades";
import { repartir } from "./dhondt";
import type { PartidoEscanos } from "./escena";

// «¿Y si…?» con los mismos votos de 2023 y otras reglas de reparto. Son dos decisiones aparte:
//  - subdivisión: en qué territorios se reparten los escaños (toda España, comunidades, provincias);
//  - método: cómo se reparten dentro de cada uno (D'Hondt, o proporcional dividiendo entre escaños).
// «Provincias + D'Hondt + 3 %» es lo que pasó de verdad en 2023.
export type Subdivision = "nacional" | "autonomica" | "provincial";
export type MetodoReparto = "dhondt" | "proporcional";

type Circunscripcion = { votos: Map<string, number>; blancos: number; escanos: number };

const porEscanos = (a: PartidoEscanos, b: PartidoEscanos) =>
  b.escanos - a.escanos || a.grupo.localeCompare(b.grupo);

// Cada territorio con sus votos por partido, sus votos en blanco y los escaños que reparte
// (la suma de los de sus provincias: el total sigue siendo 350).
function circunscripciones(sub: Subdivision): Circunscripcion[] {
  const juntar = (provs: typeof provincias): Circunscripcion => {
    const votos = new Map<string, number>();
    let blancos = 0;
    let escanos = 0;
    for (const p of provs) {
      escanos += p.escanos;
      blancos += p.votosBlanco;
      for (const c of p.candidaturas) votos.set(c.grupo, (votos.get(c.grupo) ?? 0) + c.votos);
    }
    return { votos, blancos, escanos };
  };
  if (sub === "nacional") return [juntar(provincias)];
  if (sub === "autonomica") return COMUNIDADES.map((c) => juntar(provinciasDe(c)));
  return provincias.map((p) => juntar([p]));
}

/** Reparto proporcional (restos mayores): cada partido, los escaños que le caben en el total de votos ÷ escaños. */
function proporcional(c: Circunscripcion, barreraPct: number) {
  const validos = [...c.votos.values()].reduce((s, v) => s + v, 0) + c.blancos;
  const entran = [...c.votos].filter(([, v]) => v * 100 >= validos * barreraPct);
  const base = entran.reduce((s, [, v]) => s + v, 0);
  const reparto = new Map<string, number>();
  if (!base) return { reparto, cuota: 0 };
  const cuota = base / c.escanos;
  const filas = entran.map(([grupo, v]) => ({ grupo, v, exacto: v / cuota }));
  for (const f of filas) reparto.set(f.grupo, Math.floor(f.exacto));
  let faltan = c.escanos - [...reparto.values()].reduce((s, n) => s + n, 0);
  filas
    .sort((a, b) => b.exacto - Math.floor(b.exacto) - (a.exacto - Math.floor(a.exacto)) || b.v - a.v)
    .forEach((f) => {
      if (faltan > 0) {
        reparto.set(f.grupo, (reparto.get(f.grupo) ?? 0) + 1);
        faltan--;
      }
    });
  return { reparto, cuota };
}

export type Resultado = {
  partidos: PartidoEscanos[];
  /** Votos que «cuesta» un escaño (solo si el reparto es proporcional y de toda España). */
  votosPorEscano?: number;
};

export function calcularReparto(sub: Subdivision, metodo: MetodoReparto, barreraPct: number): Resultado {
  const total = new Map<string, number>();
  let votosPorEscano: number | undefined;
  for (const c of circunscripciones(sub)) {
    let reparto: Map<string, number>;
    if (metodo === "dhondt") {
      const r = repartir(
        [...c.votos].map(([nombre, votos]) => ({ nombre, votos })),
        c.blancos,
        c.escanos,
        barreraPct,
      );
      reparto = new Map(r.filas.map((f) => [f.nombre, f.escanos]));
    } else {
      const r = proporcional(c, barreraPct);
      reparto = r.reparto;
      if (sub === "nacional") votosPorEscano = r.cuota;
    }
    for (const [grupo, n] of reparto) total.set(grupo, (total.get(grupo) ?? 0) + n);
  }
  return {
    partidos: [...total]
      .map(([grupo, escanos]) => ({ grupo, escanos }))
      .filter((p) => p.escanos > 0)
      .sort(porEscanos),
    votosPorEscano,
  };
}
