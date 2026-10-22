import type { Reparto } from "@/lib/dhondt";

const numero = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const n = (valor: number) => numero.format(Math.round(valor));

// Divisiones de cada candidatura entre 1, 2, 3… Los cocientes que ganan escaño
// van en negrita con su puesto, para no depender solo del color.
export function TablaCocientes({ reparto }: { reparto: Reparto }) {
  const conVotos = reparto.filas.filter((f) => f.supera);
  const maxEscanos = Math.max(0, ...conVotos.map((f) => f.escanos));
  // Se enseña un divisor más allá del último escaño ganado: el primer cociente que se queda fuera.
  const columnas = Math.min(reparto.escanos, maxEscanos + 1);
  const divisores = Array.from({ length: columnas }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <table className="w-full border-collapse text-left text-[15px] tabular-nums">
        <caption className="sr-only">
          Cocientes de cada candidatura entre 1, 2, 3… Los que ganan escaño
          llevan su puesto entre paréntesis.
        </caption>
        <thead>
          <tr className="bg-muted text-sm text-(--text-secondary)">
            <th scope="col" className="px-4 py-3 font-medium">
              Candidatura
            </th>
            {divisores.map((d) => (
              <th
                key={d}
                scope="col"
                className="px-4 py-3 text-right font-mono font-normal"
              >
                ÷ {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {conVotos.map((fila) => (
            <tr key={fila.nombre}>
              <th
                scope="row"
                className="max-w-[16rem] px-4 py-3 font-medium [overflow-wrap:anywhere]"
              >
                {fila.nombre}
              </th>
              {fila.cocientes.slice(0, columnas).map((c) => (
                <td
                  key={c.divisor}
                  className={
                    c.orden
                      ? "bg-muted px-4 py-3 text-right font-semibold"
                      : "px-4 py-3 text-right text-(--text-secondary)"
                  }
                >
                  {n(c.valor)}
                  {c.orden ? (
                    <span className="ml-1 font-mono text-xs font-normal">
                      ({c.orden}º)
                    </span>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
