"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { desglosar, hexGrupo, type ResumenProvincia } from "@/lib/mapa";
import { IconoProvincia } from "./IconoProvincia";

const numero = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const n = (v: number) => numero.format(Math.round(v));
const pct = (v: number) =>
  `${v.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

// El reparto de una provincia como un muro: un ladrillo por escaño, agrupados por partido.
// Sale encima del mapa al pulsar una provincia (en pantallas pequeñas, debajo).
export function DesgloseProvincia({
  resumen,
  barreraPct,
  onCerrar,
}: {
  resumen: ResumenProvincia;
  barreraPct: number;
  onCerrar: () => void;
}) {
  const { provincia } = resumen;
  const { grupos, sinEscano } = desglosar(resumen);
  const barrera = barreraPct.toLocaleString("es-ES");
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && cerrar.current();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  const visibles = sinEscano.slice(0, 4);
  const resto = sinEscano.length - visibles.length;

  return (
    <section
      aria-label={`Desglose de ${provincia.nombre}`}
      className="z-20 mt-3 max-h-[28rem] overflow-y-auto rounded-xl bg-background p-4 text-sm shadow-md ring-1 ring-foreground/15 sm:absolute sm:right-2 sm:bottom-2 sm:mt-0 sm:w-80 sm:max-w-[calc(100%-1rem)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg leading-tight font-medium [overflow-wrap:anywhere]">
            {provincia.nombre}
          </h3>
          <p className="mt-1 text-(--text-secondary)">
            {provincia.escanos} {provincia.escanos === 1 ? "escaño" : "escaños"} · barrera del{" "}
            {barrera} %
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onCerrar} aria-label="Cerrar el desglose">
          Cerrar
        </Button>
      </div>

      {grupos.length === 0 ? (
        <p className="mt-4 text-(--text-secondary)">
          Con esta barrera ninguna candidatura la supera: no se reparte ningún escaño.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4">
          {grupos.map((g) => (
            <li key={g.grupo}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium [overflow-wrap:anywhere]">{g.grupo}</span>
                <span className="shrink-0 tabular-nums text-(--text-secondary)">
                  {g.escanos} {g.escanos === 1 ? "escaño" : "escaños"}
                </span>
              </div>
              {/* Una silueta de la provincia por escaño; el nombre y la cifra ya van en texto */}
              <div aria-hidden="true" className="mt-1.5 flex flex-wrap gap-1">
                {Array.from({ length: g.escanos }, (_, i) => (
                  <IconoProvincia key={i} codigo={provincia.codigo} color={hexGrupo(g.grupo)} tamano={22} />
                ))}
              </div>
              <p className="mt-1 text-xs text-(--text-secondary) tabular-nums">
                {n(g.votos)} votos · {pct(g.porcentaje)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {sinEscano.length > 0 && (
        <p className="mt-4 border-t pt-3 text-xs text-(--text-secondary)">
          <span className="font-medium text-foreground">Sin escaño:</span>{" "}
          {visibles
            .map((c) => `${c.nombre} (${c.supera ? "no llega a un cociente" : `bajo el ${barrera} %`})`)
            .join(", ")}
          {resto > 0 ? ` y ${resto} más` : ""}.
        </p>
      )}
    </section>
  );
}
