import mapa from "@/datos/mapa-provincias.json";

const cache = new Map<string, { viewBox: string; d: string }>();

// Silueta de la provincia, recortada a su caja: se usa como «ladrillo» de cada escaño.
function datos(codigo: string) {
  const guardado = cache.get(codigo);
  if (guardado) return guardado;
  const p = mapa.provincias.find((x) => x.codigo === codigo);
  if (!p) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const m of p.d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)) {
    const x = Number(m[1]);
    const y = Number(m[2]);
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const margen = 1;
  const res = {
    viewBox: `${x0 - margen} ${y0 - margen} ${x1 - x0 + 2 * margen} ${y1 - y0 + 2 * margen}`,
    d: p.d,
  };
  cache.set(codigo, res);
  return res;
}

export function IconoProvincia({
  codigo,
  color,
  tamano = 20,
}: {
  codigo: string;
  color: string;
  tamano?: number;
}) {
  const icono = datos(codigo);
  if (!icono) return null;
  return (
    <svg
      viewBox={icono.viewBox}
      width={tamano}
      height={tamano}
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d={icono.d}
        fill={color}
        stroke="rgba(11,11,11,0.35)"
        strokeWidth={0.6}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}
