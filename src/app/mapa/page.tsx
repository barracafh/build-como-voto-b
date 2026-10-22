import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BotonAviso } from "@/components/BotonAviso";
import { Fuentes } from "@/components/Fuentes";
import { EscenaHemiciclo } from "@/components/escanos/EscenaHemiciclo";
import { QueSiPasara } from "@/components/escanos/QueSiPasara";
import ficha from "../../../ficha.json";

export const metadata: Metadata = {
  title: `Del hemiciclo a cada provincia · ${ficha.nombre}`,
  description:
    "Cómo quedó el Congreso en 2023, de dónde sale cada escaño y qué habría pasado con otras reglas.",
};

const fuentes = ficha.fuentes.filter(
  (f) =>
    f.url.includes("BOE-A-1985-11672") ||
    f.url === "https://infoelectoral.interior.gob.es/",
);

export default function Mapa() {
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

      <main id="contenido" tabIndex={-1} className="outline-none">
        {/* 1 y 2. El hemiciclo de 2023, que al bajar se deshace en montañas de bolitas por provincia */}
        <div className="mx-auto max-w-(--container-content) px-(--page-gutter)">
          <EscenaHemiciclo />
        </div>

        {/* 3. ¿Y si cambiaran las reglas? */}
        <section
          aria-label="¿Y si cambiaran las reglas?"
          className="mx-auto max-w-(--container-content) px-(--page-gutter) pt-16 pb-20"
        >
          <QueSiPasara />
          <p className="mt-12 max-w-[760px] text-sm text-(--text-secondary)">
            Elecciones generales del 23 de julio de 2023. Origen de los datos: Ministerio del
            Interior. Es un ejercicio de aritmética con los votos oficiales: no es una previsión ni
            una valoración de ningún partido.
          </p>
          <div className="mt-8 max-w-[760px]">
            <Fuentes fuentes={fuentes} />
          </div>
        </section>
      </main>

      <footer className="p-2">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] px-(--page-gutter) py-12 [background:radial-gradient(80%_70%_at_50%_-12%,#ffe58f_0%,rgba(255,229,143,0)_70%),linear-gradient(180deg,#ffd34d_0%,var(--brand-yellow)_46%,var(--brand-orange)_100%)] md:px-12">
          <p className="text-[15px]">
            Una pieza del squad <span className="font-mono">{ficha.equipo}</span> · Build night
          </p>
          <BotonAviso />
        </div>
      </footer>
    </>
  );
}
