import { layoutHemiciclo } from "@/lib/hemiciclo";
import { COLOR_PARTIDO, GRIS_OTROS, hexGrupo } from "@/lib/mapa";
import type { PartidoEscanos } from "@/lib/escena";

const ANCHO = 640;
const ALTO = 350;

// Hemiciclo estático: una bolita por escaño, del color de su partido, ordenadas de más a menos escaños.
// `apagado`: colores más suaves, para la versión pequeña de comparación.
export function Hemiciclo({
  partidos,
  titulo,
  apagado = false,
}: {
  partidos: PartidoEscanos[];
  titulo: string;
  apagado?: boolean;
}) {
  const total = partidos.reduce((s, p) => s + p.escanos, 0);
  const { asientos, radioAsiento } = layoutHemiciclo(total, ANCHO / 2, ALTO - 24, ANCHO / 2 - 24);
  const color = asientos.map((_, i) => {
    let resto = i;
    for (const p of partidos) {
      if (resto < p.escanos) return hexGrupo(p.grupo);
      resto -= p.escanos;
    }
    return GRIS_OTROS;
  });

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      role="img"
      aria-label={`${titulo}: ${partidos.map((p) => `${p.grupo} ${p.escanos}`).join(", ")}. Total ${total} escaños.`}
      className="block h-auto w-full"
    >
      {asientos.map((a, i) => (
        <circle key={i} cx={a.x} cy={a.y} r={radioAsiento} fill={color[i]} fillOpacity={apagado ? 0.42 : 1} />
      ))}
      <text
        x={ANCHO / 2}
        y={ALTO - 56}
        textAnchor="middle"
        className="fill-foreground"
        fontSize={44}
        fontWeight={500}
      >
        {total}
      </text>
      <text
        x={ANCHO / 2}
        y={ALTO - 30}
        textAnchor="middle"
        className="fill-(--text-secondary)"
        fontSize={15}
      >
        escaños
      </text>
    </svg>
  );
}

/** Color con el que se pinta un partido (los de un solo escaño comparten el gris). */
export const colorPartido = (grupo: string) => COLOR_PARTIDO[grupo] ?? GRIS_OTROS;
