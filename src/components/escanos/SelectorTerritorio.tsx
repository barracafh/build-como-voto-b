"use client";

import { useId } from "react";
import { COMUNIDADES, comunidadDe, provinciasDe } from "@/lib/comunidades";

const claseSelect =
  "mt-2 block min-h-11 w-full rounded-xl bg-background px-3 text-base ring-1 ring-foreground/20 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-muted disabled:text-(--text-secondary)";
const claseEtiqueta = "text-sm font-medium text-(--text-secondary)";

// Primero la comunidad autónoma y después su provincia: la lista de 52 era demasiado larga.
// La comunidad sale de la provincia elegida, así que mapa y selectores no se desincronizan.
export function SelectorTerritorio({
  codigo,
  onChange,
}: {
  codigo: string;
  onChange: (codigo: string) => void;
}) {
  const idComunidad = useId();
  const idProvincia = useId();
  const comunidad = comunidadDe(codigo);
  const provincias = provinciasDe(comunidad);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={idComunidad} className={claseEtiqueta}>
          Comunidad autónoma
        </label>
        <select
          id={idComunidad}
          value={comunidad.nombre}
          onChange={(e) => {
            const nueva = COMUNIDADES.find((c) => c.nombre === e.target.value);
            if (nueva) onChange(provinciasDe(nueva)[0].codigo);
          }}
          className={claseSelect}
        >
          {COMUNIDADES.map((c) => (
            <option key={c.nombre} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={idProvincia} className={claseEtiqueta}>
          Provincia
        </label>
        <select
          id={idProvincia}
          value={codigo}
          disabled={provincias.length === 1}
          onChange={(e) => onChange(e.target.value)}
          className={claseSelect}
        >
          {provincias.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.nombre} ({p.escanos} {p.escanos === 1 ? "escaño" : "escaños"})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
