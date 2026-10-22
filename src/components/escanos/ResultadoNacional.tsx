import { hexGrupo } from "@/lib/mapa";
import type { Nacional } from "@/lib/nacional";

const numero = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const n = (v: number) => numero.format(Math.round(v));
const pct = (v: number) =>
  `${v.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

// El reparto con toda España como una sola circunscripción: un ladrillo por escaño y partido,
// con la diferencia respecto a lo que pasó en 2023 (por provincias).
export function ResultadoNacional({
  nacional,
  oficial,
}: {
  nacional: Nacional;
  oficial: Map<string, number>;
}) {
  const con = nacional.filas.filter((f) => f.escanos > 0);
  const sin = nacional.filas.filter((f) => f.escanos === 0).slice(0, 5);
  const barrera = nacional.barreraPct.toLocaleString("es-ES");

  return (
    <section aria-labelledby="titulo-nacional" className="[&>*+*]:mt-5">
      <div>
        <h2
          id="titulo-nacional"
          className="font-sans text-[clamp(26px,4vw,34px)] leading-[1.1] tracking-[-0.03em]"
        >
          Los {nacional.escanos} escaños, partido a partido
        </h2>
        <p className="mt-2 text-[15px] text-(--text-secondary)">
          {nacional.barreraPct === 0 ? "Sin barrera" : `Barrera del ${barrera} %`}:{" "}
          {nacional.umbral > 0 ? `${n(nacional.umbral)} votos de ${n(nacional.votosValidos)} válidos.` : `hay ${n(nacional.votosValidos)} votos válidos y basta con ganar un escaño.`}
        </p>
      </div>

      <ul className="grid gap-5">
        {con.map((f) => {
          const antes = oficial.get(f.grupo) ?? 0;
          const dif = f.escanos - antes;
          return (
            <li key={f.grupo}>
              <div className="flex items-baseline justify-between gap-3 text-base">
                <span className="font-medium [overflow-wrap:anywhere]">{f.grupo}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold">{f.escanos}</span> {f.escanos === 1 ? "escaño" : "escaños"}
                  {dif !== 0 && (
                    <span className="ml-1 font-mono text-xs">
                      ({dif > 0 ? "▲ +" : "▼ "}
                      {dif} vs. 2023)
                    </span>
                  )}
                </span>
              </div>
              {/* Un ladrillo por escaño; el nombre y la cifra ya van en texto */}
              <div aria-hidden="true" className="mt-1.5 flex flex-wrap gap-[2px]">
                {Array.from({ length: f.escanos }, (_, i) => (
                  <span
                    key={i}
                    className="h-3 w-3 rounded-[2px]"
                    style={{ background: hexGrupo(f.grupo) }}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-(--text-secondary) tabular-nums">
                {n(f.votos)} votos · {pct(f.porcentaje)} · en 2023, por provincias: {antes}
              </p>
            </li>
          );
        })}
      </ul>

      {sin.length > 0 && (
        <p className="border-t pt-3 text-sm text-(--text-secondary)">
          <span className="font-medium text-foreground">Sin escaño:</span>{" "}
          {sin
            .map((f) => `${f.grupo} (${pct(f.porcentaje)}${f.supera ? "" : `, bajo el ${barrera} %`})`)
            .join(", ")}
          .
        </p>
      )}
    </section>
  );
}
