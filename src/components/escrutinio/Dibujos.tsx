// Dibujos de línea para la infografía del escrutinio. Solo usan los colores de
// Sol: tinta (currentColor), fondo, gris y el rojo de marca como acento.
// Son decorativos: el texto de al lado dice lo mismo.

type Props = { className?: string };

const trazo = {
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
// Para trazos sin relleno.
const linea = { ...trazo, fill: "none" };

export function Sobre({ n, className }: Props & { n: number }) {
  return (
    <svg viewBox="0 0 120 84" aria-hidden="true" className={className}>
      <rect x="4" y="4" width="112" height="76" rx="6" fill="var(--background)" {...trazo} />
      <path d="M4 10 L60 46 L116 10" {...linea} />
      {/* firmas cruzando la solapa (art. 100.4) */}
      <path d="M44 34 q6 -8 10 0 t10 0 t10 0" {...linea} stroke="var(--brand)" strokeWidth={1.75} />
      <text
        x="60"
        y="72"
        textAnchor="middle"
        fontFamily="var(--font-heading)"
        fontSize="22"
        fill="currentColor"
      >
        {n}
      </text>
    </svg>
  );
}

export function VotoValido({ className }: Props) {
  return (
    <svg viewBox="0 0 120 96" aria-hidden="true" className={className}>
      {/* papeleta asomando */}
      <rect x="30" y="6" width="60" height="56" rx="3" fill="var(--background)" {...trazo} />
      <path d="M40 20 H80 M40 30 H72 M40 40 H76" {...linea} strokeWidth={1.5} opacity="0.5" />
      {/* sobre */}
      <path d="M10 40 H110 V88 a4 4 0 0 1 -4 4 H14 a4 4 0 0 1 -4 -4 Z" fill="var(--muted)" {...trazo} />
      <path d="M10 40 L60 70 L110 40" {...linea} />
      <circle cx="96" cy="78" r="9" fill="var(--brand)" />
      <path d="M91.5 78 l3 3 l6 -6" fill="none" stroke="var(--background)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VotoBlanco({ className }: Props) {
  return (
    <svg viewBox="0 0 120 96" aria-hidden="true" className={className}>
      {/* sobre abierto y vacío */}
      <path d="M10 40 L60 8 L110 40" fill="var(--background)" {...trazo} />
      <path d="M10 40 H110 V88 a4 4 0 0 1 -4 4 H14 a4 4 0 0 1 -4 -4 Z" fill="var(--muted)" {...trazo} />
      <path d="M10 40 L60 70 L110 40" {...linea} />
      <path d="M48 24 h24" {...linea} strokeDasharray="3 5" opacity="0.5" />
    </svg>
  );
}

export function VotoNulo({ className }: Props) {
  return (
    <svg viewBox="0 0 120 96" aria-hidden="true" className={className}>
      <rect x="24" y="6" width="72" height="84" rx="3" fill="var(--background)" {...trazo} />
      <path d="M36 22 H84 M36 34 H76 M36 46 H80 M36 58 H70" {...linea} strokeWidth={1.5} opacity="0.5" />
      {/* alteración: nombre tachado y garabato */}
      <path d="M32 34 H82" {...linea} stroke="var(--brand)" strokeWidth={3} />
      <path d="M40 74 q8 -10 14 0 t14 0 t12 -4" {...linea} stroke="var(--brand)" />
    </svg>
  );
}
