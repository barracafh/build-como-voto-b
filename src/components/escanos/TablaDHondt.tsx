"use client";

import { useRef, type PointerEvent } from "react";
import { BARRERA_PCT, repartir } from "@/lib/dhondt";
import { hexGrupo, type Provincia } from "@/lib/mapa";

const numero = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const n = (v: number) => numero.format(Math.round(v));
const pct = (v: number) =>
  `${v.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
const dec = (v: number, d: number) =>
  v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });

// Cocientes de las tablas anchas (Madrid, Barcelona…) en miles de votos, sin letra: 1.460, 488, 97,5.
// La escala se indica una sola vez, a la izquierda de las columnas, y no pegada a cada cifra.
const miles = (v: number) => {
  const k = v / 1000;
  return k >= 100 ? n(k) : dec(k, 1);
};

// La tabla D'Hondt de una provincia con TODAS las candidaturas, de más a menos votos.
// Cada cifra de votos se divide entre 1, 2, 3… y los cocientes más grandes se llevan un escaño.
// Una línea marca la barrera del 3 %: las que quedan debajo no entran en el reparto.
// Se adapta al número de columnas para que quepa entera, sin desplazarse.
export function TablaDHondt({
  provincia,
  barreraPct = BARRERA_PCT,
}: {
  provincia: Provincia;
  barreraPct?: number;
}) {
  const reparto = repartir(provincia.candidaturas, provincia.votosBlanco, provincia.escanos, barreraPct);
  const filas = reparto.filas
    .map((f, i) => ({ ...f, grupo: provincia.candidaturas[i].grupo }))
    .sort((a, b) => b.votos - a.votos);
  const dentro = filas.filter((f) => f.supera);
  const fuera = filas.filter((f) => !f.supera);
  // Columnas ÷1, ÷2…: hasta un divisor más allá del último escaño ganado
  const columnas = Math.min(provincia.escanos, Math.max(0, ...dentro.map((f) => f.escanos)) + 1);
  const divisores = Array.from({ length: columnas }, (_, i) => i + 1);
  const barrera = barreraPct.toLocaleString("es-ES");
  const anchoTotal = 4 + columnas;
  // Con muchas columnas, cifras abreviadas y letra más pequeña; con muchas filas, filas más bajas
  const compacto = columnas > 6;
  const ancha = columnas > 9;
  const py = filas.length > 12 ? "py-1" : "py-2";
  const celda = (v: number) => (compacto ? miles(v) : n(v));

  // Aviso con la cifra exacta de un cociente, junto al cursor. Se pinta directamente en el DOM
  // (sin estado de React) para que salga al instante y no vuelva a pintar la tabla en cada movimiento.
  const aviso = useRef<HTMLDivElement>(null);
  const mover = (e: PointerEvent<HTMLTableElement>) => {
    const a = aviso.current;
    if (!a) return;
    const celdaBajo = (e.target as HTMLElement).closest<HTMLElement>("[data-exacto]");
    if (!celdaBajo) {
      a.style.opacity = "0";
      return;
    }
    const [cifra, detalle] = a.children as unknown as HTMLElement[];
    cifra.textContent = `${celdaBajo.dataset.exacto} votos`;
    detalle.textContent = celdaBajo.dataset.detalle ?? "";
    a.style.opacity = "1";
    a.style.left = `${Math.min(e.clientX + 14, window.innerWidth - 230)}px`;
    a.style.top = `${e.clientY + 18}px`;
  };
  const ocultar = () => {
    if (aviso.current) aviso.current.style.opacity = "0";
  };

  const nombre = (f: (typeof filas)[number]) => (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: hexGrupo(f.grupo) }} />
      <span className="truncate" title={f.nombre}>
        {f.nombre}
      </span>
    </span>
  );

  return (
    <div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table
          onPointerMove={mover}
          onPointerLeave={ocultar}
          className={`w-full border-collapse text-left tabular-nums ${
            ancha ? "table-fixed text-[11px] [&_td]:px-1 [&_th]:px-1" : compacto ? "text-[13px]" : "text-sm"
          }`}
        >
          <caption className="sr-only">
            Tabla D&apos;Hondt de {provincia.nombre}: cocientes de cada candidatura. Las que no llegan al{" "}
            {barrera} % de los votos válidos no entran en el reparto.
          </caption>
          {ancha && (
            <colgroup>
              <col style={{ width: "17%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} />
              {divisores.map((d) => (
                <col key={d} />
              ))}
            </colgroup>
          )}
          <thead>
            {/* La escala de los cocientes, a la izquierda de sus columnas */}
            {compacto && (
              <tr className="bg-muted text-[11px] text-(--text-secondary)">
                <td colSpan={4} />
                <th scope="colgroup" colSpan={columnas} className="pt-2 text-left font-medium">
                  Cocientes · en miles de votos →
                </th>
              </tr>
            )}
            <tr className="bg-muted text-xs text-(--text-secondary)">
              <th scope="col" className="px-3 py-2.5 font-medium">Candidatura</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Votos</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">%</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium text-foreground">Escaños</th>
              {divisores.map((d) => (
                <th key={d} scope="col" className="px-3 py-2.5 text-right font-mono font-normal">
                  ÷{d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dentro.map((f) => (
              <tr key={f.nombre} className="border-t">
                <th scope="row" className={`max-w-[15rem] px-3 ${py} font-medium`}>
                  {nombre(f)}
                </th>
                <td className={`px-3 ${py} text-right`}>{n(f.votos)}</td>
                <td className={`px-3 ${py} text-right`}>{pct(f.porcentaje)}</td>
                <td className={`px-3 ${py} text-right text-base font-semibold`}>{f.escanos}</td>
                {f.cocientes.slice(0, columnas).map((c) => (
                  <td
                    key={c.divisor}
                    data-exacto={n(c.valor)}
                    data-detalle={`${f.nombre} ÷ ${c.divisor}`}
                    aria-label={`${n(c.valor)} votos`}
                    className={
                      c.orden
                        ? `bg-muted px-3 ${py} text-right font-semibold`
                        : `px-3 ${py} text-right text-(--text-secondary)`
                    }
                  >
                    {celda(c.valor)}
                  </td>
                ))}
              </tr>
            ))}

            {/* La barrera: por encima entran en el reparto, por debajo no */}
            <tr aria-label={`Barrera del ${barrera} %`}>
              <td colSpan={anchoTotal} className="p-0">
                <div className="flex items-center gap-3 bg-muted/60 px-3 py-1.5 text-xs text-(--text-secondary)">
                  <span aria-hidden="true" className="h-0 flex-1 border-t-2 border-dashed border-foreground/45" />
                  <span className="shrink-0 font-mono font-medium tracking-[0.04em] uppercase">
                    Barrera del {barrera} % · {n(reparto.umbral)} votos · por debajo, no entran
                  </span>
                  <span aria-hidden="true" className="h-0 w-8 border-t-2 border-dashed border-foreground/45" />
                </div>
              </td>
            </tr>

            {fuera.map((f) => (
              <tr key={f.nombre} className="border-t text-(--text-secondary)">
                <th scope="row" className={`max-w-[15rem] px-3 ${py} font-normal`}>
                  {nombre(f)}
                </th>
                <td className={`px-3 ${py} text-right`}>{n(f.votos)}</td>
                <td className={`px-3 ${py} text-right`}>{pct(f.porcentaje)}</td>
                <td className={`px-3 ${py} text-right`}>0</td>
                <td colSpan={columnas} className={`px-3 ${py} text-right text-xs`}>
                  No llega al {barrera} %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {compacto && (
        <p className="mt-2 text-xs text-(--text-secondary)">
          Con el cursor encima de un cociente sale la cifra exacta.
        </p>
      )}
      {/* Aviso flotante de la cifra exacta (fijo en pantalla, para que no lo recorte ningún panel) */}
      <div
        ref={aviso}
        aria-hidden="true"
        className="pointer-events-none fixed z-50 w-max max-w-[220px] rounded-lg bg-foreground px-3 py-1.5 text-xs text-background opacity-0 shadow-md"
      >
        <p className="text-sm font-semibold tabular-nums" />
        <p className="opacity-80" />
      </div>
    </div>
  );
}
