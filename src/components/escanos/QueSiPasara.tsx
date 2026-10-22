"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BARRERA_PCT } from "@/lib/dhondt";
import { calcularReparto, type MetodoReparto, type Subdivision } from "@/lib/alternativas";
import { PARTIDOS_2023 } from "@/lib/escena";
import { Hemiciclo, colorPartido } from "./Hemiciclo";

const num = (v: number) => v.toLocaleString("es-ES");

const SUBDIVISIONES: { id: Subdivision; titulo: string; texto: string }[] = [
  {
    id: "nacional",
    titulo: "Toda España",
    texto: "Los 350 escaños se reparten con los votos de todo el país: un voto vale lo mismo viva donde viva quien lo da.",
  },
  {
    id: "autonomica",
    titulo: "Comunidades autónomas",
    texto: "Cada comunidad autónoma reparte la suma de los escaños de sus provincias (19 repartos).",
  },
  {
    id: "provincial",
    titulo: "Provincias",
    texto: "Cada provincia reparte sus escaños por separado (52 repartos). Es como se hizo en 2023.",
  },
];

const METODOS: { id: MetodoReparto; titulo: string; texto: string }[] = [
  {
    id: "dhondt",
    titulo: "D'Hondt",
    texto: "Se divide la cifra de votos de cada partido entre 1, 2, 3… y los cocientes más grandes se llevan un escaño.",
  },
  {
    id: "proporcional",
    titulo: "Proporcional",
    texto:
      "Se divide el total de votos entre los escaños y cada partido recibe los escaños que le caben; los que sobran, a los restos más altos. No hay barrera: todos los votos cuentan igual.",
  },
];

// «¿Y si…?»: los mismos votos de 2023, repartidos con otras reglas. Es una pregunta en secuencia:
// primero dónde se reparte, luego cómo y, solo con D'Hondt, la barrera mínima.
export function QueSiPasara() {
  const idSlider = useId();
  const [sub, setSub] = useState<Subdivision | null>(null);
  const [metodo, setMetodo] = useState<MetodoReparto | null>(null);
  const [barrera, setBarrera] = useState(BARRERA_PCT);

  // El proporcional no tiene barrera
  const barreraReal = metodo === "dhondt" ? barrera : 0;
  const resultado = useMemo(
    () => (sub && metodo ? calcularReparto(sub, metodo, barreraReal) : null),
    [sub, metodo, barreraReal],
  );
  const oficial = useMemo(() => new Map(PARTIDOS_2023.map((p) => [p.grupo, p.escanos])), []);
  const ahora = useMemo(
    () => new Map((resultado?.partidos ?? []).map((p) => [p.grupo, p.escanos])),
    [resultado],
  );

  // Todos los partidos que tienen escaños en 2023 o ahora, con lo que ganan o pierden
  const filas = [...new Set([...oficial.keys(), ...ahora.keys()])]
    .map((grupo) => ({ grupo, ahora: ahora.get(grupo) ?? 0, antes: oficial.get(grupo) ?? 0 }))
    .sort((a, b) => Math.max(b.ahora, b.antes) - Math.max(a.ahora, a.antes) || a.grupo.localeCompare(b.grupo));
  const esLoReal = sub === "provincial" && metodo === "dhondt" && barrera === BARRERA_PCT;

  const infoSub = SUBDIVISIONES.find((s) => s.id === sub);
  const infoMetodo = METODOS.find((m) => m.id === metodo);
  const barreraTexto = barreraReal === 0 ? "sin barrera" : `barrera del ${num(barreraReal)} %`;
  const resumen = `${infoSub?.titulo}, ${infoMetodo?.titulo}, ${barreraTexto}`;

  const paso = (titulo: string, children: React.ReactNode) => (
    <div role="group" aria-label={titulo}>
      <p className="text-base font-medium">{titulo}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );

  return (
    <div className="[&>*+*]:mt-8" aria-live="polite">
      <div>
        <h2 className="font-sans text-[clamp(30px,5vw,44px)] leading-[1.08] tracking-[-0.03em]">
          ¿Y si cambiaran las reglas?
        </h2>
        <p className="mt-3 max-w-[760px] text-lg text-(--text-secondary)">
          Los mismos votos de 2023, repartidos de otra manera. Elige dónde se reparten los escaños y cómo.
        </p>
      </div>

      {/* 1. Dónde */}
      {paso(
        "1. ¿Dónde se reparten los escaños?",
        SUBDIVISIONES.map((s) => (
          <Button
            key={s.id}
            variant={sub === s.id ? "secondary" : "outline"}
            aria-pressed={sub === s.id}
            onClick={() => setSub(s.id)}
          >
            {s.titulo}
          </Button>
        )),
      )}

      {/* 2. Cómo: aparece al elegir dónde */}
      {sub &&
        paso(
          "2. ¿Cómo se reparten?",
          METODOS.map((m) => (
            <Button
              key={m.id}
              variant={metodo === m.id ? "secondary" : "outline"}
              aria-pressed={metodo === m.id}
              onClick={() => setMetodo(m.id)}
            >
              {m.titulo}
            </Button>
          )),
        )}

      {/* 3. La barrera: solo con D'Hondt, y encima de la explicación */}
      {sub && metodo === "dhondt" && (
        <div>
          <label htmlFor={idSlider} className="text-base font-medium">
            3. Barrera mínima:{" "}
            <span className="tabular-nums">{barrera === 0 ? "sin barrera" : `${num(barrera)} %`}</span>
            <span className="font-normal text-(--text-secondary)">
              {" "}
              · {barrera === 0 ? "basta con ganar un escaño" : `hay que tener el ${num(barrera)} % de los votos del reparto`}
            </span>
          </label>
          <input
            id={idSlider}
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={barrera}
            onChange={(e) => setBarrera(Number(e.target.value))}
            aria-valuetext={barrera === 0 ? "sin barrera" : `${num(barrera)} por ciento`}
            className="mt-3 block w-full max-w-[760px] accent-foreground"
          />
        </div>
      )}

      {/* La explicación de lo elegido, debajo de la barra */}
      {infoSub && infoMetodo && (
        <div className="max-w-[760px] space-y-1 text-base text-(--text-secondary)">
          <p>{infoSub.texto}</p>
          <p>
            {infoMetodo.texto}
            {metodo === "proporcional" && sub === "nacional" && resultado?.votosPorEscano
              ? ` Aquí, cada escaño «cuesta» unos ${num(Math.round(resultado.votosPorEscano))} votos.`
              : ""}
          </p>
        </div>
      )}

      {/* El resultado, cuando ya se ha elegido todo, con el hemiciclo real de 2023 al lado para comparar */}
      {resultado && (
        <>
          <div className="mx-auto grid max-w-[1000px] items-end gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.36fr)]">
            <div>
              <p className="mb-2 text-center text-sm font-medium text-(--text-secondary)">
                {esLoReal ? "Con estas reglas: exactamente lo que pasó en 2023" : "Con estas reglas"}
              </p>
              <Hemiciclo partidos={resultado.partidos} titulo={`Hemiciclo con ${resumen}`} />
            </div>
            <div>
              <p className="mb-2 text-center text-sm font-medium text-(--text-secondary)">Así quedó en 2023</p>
              <Hemiciclo apagado partidos={PARTIDOS_2023} titulo="Hemiciclo real de 2023, para comparar" />
            </div>
          </div>

          {/* Escaños de cada partido y diferencia con 2023 */}
          <ul className="mx-auto grid max-w-[760px] gap-x-6 gap-y-2 text-[15px] sm:grid-cols-2">
            {filas.map((f) => {
              const dif = f.ahora - f.antes;
              return (
                <li key={f.grupo} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: colorPartido(f.grupo) }}
                  />
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{f.grupo}</span>
                  <span className="tabular-nums">
                    <span className="font-semibold">{f.ahora}</span>
                    {dif !== 0 && (
                      <span className="ml-1 font-mono text-xs">
                        ({dif > 0 ? "▲ +" : "▼ "}
                        {dif} vs. 2023)
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
