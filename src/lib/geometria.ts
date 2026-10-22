// Utilidades para convertir las rutas SVG de las provincias en polígonos con huecos.
export type Punto = [number, number];

export function anillos(d: string): Punto[][] {
  return d
    .split("Z")
    .filter(Boolean)
    .map((r) =>
      r
        .replace(/^M/, "")
        .split("L")
        .map((p) => {
          const [x, y] = p.split(",");
          return [Number(x), Number(y)] as Punto;
        }),
    )
    .filter((r) => r.length >= 3);
}

function dentro([px, py]: Punto, anillo: Punto[]) {
  let ins = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

// Un anillo es exterior o hueco según cuántos anillos lo contienen (par/impar),
// sin depender del sentido en que venga dibujado.
export function poligonos(rs: Punto[][]) {
  const prof = rs.map((r, i) => rs.filter((o, j) => j !== i && dentro(r[0], o)).length);
  const exteriores = rs.map((r, i) => ({ r, i, huecos: [] as Punto[][] })).filter((e) => prof[e.i] % 2 === 0);
  rs.forEach((r, i) => {
    if (prof[i] % 2 === 0) return;
    const dueno = exteriores.find((e) => dentro(r[0], e.r));
    dueno?.huecos.push(r);
  });
  return exteriores;
}
