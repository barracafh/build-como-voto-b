// Reparto de escaños del Congreso por la fórmula D'Hondt (LOREG, art. 163.1).
// 1. Se descartan las candidaturas por debajo del 3 % de los votos válidos
//    de la circunscripción (los votos en blanco cuentan como válidos).
// 2. Se divide cada cifra de votos entre 1, 2, 3… hasta el número de escaños.
// 3. Los escaños van a los cocientes mayores, en orden decreciente.
// 4. Empate: gana la candidatura con más votos; si coinciden, sorteo.

export type Candidatura = { nombre: string; votos: number };

/** Barrera legal, en % de los votos válidos. */
export const BARRERA_PCT = 3;

export type Cociente = {
  /** Divisor: 1, 2, 3… */
  divisor: number;
  valor: number;
  /** Posición del cociente entre los ganadores (1 = el mayor); null si no gana escaño. */
  orden: number | null;
};

export type FilaReparto = {
  nombre: string;
  votos: number;
  /** Porcentaje sobre los votos válidos (blancos incluidos). */
  porcentaje: number;
  supera: boolean;
  escanos: number;
  cocientes: Cociente[];
};

export type Reparto = {
  escanos: number;
  /** Votos válidos: candidaturas + blancos. */
  votosValidos: number;
  /** Mínimo de votos para entrar en el reparto: el 3 % de los válidos. */
  umbral: number;
  filas: FilaReparto[];
  /** Hay un empate exacto entre el último escaño y el siguiente cociente. */
  empateEnElLimite: boolean;
};

export function repartir(
  candidaturas: readonly Candidatura[],
  votosBlanco: number,
  escanos: number,
  // Parámetro para el "¿y si…?": la ley fija el 3 %.
  barreraPct: number = BARRERA_PCT,
): Reparto {
  const votosValidos =
    candidaturas.reduce((suma, c) => suma + c.votos, 0) + votosBlanco;
  // supera si votos >= barrera % de los válidos
  const supera = (votos: number) => votos * 100 >= votosValidos * barreraPct;

  const filas: FilaReparto[] = candidaturas.map((c) => ({
    nombre: c.nombre,
    votos: c.votos,
    porcentaje: votosValidos ? (c.votos / votosValidos) * 100 : 0,
    supera: supera(c.votos),
    escanos: 0,
    cocientes: [],
  }));

  type Par = { fila: number; divisor: number };
  const pares: Par[] = [];
  filas.forEach((f, i) => {
    if (!f.supera) return;
    for (let d = 1; d <= escanos; d++) pares.push({ fila: i, divisor: d });
  });

  // a/b > c/d  <=>  a*d > c*b : se compara sin dividir para evitar decimales.
  const comparar = (p: Par, q: Par) => {
    const izq = filas[p.fila].votos * q.divisor;
    const der = filas[q.fila].votos * p.divisor;
    if (izq !== der) return der - izq; // cociente mayor primero
    return filas[q.fila].votos - filas[p.fila].votos; // desempate: más votos
  };
  pares.sort(comparar);

  const ganadores = new Map<string, number>();
  pares.slice(0, escanos).forEach((p, i) => {
    ganadores.set(`${p.fila}/${p.divisor}`, i + 1);
    filas[p.fila].escanos++;
  });

  filas.forEach((f, i) => {
    if (!f.supera) return;
    for (let d = 1; d <= escanos; d++) {
      f.cocientes.push({
        divisor: d,
        valor: f.votos / d,
        orden: ganadores.get(`${i}/${d}`) ?? null,
      });
    }
  });

  const ultimo = pares[escanos - 1];
  const siguiente = pares[escanos];
  const empateEnElLimite =
    !!ultimo &&
    !!siguiente &&
    filas[ultimo.fila].votos * siguiente.divisor ===
      filas[siguiente.fila].votos * ultimo.divisor &&
    filas[ultimo.fila].votos === filas[siguiente.fila].votos;

  return {
    escanos,
    votosValidos,
    umbral: Math.ceil((votosValidos * barreraPct) / 100),
    filas,
    empateEnElLimite,
  };
}
