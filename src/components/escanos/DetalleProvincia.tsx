import { Card } from "@/components/ui/card";
import { BARRERA_PCT, repartir } from "@/lib/dhondt";
import { hexGrupo, type Provincia } from "@/lib/mapa";
import { nombreLegible } from "@/lib/nombres";
import { IconoProvincia } from "./IconoProvincia";
import { TablaCocientes } from "./TablaCocientes";

const numero = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const n = (valor: number) => numero.format(Math.round(valor));
const pct = (valor: number) =>
  `${valor.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
const barrera = (valor: number) => valor.toLocaleString("es-ES");

// Reparto de una provincia con los votos oficiales de 2023 y la barrera indicada.
// `sol`: la tarjeta amarilla; solo una por vista.
export function DetalleProvincia({
  provincia,
  barreraPct = BARRERA_PCT,
  sol = true,
}: {
  provincia: Provincia;
  barreraPct?: number;
  sol?: boolean;
}) {
  const reparto = repartir(
    provincia.candidaturas,
    provincia.votosBlanco,
    provincia.escanos,
    barreraPct,
  );
  const filas = reparto.filas
    .map((f, i) => ({
      ...f,
      oficial: provincia.candidaturas[i].escanosOficiales,
      grupo: provincia.candidaturas[i].grupo,
      completo: nombreLegible(provincia.candidaturas[i].denominacion),
    }))
    .sort((a, b) => b.votos - a.votos);
  const coincide = filas.every((f) => f.escanos === f.oficial);
  const esLaLey = barreraPct === BARRERA_PCT;

  return (
    <div className="[&>*+*]:mt-8">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <Card render={<section />} className="gap-2 bg-muted px-6 py-6 text-base ring-0">
          <h3 className="text-sm font-medium text-(--text-secondary)">Votos válidos</h3>
          <p className="text-2xl tabular-nums">{n(reparto.votosValidos)}</p>
          <p className="text-sm text-(--text-secondary)">
            Incluye {n(provincia.votosBlanco)} en blanco
          </p>
        </Card>
        <Card
          render={<section />}
          className={
            sol
              ? "gap-2 px-6 py-6 text-base ring-0 [background:radial-gradient(120%_90%_at_100%_0%,#ffd34d_0%,rgba(255,211,77,0)_60%),var(--brand-yellow)]"
              : "gap-2 bg-muted px-6 py-6 text-base ring-0"
          }
        >
          <h3 className={sol ? "text-sm font-medium" : "text-sm font-medium text-(--text-secondary)"}>
            Mínimo para entrar ({barrera(barreraPct)} %)
          </h3>
          <p className="text-2xl tabular-nums">{n(reparto.umbral)} votos</p>
          <p className={sol ? "text-sm" : "text-sm text-(--text-secondary)"}>
            Quien no llega, no cuenta en el reparto
          </p>
        </Card>
        <Card render={<section />} className="gap-2 bg-muted px-6 py-6 text-base ring-0">
          <h3 className="text-sm font-medium text-(--text-secondary)">Escaños</h3>
          <p className="text-2xl tabular-nums">{provincia.escanos}</p>
          <p className="text-sm text-(--text-secondary)">
            {esLaLey
              ? coincide
                ? "El cálculo coincide con el resultado oficial"
                : "El cálculo no coincide con el oficial"
              : coincide
                ? "El reparto no cambia respecto a la ley (3 %)"
                : "El reparto cambia respecto a la ley (3 %)"}
          </p>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full border-collapse text-left text-[15px] tabular-nums">
          <caption className="sr-only">
            Resultados de {provincia.nombre} en 2023 y escaños que da D&apos;Hondt con una
            barrera del {barrera(barreraPct)} %
          </caption>
          <thead>
            <tr className="bg-muted text-sm text-(--text-secondary)">
              <th scope="col" className="px-4 py-3 font-medium">Candidatura</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Votos</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">% válidos</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                ¿Llega al {barrera(barreraPct)} %?
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Escaños</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filas.map((f) => {
              const dif = f.escanos - f.oficial;
              return (
                <tr key={f.nombre}>
                  <th scope="row" title={f.completo} className="max-w-[16rem] px-4 py-3 font-medium [overflow-wrap:anywhere]">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: hexGrupo(f.grupo) }}
                      />
                      {f.nombre}
                    </span>
                  </th>
                  <td className="px-4 py-3 text-right">{n(f.votos)}</td>
                  <td className="px-4 py-3 text-right">{pct(f.porcentaje)}</td>
                  <td className="px-4 py-3 text-right">{f.supera ? "Sí" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    {/* Una silueta de la provincia por escaño, del color de su partido */}
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {Array.from({ length: f.escanos }, (_, k) => (
                        <IconoProvincia
                          key={k}
                          codigo={provincia.codigo}
                          color={hexGrupo(f.grupo)}
                          tamano={22}
                        />
                      ))}
                      <span className="ml-1 font-semibold">{f.escanos}</span>
                      {!esLaLey && dif !== 0 ? (
                        <span className="font-mono text-xs">
                          ({dif > 0 ? "▲ +" : "▼ "}
                          {dif} vs. ley)
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {provincia.escanos === 1 ? (
        <p className="text-base text-(--text-secondary)">
          {provincia.nombre} elige un solo escaño: lo gana la candidatura más votada (art. 163.2
          de la LOREG).
        </p>
      ) : (
        <div>
          <h3 className="text-lg font-medium">Cómo salen los {provincia.escanos} escaños</h3>
          <p className="mt-2 text-base text-(--text-secondary)">
            Cada cifra de votos se divide entre 1, 2, 3… Los {provincia.escanos} cocientes más
            grandes se llevan un escaño, en orden. En la tabla, los que lo ganan van sombreados con
            su puesto.
          </p>
          <div className="mt-4">
            <TablaCocientes reparto={reparto} />
          </div>
        </div>
      )}
    </div>
  );
}
