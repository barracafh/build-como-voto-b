// Colocación de los escaños de un hemiciclo: filas concéntricas con más asientos cuanto más
// lejos del centro, ordenados de izquierda a derecha para que cada partido forme una cuña.
export type Asiento = { x: number; y: number; ang: number; fila: number };

// Redondeo a 2 decimales: el seno y el coseno pueden diferir en el último decimal entre Node y el
// navegador, y eso daba un aviso de hidratación en el hemiciclo estático.
const r2 = (v: number) => Math.round(v * 100) / 100;

export function layoutHemiciclo(n: number, cx: number, cy: number, R: number) {
  const filas = Math.max(3, Math.round(Math.sqrt(n) * 0.6));
  const rMin = R * 0.38;
  const radios = Array.from({ length: filas }, (_, i) => rMin + ((R - rMin) * i) / (filas - 1));
  const suma = radios.reduce((s, r) => s + r, 0);
  // Asientos por fila, proporcionales al radio; el redondeo se corrige en las filas de fuera
  const porFila = radios.map((r) => Math.round((n * r) / suma));
  let dif = n - porFila.reduce((s, m) => s + m, 0);
  for (let i = filas - 1; dif !== 0; i = i === 0 ? filas - 1 : i - 1) {
    porFila[i] += Math.sign(dif);
    dif -= Math.sign(dif);
  }
  const asientos: Asiento[] = [];
  radios.forEach((r, fila) => {
    const m = porFila[fila];
    for (let k = 0; k < m; k++) {
      const ang = Math.PI - (Math.PI * (k + 0.5)) / m;
      asientos.push({ x: r2(cx + r * Math.cos(ang)), y: r2(cy - r * Math.sin(ang)), ang, fila });
    }
  });
  asientos.sort((a, b) => b.ang - a.ang || a.fila - b.fila); // de izquierda a derecha
  const entreFilas = (R - rMin) / (filas - 1);
  const entreAsientos = Math.min(...radios.map((r, i) => (Math.PI * r) / porFila[i]));
  return { asientos, radioAsiento: r2(Math.min(entreFilas, entreAsientos) * 0.44) };
}
