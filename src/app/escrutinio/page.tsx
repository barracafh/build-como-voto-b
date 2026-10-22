import type { Metadata } from "next";
import { Fragment } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calculator,
  CircleHelp,
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
  Vote,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BotonAviso } from "@/components/BotonAviso";
import { Fuentes } from "@/components/Fuentes";
import {
  Sobre,
  VotoBlanco,
  VotoNulo,
  VotoValido,
} from "@/components/escrutinio/Dibujos";
import {
  calendario,
  fases,
  fuenteSobres,
  fuentesEscrutinio,
  provisional,
  sobres,
  tiposDeVoto,
  type Icono,
  type Paso,
} from "@/datos/escrutinio";
import ficha from "../../../ficha.json";
import { GuiaVoton } from "@/components/voton/GuiaVoton";
import { VotonApartado } from "@/components/voton/VotonApartado";
import {
  cierreEscrutinio,
  guiaEscrutinio,
  paradasEscrutinio,
} from "@/components/voton/guias";

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

const dibujosVoto = [VotoValido, VotoBlanco, VotoNulo];

const enlace =
  "rounded-sm underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
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
        <Badge variant="outline">Fuente: LOREG, JEC e Interior</Badge>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-[960px] px-(--page-gutter) pt-10 pb-20 outline-none md:pt-16"
      >
        {/* Portada */}
        <div className="max-w-[760px]">
          <div>
            <p className={etiqueta}>
              Elecciones generales · 29 de noviembre de 2026
            </p>
            <h1 className="mt-4 text-[clamp(36px,5.5vw,64px)] leading-[1.05] tracking-[-0.02em]">
              ¿Qué pasa con tu voto cuando cierra el colegio?
            </h1>
            <p className="mt-6 text-lg text-(--text-secondary)">
              Del recuento en la mesa a los resultados oficiales en el BOE.
            </p>
            <VotonApartado className="mt-8" {...paradasEscrutinio[0]} />
          </div>
        </div>

        <Calendario />

        {/* Paso a paso */}
        <div className="mt-20 [&>*+*]:mt-16">
          {fases.map((fase, f) => (
            <Fragment key={fase.titulo}>
              <section aria-labelledby={`fase-${f}`}>
                <div className="flex items-end justify-between gap-x-6 border-b border-border pb-4">
                  <div>
                    <p className={etiqueta}>
                      Fase {f + 1} de {fases.length}
                    </p>
                    <h2 id={`fase-${f}`} className={`mt-2 ${titular}`}>
                      {fase.titulo}
                    </h2>
                  </div>
                  <p className="shrink-0 font-heading text-[clamp(28px,4vw,40px)] leading-none text-brand">
                    {fase.etiqueta}
                  </p>
                </div>

                {guiaEscrutinio.fases[f] && (
                  <VotonApartado className="mt-6" {...guiaEscrutinio.fases[f]} />
                )}

                <ol className="relative mt-8 grid gap-4">
                  <span
                    aria-hidden="true"
                    className="absolute top-5 bottom-5 left-4 w-px bg-border md:left-5"
                  />
                  {fase.pasos.map((paso) => {
                    n += 1;
                    return (
                      <li
                        key={paso.titulo}
                        className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 md:grid-cols-[40px_minmax(0,1fr)] md:gap-x-6"
                      >
                        <span className="z-10 grid size-8 place-items-center rounded-full bg-background text-base font-light text-brand tabular-nums ring-1 ring-border md:size-10 md:text-lg">
                          {n}
                        </span>
                        {paso.icono === "sobre" ? (
                          <TresSobres paso={paso} />
                        ) : (
                          <PasoTarjeta
                            paso={paso}
                            enlaceTexto={`${paso.articulo} LOREG en el BOE`}
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>

              </section>
              {f === 0 && <Provisionales />}
            </Fragment>
          ))}
        </div>

        {/* Tipos de voto */}
        <section aria-labelledby="tipos" className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-4">
            <h2 id="tipos" className={titular}>
              Cómo se clasifica cada voto
            </h2>
            <a
              href={fuentesEscrutinio[1].url}
              className={`font-mono text-xs text-(--text-secondary) ${enlace}`}
            >
              Art. 96 LOREG
            </a>
          </div>
          <VotonApartado className="mt-6" {...guiaEscrutinio.tipos} />
          <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            {tiposDeVoto.map((t, i) => {
              const Dibujo = dibujosVoto[i];
              return (
                <Card
                  key={t.titulo}
                  render={<section />}
                  className="gap-3 bg-muted px-6 py-6 text-base ring-0"
                >
                  <Dibujo className="h-24 w-auto self-start text-foreground" />
                  <h3 className="text-lg font-medium">{t.titulo}</h3>
                  <p className="text-(--text-secondary)">{t.texto}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <VotonApartado
          id="voton-cierre"
          className="mt-16"
          {...cierreEscrutinio}
        />

        <div className="mt-16 max-w-[760px]">
          <Fuentes fuentes={fuentesEscrutinio} />
        </div>
      </main>

      <GuiaVoton paradas={paradasEscrutinio} />

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

// Del 29 de noviembre al BOE, día a día.
function Calendario() {
  return (
    <section aria-labelledby="calendario" className="mt-16">
      <p className={etiqueta}>Día a día</p>
      <h2 id="calendario" className={`mt-2 ${titular}`}>
        Del 29 de noviembre al BOE
      </h2>
      <VotonApartado className="mt-6" {...guiaEscrutinio.calendario} />
      <ol className="relative mt-8 grid gap-5 md:grid-cols-7 md:gap-3">
        <span
          aria-hidden="true"
          className="absolute top-2 bottom-2 left-[7px] w-0.5 bg-border md:top-[7px] md:right-0 md:bottom-auto md:left-0 md:h-0.5 md:w-auto"
        />
        {calendario.map((c, i) => (
          <li
            key={c.titulo}
            className="relative grid grid-cols-[16px_minmax(0,1fr)] content-start gap-x-4 md:grid-cols-1 md:gap-y-4"
          >
            <span
              aria-hidden="true"
              className={`z-10 mt-2 size-4 rounded-full ring-4 ring-background md:mt-0 ${
                i === calendario.length - 1
                  ? "bg-foreground"
                  : i === 0
                    ? "bg-brand"
                    : "border-2 border-foreground bg-background"
              }`}
            />
            <div className="min-w-0">
              <p className="font-heading text-[28px] leading-none whitespace-nowrap md:text-[30px]">
                {c.cuando}
              </p>
              <p className="mt-2 leading-tight font-medium">{c.titulo}</p>
              <a
                href={c.url}
                className={`mt-1 inline-block font-mono text-xs text-(--text-secondary) ${enlace}`}
              >
                {c.fuente}
              </a>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Paso 6: los tres sobres de cada mesa y adónde va cada uno.
function TresSobres({ paso }: { paso: Paso }) {
  return (
    <Card className="gap-0 py-0 text-base">
      <div className="px-4 pt-4 md:px-5 md:pt-5">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-start gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs leading-tight font-medium">
            <Clock aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2} />
            {paso.cuando}
          </span>
          <a
            href={fuenteSobres.url}
            className={`font-mono text-xs text-(--text-secondary) uppercase ${enlace}`}
          >
            {paso.articulo}
          </a>
        </span>
        <p className="mt-2 text-lg leading-[1.35] font-medium">{paso.titulo}</p>
      </div>
      <ol className="mt-3 grid divide-y divide-border border-t border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {sobres.map((s) => (
          <li key={s.n} className="flex flex-col gap-2 px-4 py-4 md:px-5">
            <Sobre n={s.n} className="h-14 w-auto self-start text-foreground" />
            <p className="flex items-center gap-1.5 font-medium">
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-brand" />
              {s.destino}
            </p>
            <p className="text-sm text-(--text-secondary)">{s.nota}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function PasoTarjeta({
  paso,
  enlaceTexto,
}: {
  paso: Paso;
  enlaceTexto: string;
}) {
  const Icon = iconos[paso.icono];
  return (
    <Card className="gap-0 px-4 py-4 text-base transition-colors has-[details[open]]:ring-foreground/25 motion-safe:duration-200 md:px-5 md:py-5">
      <details className="group">
        <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {paso.cuando && (
                <span className="inline-flex items-start gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs leading-tight font-medium">
                  <Clock aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2} />
                  {paso.cuando}
                </span>
              )}
              <span className="font-mono text-xs text-(--text-secondary) uppercase">
                {paso.articulo}
              </span>
            </span>
            <span className="mt-2 flex items-start gap-x-2.5">
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
            className="grid size-8 place-items-center self-center rounded-full bg-muted text-lg leading-none group-open:rotate-45 motion-safe:transition-transform"
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
            {enlaceTexto} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </details>
    </Card>
  );
}

// La noche electoral: de la copia del acta a la difusión, en cuatro pasos.
function Provisionales() {
  return (
    <section
      aria-labelledby="provisionales"
      className="rounded-2xl bg-muted px-4 py-8 md:px-10 md:py-10"
    >
      <p className={etiqueta}>29 nov · desde las 20:00 · en paralelo</p>
      <h2 id="provisionales" className={`mt-2 ${titular}`}>
        Esa noche: resultados provisionales
      </h2>
      <p className="mt-3 max-w-[640px] text-lg text-(--text-secondary)">
        Informan, pero no valen como resultado oficial.
      </p>
      <VotonApartado className="mt-6" {...guiaEscrutinio.provisional} />

      <ol className="mt-8 grid gap-2 md:grid-cols-4 md:gap-3">
        {provisional.flujo.map((p, i) => {
          const Icon = iconos[p.icono];
          return (
            <li key={p.titulo} className="relative">
              <div className="flex items-start gap-3 rounded-xl bg-background px-4 py-4 ring-1 ring-border md:h-full md:flex-col">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-brand">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block leading-tight font-medium">{p.titulo}</span>
                  <span className="mt-1 block text-[15px] text-(--text-secondary)">
                    {p.texto}
                  </span>
                  <a
                    href={p.url}
                    className={`mt-1 inline-block font-mono text-xs text-(--text-secondary) ${enlace}`}
                  >
                    {p.fuente}
                  </a>
                </span>
              </div>
              {i < provisional.flujo.length - 1 && (
                <ArrowRight
                  aria-hidden="true"
                  className="mx-auto my-1 size-4 rotate-90 text-(--text-secondary) md:absolute md:top-1/2 md:-right-3 md:z-10 md:my-0 md:-translate-y-1/2 md:rotate-0 md:rounded-full md:bg-muted"
                />
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-6 flex flex-wrap items-center gap-2 text-[15px]">
        <span className="font-medium">El resultado oficial añade:</span>
        {provisional.diferencias.map((d) => (
          <Popover key={d.titulo}>
            <PopoverTrigger
              openOnHover
              delay={100}
              className="inline-flex min-h-9 cursor-help items-center gap-1 rounded-full bg-background px-3 py-1 ring-1 ring-border outline-none hover:ring-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:ring-foreground/40"
            >
              <span aria-hidden="true" className="text-brand">
                +
              </span>
              {d.titulo}
              <CircleHelp
                aria-hidden="true"
                className="size-3.5 text-(--text-secondary)"
                strokeWidth={2}
              />
            </PopoverTrigger>
            <PopoverContent
              side="top"
              className="w-[min(18rem,calc(100vw-32px))] gap-2 p-4 text-[15px]"
            >
              <PopoverTitle className="font-sans text-base">{d.titulo}</PopoverTitle>
              <PopoverDescription className="text-(--text-secondary)">
                {d.texto}
              </PopoverDescription>
              <a
                href={d.url}
                className={`font-mono text-xs text-(--text-secondary) ${enlace}`}
              >
                {d.fuente} <span aria-hidden="true">↗</span>
              </a>
            </PopoverContent>
          </Popover>
        ))}
        <a
          href={provisional.fuenteDiferencias}
          className={`font-mono text-xs text-(--text-secondary) ${enlace}`}
        >
          Interior
        </a>
      </p>

      <p className="mt-6 flex gap-2 text-sm text-(--text-secondary)">
        <CircleHelp aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
        <span>
          Las fuentes oficiales no dicen si interviene alguna empresa. Consulta
          los contratos de Interior en la{" "}
          <a href="https://contrataciondelestado.es/" className={enlace}>
            Plataforma de Contratación del Sector Público
          </a>
          .
        </span>
      </p>
    </section>
  );
}
