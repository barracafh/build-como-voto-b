"use client";

import { useEffect, useRef } from "react";
import provincias from "@/datos/provincias-2023.json";
import { Button } from "@/components/ui/button";
import { comunidadDe } from "@/lib/comunidades";
import { repartir } from "@/lib/dhondt";
import { TablaDHondt } from "./TablaDHondt";

const numero = new Intl.NumberFormat("es-ES", { useGrouping: "always" });

// La tabla D'Hondt de la provincia pulsada: cubre toda la escena (el mapa queda debajo, intacto)
// con tres pasos para entenderla y la tabla con todos los partidos.
export function PanelProvincia({
  codigo,
  onCerrar,
}: {
  codigo: string | null;
  onCerrar: () => void;
}) {
  const provincia = provincias.find((p) => p.codigo === codigo);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!provincia) return;
    boton.current?.focus({ preventScroll: true });
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && cerrar.current();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [provincia]);

  if (!provincia) return null;

  const reparto = repartir(provincia.candidaturas, provincia.votosBlanco, provincia.escanos);
  const entran = reparto.filas.filter((f) => f.supera).length;
  const fuera = reparto.filas.length - entran;
  const pasos = [
    `Se descartan los partidos que no llegan al 3 % de los votos válidos (${numero.format(reparto.umbral)} votos). ${
      fuera === 0 ? "Aquí entran todos." : `Aquí se quedan fuera ${fuera}.`
    }`,
    "La cifra de votos de cada partido que entra se divide entre 1, 2, 3…",
    `Los ${provincia.escanos} cocientes más grandes de toda la tabla se llevan un escaño: son las casillas sombreadas.`,
  ];

  return (
    <section
      aria-label={`Tabla D'Hondt de ${provincia.nombre}`}
      className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-xl bg-background ring-1 ring-foreground/15"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
            {comunidadDe(provincia.codigo).nombre}
          </p>
          <h2 className="font-sans text-[clamp(26px,3.6vw,40px)] leading-[1.08] tracking-[-0.03em] [overflow-wrap:anywhere]">
            {provincia.nombre}
          </h2>
          <p className="mt-1 text-[15px] text-(--text-secondary)">
            {provincia.escanos} {provincia.escanos === 1 ? "escaño" : "escaños"} ·{" "}
            {numero.format(reparto.votosValidos)} votos válidos · tabla D&apos;Hondt
          </p>
        </div>
        <Button ref={boton} variant="outline" onClick={onCerrar}>
          ← Volver al mapa
        </Button>
      </div>

      <ol className="grid gap-3 px-4 pt-4 text-sm sm:grid-cols-3 sm:gap-5 sm:px-6">
        {pasos.map((paso, i) => (
          <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-2">
            <span className="text-xl leading-[1.1] font-light text-brand tabular-nums">{i + 1}</span>
            <p className="text-(--text-secondary)">{paso}</p>
          </li>
        ))}
      </ol>

      <div className="min-h-0 flex-1 overflow-auto px-4 pt-4 pb-4 sm:px-6 sm:pb-5">
        <TablaDHondt provincia={provincia} />
      </div>
    </section>
  );
}
