import type { CSSProperties } from "react";
import { layoutHemiciclo } from "@/lib/hemiciclo";
import { COLOR_PARTIDO, GRIS_OTROS, hexGrupo } from "@/lib/mapa";
import type { PartidoEscanos } from "@/lib/escena";

const ANCHO = 640;
const ALTO = 350;
const CENTRO = { x: ANCHO / 2, y: ALTO - 24 };

// Las bolitas «se generan»: salen del centro del hemiciclo y se colocan en su escaño, de izquierda a
// derecha. Si luego solo cambia el color de una bolita (al mover la barrera), el cambio es suave.
const ESTILO = `
@keyframes aparece-escano {
  from { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.2); }
  to { opacity: 1; transform: none; }
}
.escano { transform-box: fill-box; transform-origin: center; transition: fill 350ms ease; }
.escano-anim { animation: aparece-escano 700ms cubic-bezier(0.2, 0.7, 0.2, 1) both; }
@media (prefers-reduced-motion: reduce) { .escano, .escano-anim { animation: none; transition: none; } }
`;

// Hemiciclo: una bolita por escaño, del color de su partido, ordenadas de más a menos escaños.
// `apagado`: colores más suaves, para la versión pequeña de comparación.
// `animar` + `clave`: se repite la animación de entrada cada vez que cambia la clave.
export function Hemiciclo({
  partidos,
  titulo,
  apagado = false,
  animar = false,
  clave,
}: {
  partidos: PartidoEscanos[];
  titulo: string;
  apagado?: boolean;
  animar?: boolean;
  clave?: string;
}) {
  const total = partidos.reduce((s, p) => s + p.escanos, 0);
  const { asientos, radioAsiento } = layoutHemiciclo(total, CENTRO.x, CENTRO.y, ANCHO / 2 - 24);
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
      <style>{ESTILO}</style>
      {/* La clave hace que, al cambiar el reparto elegido, las bolitas se vuelvan a generar */}
      <g key={clave}>
        {asientos.map((a, i) => (
          <circle
            key={i}
            cx={a.x}
            cy={a.y}
            r={radioAsiento}
            fill={color[i]}
            fillOpacity={apagado ? 0.42 : 1}
            stroke="rgba(11,11,11,0.22)"
            strokeWidth={0.8}
            className={animar ? "escano escano-anim" : "escano"}
            style={
              animar
                ? ({
                    "--dx": `${Math.round(CENTRO.x - a.x)}px`,
                    "--dy": `${Math.round(CENTRO.y - a.y)}px`,
                    animationDelay: `${i * 2}ms`,
                  } as CSSProperties)
                : undefined
            }
          />
        ))}
      </g>
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

/** Color con el que se pinta un partido (los que no tienen color propio comparten el gris). */
export const colorPartido = (grupo: string) => COLOR_PARTIDO[grupo] ?? GRIS_OTROS;
