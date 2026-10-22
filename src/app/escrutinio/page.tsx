import type { Metadata } from "next";
import {
  Award,
  BookOpen,
  Calculator,
  CircleCheck,
  CircleX,
  Clock,
  Eye,
  FileText,
  Globe,
  Landmark,
  ListChecks,
  Mail,
  PenLine,
  Scale,
  ShieldCheck,
  Square,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BotonAviso } from "@/components/BotonAviso";
import { Fuentes } from "@/components/Fuentes";
import {
  cifras,
  fases,
  fuentesEscrutinio,
  recorrido,
  tiposDeVoto,
  type Icono,
} from "@/datos/escrutinio";
import ficha from "../../../ficha.json";

export const metadata: Metadata = {
  title: `¿Qué pasa con tu voto al cerrar el colegio? · ${ficha.nombre}`,
};

const iconos: Record<Icono, LucideIcon> = {
  reloj: Clock,
  ojo: Eye,
  lista: ListChecks,
  acta: FileText,
  firma: PenLine,
  sobre: Mail,
  mundo: Globe,
  suma: Calculator,
  escudo: ShieldCheck,
  balanza: Scale,
  premio: Award,
  boe: BookOpen,
  urna: Vote,
  junta: Landmark,
};

const iconosVoto = [CircleCheck, Square, CircleX];

const enlace =
  "underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm";
const etiqueta =
  "font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase";
const titular = "text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-0.02em]";

export default function Escrutinio() {
  let n = 0;

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
        <Badge variant="outline">Fuente: LOREG y JEC</Badge>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-[960px] px-(--page-gutter) pt-12 pb-20 outline-none md:pt-20"
      >
        {/* Portada */}
        <div className="max-w-[760px]">
          <p className={etiqueta}>Elecciones generales · 29 de noviembre de 2026</p>
          <h1 className="mt-4 text-[clamp(36px,5.5vw,68px)] leading-[1.05] tracking-[-0.02em]">
            ¿Qué pasa con tu voto cuando cierra el colegio?
          </h1>
          <p className="mt-6 text-lg text-(--text-secondary)">
            Del recuento en la mesa a los resultados oficiales en el BOE, paso a
            paso y con el artículo de la ley que lo regula.
          </p>
        </div>

        {/* El recorrido de un voto */}
        <section aria-labelledby="recorrido" className="mt-16">
          <h2 id="recorrido" className="sr-only">
            El recorrido de tu voto
          </h2>
          <ol className="relative grid gap-6 md:grid-cols-5 md:gap-4">
            {/* Línea que une las estaciones */}
            <span
              aria-hidden="true"
              className="absolute top-7 bottom-7 left-7 w-px bg-border md:top-7 md:right-[10%] md:bottom-auto md:left-[10%] md:h-px md:w-auto"
            />
            {recorrido.map((r, i) => {
              const Icon = iconos[r.icono];
              return (
                <li
                  key={r.titulo}
                  className="relative grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 md:grid-cols-1 md:justify-items-center md:gap-y-3 md:text-center"
                >
                  <span
                    className={`grid size-14 place-items-center rounded-full ring-1 ring-border ${
                      i === recorrido.length - 1
                        ? "bg-foreground text-background ring-foreground"
                        : "bg-background text-brand"
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block ${etiqueta}`}>{r.cuando}</span>
                    <span className="mt-1 block text-lg leading-tight font-medium">
                      {r.titulo}
                    </span>
                    <span className="mt-1 block text-[15px] text-(--text-secondary)">
                      {r.texto}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Provisional frente a oficial. Una sola tarjeta con el sol. */}
        <section
          aria-labelledby="provisional"
          className="mt-16 grid gap-3 md:grid-cols-2"
        >
          <h2 id="provisional" className="sr-only">
            Resultados provisionales y oficiales
          </h2>
          <Card
            render={<div />}
            className="gap-3 px-6 py-7 text-base ring-0 [background:radial-gradient(120%_90%_at_100%_0%,#ffd34d_0%,rgba(255,211,77,0)_60%),var(--brand-yellow)]"
          >
            <p className="font-mono text-xs tracking-[0.06em] uppercase">
              La noche del 29 de noviembre
            </p>
            <p className="font-heading text-[clamp(32px,4vw,44px)] leading-none">
              Provisionales
            </p>
            <p>
              El Gobierno los da con una copia del acta de cada mesa, «a los
              solos efectos de facilitar la información provisional».
            </p>
            <a href={fases[0].pasos[3].url} className={`font-mono text-sm ${enlace}`}>
              Art. 98.2 LOREG
            </a>
          </Card>
          <Card
            render={<div />}
            className="gap-3 bg-muted px-6 py-7 text-base ring-0"
          >
            <p className={etiqueta}>Tras el escrutinio general</p>
            <p className="font-heading text-[clamp(32px,4vw,44px)] leading-none">
              Oficiales
            </p>
            <p>
              Los fija cada Junta Electoral sumando las actas, y la Junta
              Electoral Central los publica en el BOE.
            </p>
            <a href={fases[2].pasos[2].url} className={`font-mono text-sm ${enlace}`}>
              Arts. 103 y 108.6 LOREG
            </a>
          </Card>
        </section>

        {/* Cifras que fija la ley */}
        <section aria-labelledby="cifras" className="mt-16">
          <h2 id="cifras" className={titular}>
            En cifras
          </h2>
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border md:grid-cols-5">
            {cifras.map((c, i) => (
              <div
                key={c.texto}
                className={`flex flex-col gap-2 bg-background px-5 py-6 ${
                  i === cifras.length - 1 ? "col-span-2 md:col-span-1" : ""
                }`}
              >
                <dt className="order-2 text-[15px] leading-snug">{c.texto}</dt>
                <dd className="order-1 font-heading text-[clamp(40px,5vw,56px)] leading-none tabular-nums">
                  {c.valor}
                </dd>
                <dd className="order-3 mt-auto">
                  <a href={c.url} className={`font-mono text-xs text-(--text-secondary) ${enlace}`}>
                    {c.articulo}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Paso a paso */}
        <div className="mt-20 [&>*+*]:mt-16">
          {fases.map((fase, f) => (
            <section key={fase.titulo} aria-labelledby={`fase-${f}`}>
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-4">
                <div>
                  <p className={etiqueta}>Fase {f + 1} de {fases.length}</p>
                  <h2 id={`fase-${f}`} className={`mt-2 ${titular}`}>
                    {fase.titulo}
                  </h2>
                </div>
                <p className="font-mono text-sm">
                  <span className="rounded-full bg-muted px-3 py-1">
                    {fase.etiqueta}
                  </span>{" "}
                  <a href={fase.fuente.url} className={`text-xs text-(--text-secondary) ${enlace}`}>
                    {fase.fuente.nombre}
                  </a>
                </p>
              </div>

              <ol className="relative mt-8 grid gap-4">
                <span
                  aria-hidden="true"
                  className="absolute top-5 bottom-5 left-4 w-px bg-border md:left-5"
                />
                {fase.pasos.map((paso) => {
                  n += 1;
                  const Icon = iconos[paso.icono];
                  return (
                    <li
                      key={paso.titulo}
                      className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 md:grid-cols-[40px_minmax(0,1fr)] md:gap-x-6"
                    >
                      <span className="z-10 grid size-8 place-items-center rounded-full bg-background text-base md:size-10 md:text-lg font-light text-brand tabular-nums ring-1 ring-border">
                        {n}
                      </span>
                      <Card className="gap-0 px-4 py-4 text-base md:px-5 md:py-5 transition-colors motion-safe:duration-200 has-[details[open]]:ring-foreground/25">
                        <details className="group">
                          <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                            <span className="min-w-0">
                              <span className="block font-mono text-xs text-(--text-secondary) uppercase">
                                {paso.articulo}
                              </span>
                              <span className="mt-1 flex items-start gap-x-2.5">
                                <Icon
                                  aria-hidden="true"
                                  className="mt-[0.2em] size-5 shrink-0 text-brand"
                                  strokeWidth={1.75}
                                />
                                <span className="text-lg leading-[1.35] font-medium">
                                  {paso.titulo}
                                </span>
                              </span>
                              <span className="mt-1.5 block text-(--text-secondary)">
                                {paso.resumen}
                              </span>
                            </span>
                            <span
                              aria-hidden="true"
                              className="grid size-8 place-items-center self-center rounded-full bg-muted text-lg leading-none motion-safe:transition-transform group-open:rotate-45"
                            >
                              +
                            </span>
                            <span className="sr-only">Ver detalle</span>
                          </summary>
                          <div className="mt-4 border-t border-border pt-4">
                            <ul className="grid gap-2.5">
                              {paso.detalle.map((d) => (
                                <li
                                  key={d}
                                  className="grid grid-cols-[12px_minmax(0,1fr)] gap-x-3"
                                >
                                  <span
                                    aria-hidden="true"
                                    className="mt-[0.6em] size-1.5 rounded-full bg-foreground/40"
                                  />
                                  <span>{d}</span>
                                </li>
                              ))}
                            </ul>
                            <a
                              href={paso.url}
                              className={`mt-3 inline-flex min-h-11 items-center gap-1 font-mono text-sm ${enlace}`}
                            >
                              {paso.articulo} LOREG en el BOE{" "}
                              <span aria-hidden="true">↗</span>
                            </a>
                          </div>
                        </details>
                      </Card>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>

        {/* Tipos de voto */}
        <section aria-labelledby="tipos" className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-4">
            <h2 id="tipos" className={titular}>
              Cómo se clasifica cada voto
            </h2>
            <a href={fuentesEscrutinio[1].url} className={`font-mono text-xs text-(--text-secondary) ${enlace}`}>
              Art. 96 LOREG
            </a>
          </div>
          <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            {tiposDeVoto.map((t, i) => {
              const Icon = iconosVoto[i];
              return (
                <Card
                  key={t.titulo}
                  render={<section />}
                  className="gap-3 bg-muted px-6 py-6 text-base ring-0"
                >
                  <Icon aria-hidden="true" className="size-7 text-brand" strokeWidth={1.5} />
                  <h3 className="text-lg font-medium">{t.titulo}</h3>
                  <p className="text-(--text-secondary)">{t.texto}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <div className="mt-16 max-w-[760px]">
          <Fuentes fuentes={fuentesEscrutinio} />
        </div>
      </main>

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
