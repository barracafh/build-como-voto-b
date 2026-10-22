import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Map as MapIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BotonAviso } from "@/components/BotonAviso";
import { Fuentes } from "@/components/Fuentes";
import { SelectorProvincia } from "@/components/escanos/SelectorProvincia";
import { TablaCocientes } from "@/components/escanos/TablaCocientes";
import { repartir } from "@/lib/dhondt";
import ficha from "../../../ficha.json";

export const metadata: Metadata = {
  title: `Cómo se reparten los escaños · ${ficha.nombre}`,
  description: "La ley D'Hondt explicada paso a paso con resultados oficiales de 2023.",
};

const fuentes = ficha.fuentes.filter(
  (f) =>
    f.url.includes("BOE-A-1985-11672") ||
    f.url === "https://infoelectoral.interior.gob.es/",
);

const pasos = [
  {
    titulo: "Se descartan las candidaturas por debajo del 3 %",
    texto:
      "Solo entran en el reparto las que consiguen al menos el 3 % de los votos válidos de su provincia. Los votos en blanco cuentan como válidos, así que suben ese listón.",
  },
  {
    titulo: "Se divide cada cifra de votos entre 1, 2, 3…",
    texto:
      "Las candidaturas que pasan el 3 % dividen sus votos entre 1, entre 2, entre 3, y así hasta el número de escaños de la provincia.",
  },
  {
    titulo: "Los cocientes más grandes se llevan los escaños",
    texto:
      "Se ordenan todos los resultados de mayor a menor y se reparte un escaño por cada uno, empezando por el más grande, hasta agotar los escaños.",
  },
  {
    titulo: "Si hay empate, gana quien tiene más votos",
    texto:
      "Si dos cocientes son iguales, el escaño es para la candidatura con más votos totales. Si también empatan en eso, se resuelve por sorteo.",
  },
];

// Ejemplo de la guía (contexto.md, 3.2): candidaturas genéricas y votos inventados.
const ejemplo = repartir(
  [
    { nombre: "Candidatura A", votos: 71000 },
    { nombre: "Candidatura B", votos: 48000 },
    { nombre: "Candidatura C", votos: 31000 },
    { nombre: "Candidatura D", votos: 17000 },
    { nombre: "Candidatura E", votos: 5300 },
  ],
  8000,
  6,
);
const numero = new Intl.NumberFormat("es-ES", { useGrouping: "always" });

export default function Escanos() {
  const e = ejemplo.filas;
  const fuera = e.find((f) => !f.supera);

  return (
    <>
      <header className="mx-auto flex min-h-20 max-w-(--container-content) flex-wrap items-center justify-between gap-4 px-(--page-gutter) py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-3 text-lg leading-tight font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand font-mono text-xl text-white"
          >
            {ficha.icono}
          </span>
          {ficha.nombre}
        </Link>
        <Badge variant="outline">Resultados oficiales 2023</Badge>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-[760px] px-(--page-gutter) pt-12 pb-20 outline-none md:pt-20"
      >
        <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
          Cómo se reparten los escaños
        </p>
        <h1 className="mt-4 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
          La ley D&apos;Hondt, explicada.
        </h1>
        <p className="mt-6 text-lg text-(--text-secondary)">
          En las elecciones generales no gana «el más votado» y ya está: cada
          provincia reparte sus escaños con una fórmula. Así funciona, con un
          ejemplo y con los resultados oficiales de 2023.
        </p>

        <Link
          href="/mapa"
          className="group mt-8 flex items-center gap-4 rounded-2xl border-2 border-brand bg-brand/5 p-5 transition-colors outline-none hover:bg-brand/10 focus-visible:ring-3 focus-visible:ring-ring/50 md:gap-5 md:p-6"
        >
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand text-white"
          >
            <MapIcon className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-medium">
              Verlo en un mapa, provincia a provincia
            </span>
            <span className="mt-1 block text-base text-(--text-secondary)">
              Cómo quedó el Congreso en 2023, de qué provincia sale cada escaño y
              qué habría pasado con otras reglas.
            </span>
          </span>
          <ArrowRight
            aria-hidden="true"
            className="size-6 shrink-0 text-brand transition-transform group-hover:translate-x-1"
          />
        </Link>

        <section aria-labelledby="pasos" className="mt-16 text-lg [&>*+*]:mt-8">
          <h2
            id="pasos"
            className="font-sans text-[clamp(30px,5vw,44px)] leading-[1.08] tracking-[-0.03em]"
          >
            Cómo funciona, en cuatro pasos
          </h2>
          <ol className="grid gap-5">
            {pasos.map((paso, i) => (
              <li
                key={paso.titulo}
                className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 md:grid-cols-[32px_minmax(0,1fr)] md:gap-x-4"
              >
                <span className="text-[22px] leading-[1.1] font-light text-brand tabular-nums md:text-[26px]">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-medium">{paso.titulo}</h3>
                  <p className="mt-1 text-base text-(--text-secondary)">
                    {paso.texto}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="ejemplo" className="mt-16 text-lg [&>*+*]:mt-6">
          <div>
            <h2
              id="ejemplo"
              className="font-sans text-[clamp(30px,5vw,44px)] leading-[1.08] tracking-[-0.03em]"
            >
              Un ejemplo con números
            </h2>
            <p className="mt-3 text-[15px] text-(--text-secondary)">
              Provincia inventada de 6 escaños, con candidaturas genéricas
            </p>
          </div>
          <p className="text-base">
            Hay {numero.format(ejemplo.votosValidos)} votos válidos, contando
            8.000 en blanco. El 3 % son {numero.format(ejemplo.umbral)} votos:{" "}
            {fuera ? (
              <>
                la {fuera.nombre} se queda con {numero.format(fuera.votos)} y
                no entra en el reparto.
              </>
            ) : (
              "todas las candidaturas entran."
            )}{" "}
            Las demás se dividen entre 1, 2, 3…
          </p>
          <TablaCocientes reparto={ejemplo} />
          <p className="text-base">
            Los 6 cocientes mayores dan{" "}
            {e
              .filter((f) => f.escanos > 0)
              .map((f) => `${f.escanos} a la ${f.nombre}`)
              .join(", ")}
            . La {e.find((f) => f.supera && f.escanos === 0)?.nombre} no
            consigue ninguno: su mejor cociente queda por detrás del último
            escaño.
          </p>
        </section>

        <section aria-labelledby="otros" className="mt-16 text-lg [&>*+*]:mt-6">
          <h2
            id="otros"
            className="font-sans text-[clamp(30px,5vw,44px)] leading-[1.08] tracking-[-0.03em]"
          >
            Blanco, nulo y abstención
          </h2>
          <ul className="grid gap-3 text-base">
            <li>
              <strong className="font-medium">Voto en blanco:</strong> es un voto
              válido. No va a ninguna candidatura, pero cuenta para calcular el
              3 %, así que sube el listón.
            </li>
            <li>
              <strong className="font-medium">Voto nulo:</strong> no es válido.
              No cuenta ni para el 3 % ni para el reparto.
            </li>
            <li>
              <strong className="font-medium">Abstención:</strong> no votar no
              computa y no cambia el reparto: los escaños se asignan solo con
              los votos válidos.
            </li>
          </ul>
        </section>

        <section aria-labelledby="real" className="mt-16 text-lg [&>*+*]:mt-6">
          <div>
            <h2
              id="real"
              className="font-sans text-[clamp(30px,5vw,44px)] leading-[1.08] tracking-[-0.03em]"
            >
              Pruébalo con una provincia real
            </h2>
            <p className="mt-3 text-[15px] text-(--text-secondary)">
              Elecciones generales del 23 de julio de 2023. Origen de los datos:
              Ministerio del Interior.
            </p>
          </div>
          <SelectorProvincia />
        </section>

        <div className="mt-16">
          <Fuentes fuentes={fuentes} />
        </div>
      </main>

      <footer className="p-2">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] px-(--page-gutter) py-12 [background:radial-gradient(80%_70%_at_50%_-12%,#ffe58f_0%,rgba(255,229,143,0)_70%),linear-gradient(180deg,#ffd34d_0%,var(--brand-yellow)_46%,var(--brand-orange)_100%)] md:px-12">
          <p className="text-[15px]">
            Una pieza del squad <span className="font-mono">{ficha.equipo}</span>{" "}
            · Build night
          </p>
          <BotonAviso />
        </div>
      </footer>
    </>
  );
}
