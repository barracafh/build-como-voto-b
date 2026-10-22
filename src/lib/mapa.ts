import provincias from "@/datos/provincias-2023.json";
import { repartir, type Reparto } from "./dhondt";

export type Provincia = (typeof provincias)[number];

export type ResumenProvincia = {
  provincia: Provincia;
  reparto: Reparto;
  /** Escaños por partido agrupado (PP, PSOE, SUMAR…). */
  porGrupo: Record<string, number>;
  /** Partido con más escaños en la provincia (desempate: más votos); null si nadie llega a la barrera. */
  ganador: string | null;
  escanosGanador: number;
  /** El reparto es distinto del oficial de 2023 (barrera del 3 %). */
  cambia: boolean;
};

export type TotalGrupo = { grupo: string; escanos: number; oficial: number };

export type ResultadoMapa = {
  porCodigo: Map<string, ResumenProvincia>;
  totales: TotalGrupo[];
  provinciasQueCambian: number;
};

const sumar = (rec: Record<string, number>, clave: string, n: number) => {
  rec[clave] = (rec[clave] ?? 0) + n;
};

// Escaños oficiales de 2023 por provincia y partido agrupado: no dependen de la barrera.
const oficial = new Map<string, Record<string, number>>(
  provincias.map((p) => {
    const rec: Record<string, number> = {};
    for (const c of p.candidaturas) sumar(rec, c.grupo, c.escanosOficiales);
    return [p.codigo, rec];
  }),
);

export function calcularMapa(barreraPct: number): ResultadoMapa {
  const porCodigo = new Map<string, ResumenProvincia>();
  const totales = new Map<string, TotalGrupo>();
  const total = (grupo: string) => {
    let t = totales.get(grupo);
    if (!t) totales.set(grupo, (t = { grupo, escanos: 0, oficial: 0 }));
    return t;
  };
  let provinciasQueCambian = 0;

  for (const provincia of provincias) {
    const reparto = repartir(
      provincia.candidaturas,
      provincia.votosBlanco,
      provincia.escanos,
      barreraPct,
    );
    const porGrupo: Record<string, number> = {};
    const votosGrupo: Record<string, number> = {};
    reparto.filas.forEach((fila, i) => {
      const grupo = provincia.candidaturas[i].grupo;
      sumar(porGrupo, grupo, fila.escanos);
      sumar(votosGrupo, grupo, fila.votos);
    });

    const [ganador, escanosGanador] = Object.entries(porGrupo).sort(
      (a, b) => b[1] - a[1] || votosGrupo[b[0]] - votosGrupo[a[0]],
    )[0] ?? [null, 0];

    const of = oficial.get(provincia.codigo)!;
    const cambia = [...new Set([...Object.keys(porGrupo), ...Object.keys(of)])].some(
      (g) => (porGrupo[g] ?? 0) !== (of[g] ?? 0),
    );
    if (cambia) provinciasQueCambian++;

    for (const [g, n] of Object.entries(porGrupo)) total(g).escanos += n;
    for (const [g, n] of Object.entries(of)) total(g).oficial += n;

    porCodigo.set(provincia.codigo, {
      provincia,
      reparto,
      porGrupo,
      ganador: escanosGanador > 0 ? ganador : null,
      escanosGanador,
      cambia,
    });
  }

  return {
    porCodigo,
    provinciasQueCambian,
    totales: [...totales.values()]
      .filter((t) => t.escanos > 0 || t.oficial > 0)
      .sort((a, b) => Math.max(b.escanos, b.oficial) - Math.max(a.escanos, a.oficial)),
  };
}

export type GrupoDesglose = { grupo: string; escanos: number; votos: number; porcentaje: number };
export type SinEscano = { nombre: string; votos: number; porcentaje: number; supera: boolean };

/** Escaños y votos de una provincia por partido, y las candidaturas que se quedan sin escaño. */
export function desglosar(res: ResumenProvincia) {
  const { provincia, reparto } = res;
  const grupos = new Map<string, GrupoDesglose>();
  const sinEscano: SinEscano[] = [];
  reparto.filas.forEach((f, i) => {
    const grupo = provincia.candidaturas[i].grupo;
    if (f.escanos > 0) {
      const g = grupos.get(grupo) ?? { grupo, escanos: 0, votos: 0, porcentaje: 0 };
      g.escanos += f.escanos;
      g.votos += f.votos;
      g.porcentaje += f.porcentaje;
      grupos.set(grupo, g);
    } else {
      sinEscano.push({ nombre: f.nombre, votos: f.votos, porcentaje: f.porcentaje, supera: f.supera });
    }
  });
  return {
    grupos: [...grupos.values()].sort((a, b) => b.escanos - a.escanos || b.votos - a.votos),
    sinEscano: sinEscano.sort((a, b) => b.votos - a.votos),
  };
}

// Los colores con los que se identifica a cada partido (aproximados: no son los hexadecimales de
// sus manuales de marca). Se distinguen peor entre sí que una paleta pensada para ello (el rojo
// del PSOE y el rosa de Sumar, los verdes, los amarillos…), así que el nombre del partido va
// siempre escrito, y las bolitas llevan un contorno fino para separarlas. Para cambiar un color,
// basta con tocar esta tabla.
export const COLOR_PARTIDO: Record<string, string> = {
  PP: "#1D84CE",
  PSOE: "#EF1C27",
  VOX: "#63BE21",
  SUMAR: "#D81B8A",
  ERC: "#FFB232",
  "JxCAT - JUNTS": "#00C3B2",
  "EH Bildu": "#A6CE39",
  "EAJ-PNV": "#1F8A3B",
  "B.N.G.": "#7FB9E6",
  CCa: "#FFD60A",
  "U.P.N.": "#1B3A7A",
};
export const GRIS_OTROS = "#898781";
export const SIN_ESCANO = "#c3c2b7";

/** Color del partido en hexadecimal (el 3D no usa variables CSS). */
export const hexGrupo = (grupo: string | null) =>
  grupo ? (COLOR_PARTIDO[grupo] ?? GRIS_OTROS) : SIN_ESCANO;

export const colorGrupo = hexGrupo;
