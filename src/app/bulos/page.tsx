import type { Metadata } from "next";
import { Fragment } from "react";
import { BookOpen, ChevronDown, CircleX, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BotonAviso } from "@/components/BotonAviso";
import { Fuentes } from "@/components/Fuentes";
import { ficha } from "@/lib/ficha";
import { GuiaVoton } from "@/components/voton/GuiaVoton";
import { VotonApartado } from "@/components/voton/VotonApartado";
import { cierreBulos, guiaBulos, paradasBulos } from "@/components/voton/guias";
import {
  ejemploUmbral,
  fuentesBulos,
  temas,
  type Afirmacion,
} from "@/datos/bulos";

export const metadata: Metadata = {
  title: `Lo que se dice sobre votar · ${ficha.nombre}`,
  description:
    "Voto en blanco, voto nulo, abstención, voto por correo: lo que circula sobre cómo se vota, frente a lo que dice la ley electoral.",
};

const enlace =
  "rounded-sm underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const etiqueta =
  "font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase";
const titular = "text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-0.02em]";

const miles = (n: number) => n.toLocaleString("es-ES");

// Cada afirmación se lee de un vistazo (lo que se dice y la respuesta en una
// frase); el porqué y la fuente se despliegan. <details> nativo: funciona sin
// JavaScript y con teclado.
function Contraste({ a }: { a: Afirmacion }) {
  return (
    <Card render={<article />} className="gap-0 p-0 text-base">
      <details className="group">
        <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 rounded-xl px-5 py-5 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset md:px-6 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-lg leading-[1.35] text-(--text-secondary)">
              «{a.dice}»
            </span>
            <span className="mt-3 flex items-start gap-2 font-medium">
              <CircleX
                aria-hidden="true"
                className="mt-[0.2em] size-4.5 shrink-0 text-brand"
                strokeWidth={1.75}
              />
              <span>
                <span className="sr-only">Lo que dice la ley: </span>
                {a.ley}
              </span>
            </span>
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-sm text-(--text-secondary)">
            <span className="hidden sm:inline sm:group-open:hidden">Por qué</span>
            <span className="hidden sm:group-open:inline">Cerrar</span>
            <ChevronDown
              aria-hidden="true"
              className="size-5 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              strokeWidth={1.75}
            />
          </span>
        </summary>

        <div className="mx-5 border-t border-border pt-4 pb-5 md:mx-6">
          <p>{a.texto}</p>
          {a.matiz && (
            <p className="mt-3 border-l-2 border-brand/60 pl-3 text-[15px] text-(--text-secondary)">
              <span className="font-medium text-foreground">Ojo: </span>
              {a.matiz}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            <a
              href={a.fuente.url}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex min-h-11 items-center gap-1 font-mono text-sm ${enlace}`}
            >
              {a.fuente.nombre} <span aria-hidden="true">↗</span>
            </a>
            {a.verificacion && (
              <a
                href={a.verificacion.url}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex min-h-11 items-center gap-1 text-sm text-(--text-secondary) ${enlace}`}
              >
                También lo verificó {a.verificacion.nombre} (
                {a.verificacion.fecha}) <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </div>
      </details>
    </Card>
  );
}

// El efecto del voto en blanco sobre la barrera del 3 %, con números.
function Umbral() {
  const { validos, blancos, candidatura } = ejemploUmbral;
  const con = Math.round(validos * 0.03);
  const sin = Math.round((validos - blancos) * 0.03);
  return (
    <section aria-labelledby="tema-umbral" className="my-4">
      <VotonApartado className="mb-6" {...guiaBulos.umbral} />
      <Card
        render={<div />}
        className="gap-0 px-6 py-6 text-base ring-0 [background:radial-gradient(120%_90%_at_100%_0%,#ffd34d_0%,rgba(255,211,77,0)_60%),var(--brand-yellow)]"
      >
        <p className="font-mono text-xs tracking-[0.06em] uppercase">
          Ejemplo con datos inventados
        </p>
        <h3
          id="tema-umbral"
          className="mt-2 text-xl leading-[1.3] font-medium"
        >
          Lo que sí hace el voto en blanco: subir la barrera del 3 %
        </h3>
        <p className="mt-2 text-[15px]">
          Una provincia con {miles(validos)} votos válidos, {miles(blancos)} de
          ellos en blanco. Una candidatura saca {miles(candidatura)} votos.
        </p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-background/70 px-4 py-4">
            <dt className="text-[15px]">Barrera contando los blancos</dt>
            <dd className="mt-1 font-heading text-[clamp(28px,3.4vw,40px)] leading-none tabular-nums">
              {miles(con)}
            </dd>
            <dd className="mt-2 text-[15px]">
              {miles(candidatura)} &lt; {miles(con)}: queda fuera del reparto.
            </dd>
          </div>
          <div className="rounded-xl bg-background/40 px-4 py-4">
            <dt className="text-[15px]">Si los blancos no contaran</dt>
            <dd className="mt-1 font-heading text-[clamp(28px,3.4vw,40px)] leading-none tabular-nums">
              {miles(sin)}
            </dd>
            <dd className="mt-2 text-[15px]">
              {miles(candidatura)} ≥ {miles(sin)}: entraría en el reparto.
            </dd>
          </div>
        </dl>
        <a
          href={fuentesBulos[0].url}
          target="_blank"
          rel="noreferrer"
          className={`mt-4 inline-flex min-h-11 items-center gap-1 font-mono text-sm ${enlace}`}
        >
          LOREG, arts. 108.4 y 163.1.a (BOE) <span aria-hidden="true">↗</span>
        </a>
      </Card>
    </section>
  );
}

export default function Bulos() {
  const total = temas.reduce((n, t) => n + t.afirmaciones.length, 0);

  return (
    <>
      <header className="mx-auto flex min-h-20 max-w-(--container-content) flex-wrap items-center justify-between gap-4 px-(--page-gutter) py-4">
        <span className="inline-flex items-center gap-3 text-lg leading-tight font-semibold tracking-tight">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand font-mono text-xl text-white"
          >
            {ficha.icono}
          </span>
          {ficha.nombre}
        </span>
        <Badge variant="outline">Fuente: LOREG, JEC e Interior</Badge>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-[960px] px-(--page-gutter) pt-12 pb-20 outline-none md:pt-20"
      >
        <div className="max-w-[760px]">
          <p className={etiqueta}>
            Elecciones generales · 29 de noviembre de 2026
          </p>
          <h1 className="mt-4 text-[clamp(36px,5.5vw,64px)] leading-[1.05] tracking-[-0.02em]">
            Lo que se dice sobre votar, frente a lo que dice la ley
          </h1>
          <p className="mt-6 text-lg text-(--text-secondary)">
            ¿Te han dicho que el voto en blanco va al que gana? ¿Que puedes
            votar con una fotocopia del DNI? Aquí tienes {total} cosas que se
            oyen sobre votar, con la respuesta en una frase. Toca cualquiera
            para ver el porqué y el artículo de la ley.
          </p>
          <VotonApartado className="mt-8" {...paradasBulos[0]} />
        </div>

        <nav aria-label="Temas" className="mt-10 flex flex-wrap gap-2">
          {temas.map((t) => (
            <a
              key={t.id}
              href={`#tema-${t.id}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-muted px-4 text-[15px] outline-none transition-colors hover:bg-(--surface) focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {t.titulo}
              <span className="font-mono text-xs text-(--text-secondary) tabular-nums">
                {t.afirmaciones.length}
              </span>
            </a>
          ))}
        </nav>

        <div className="mt-16 grid gap-20">
          {temas.map((tema) => (
            <section
              key={tema.id}
              aria-labelledby={`tema-${tema.id}`}
              className="scroll-mt-6"
            >
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-4">
                <h2 id={`tema-${tema.id}`} className={titular}>
                  {tema.titulo}
                </h2>
              </div>
              {guiaBulos[tema.id] && (
                <VotonApartado className="mt-6" {...guiaBulos[tema.id]} />
              )}
              <div className="mt-6 grid gap-4">
                {tema.afirmaciones.map((a, i) => (
                  <Fragment key={a.id}>
                    <Contraste a={a} />
                    {tema.id === "blanco" && i === 1 && <Umbral />}
                  </Fragment>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section
          aria-labelledby="como-leer"
          className="mt-20 grid gap-3 md:grid-cols-2"
        >
          <h2 id="como-leer" className="sr-only">
            Cómo leer esta página
          </h2>
          <Card className="gap-2 bg-muted px-6 py-6 text-[15px] ring-0">
            <p className="flex items-center gap-2 font-medium">
              <Scale
                aria-hidden="true"
                className="size-4 text-brand"
                strokeWidth={1.75}
              />
              Comparamos, no juzgamos
            </p>
            <p className="text-(--text-secondary)">
              Cada afirmación se contrasta con la ley o la fuente oficial que
              la contradice, enlazada. No valoramos a quien la difunde ni sus
              intenciones.
            </p>
          </Card>
          <Card className="gap-2 bg-muted px-6 py-6 text-[15px] ring-0">
            <p className="flex items-center gap-2 font-medium">
              <BookOpen
                aria-hidden="true"
                className="size-4 text-brand"
                strokeWidth={1.75}
              />
              Solo cómo se vota
            </p>
            <p className="text-(--text-secondary)">
              Aquí no entran candidaturas, programas, encuestas ni datos
              económicos. Si te llega algo así, consulta a un verificador
              profesional.
            </p>
          </Card>
        </section>

        <VotonApartado id="voton-cierre" className="mt-16" {...cierreBulos} />

        <div className="mt-16 max-w-[760px]">
          <Fuentes fuentes={fuentesBulos} />
          <p className="mt-4 text-sm text-(--text-secondary)">
            Herramienta experimental, sin relación con ninguna Administración.
          </p>
        </div>
      </main>

      <GuiaVoton paradas={paradasBulos} />

      <footer className="p-2">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] px-(--page-gutter) py-12 [background:radial-gradient(80%_70%_at_50%_-12%,#ffe58f_0%,rgba(255,229,143,0)_70%),linear-gradient(180deg,#ffd34d_0%,var(--brand-yellow)_46%,var(--brand-orange)_100%)] md:px-12">
          <p className="text-[15px]">
            Una pieza del squad{" "}
            <span className="font-mono">{ficha.equipo}</span> · Build night
          </p>
          <BotonAviso />
        </div>
      </footer>
    </>
  );
}
