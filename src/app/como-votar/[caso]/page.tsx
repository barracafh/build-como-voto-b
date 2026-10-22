import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Accessibility,
  Clock3,
  Globe,
  IdCard,
  Mail,
  Plane,
  Stamp,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Fuentes } from "@/components/Fuentes";
import { ficha } from "@/lib/ficha";
import { GuiaVoton } from "@/components/voton/GuiaVoton";
import { VotonApartado } from "@/components/voton/VotonApartado";
import { cierreComoVotar, paradasCaso } from "@/components/voton/guias";
import {
  casos,
  fecha,
  fuentesGuia,
  hitos,
  plazos,
  type Caso,
  type Paso,
} from "@/datos/como-votar";

type IconoCaso = Caso["icono"];

const iconos: Record<IconoCaso, LucideIcon> = {
  urna: Vote,
  correo: Mail,
  mundo: Globe,
  maleta: Plane,
  braille: Accessibility,
  sobre: IdCard,
};

// Hoy en España, en ISO, para saber si un plazo sigue abierto.
const hoyIso = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(
    new Date(),
  );

const enlace =
  "underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm";
const etiqueta =
  "font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase";
const titular = "text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-0.02em]";

export function generateStaticParams() {
  return casos.map((caso) => ({ caso: caso.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/como-votar/[caso]">): Promise<Metadata> {
  const { caso: id } = await params;
  const caso = casos.find((c) => c.id === id);
  if (!caso) return {};
  return {
    title: `${caso.pregunta} · ${ficha.nombre}`,
    description: caso.resumen,
  };
}

export default async function PaginaCaso({
  params,
}: PageProps<"/como-votar/[caso]">) {
  const { caso: id } = await params;
  const caso = casos.find((c) => c.id === id);
  if (!caso) notFound();

  const Icon = iconos[caso.icono];
  const indice = casos.findIndex((c) => c.id === caso.id);
  const anterior = casos[indice - 1];
  const siguiente = casos[indice + 1];

  return (
    <>
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-[960px] px-(--page-gutter) pt-12 pb-20 outline-none md:pt-20"
      >
        <nav aria-label="Miga de pan" className="max-w-[760px]">
          <Link
            href="/como-votar"
            className={`font-mono text-xs text-(--text-secondary) ${enlace}`}
          >
            ← Cómo votar, caso por caso
          </Link>
        </nav>

        <div className="max-w-[760px]">
          <p className={`${etiqueta} mt-8`}>{caso.quien}</p>
          <div className="mt-4 flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-1 grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-brand"
            >
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <h1 className="text-[clamp(36px,5.5vw,68px)] leading-[1.05] tracking-[-0.02em]">
              {caso.pregunta}
            </h1>
          </div>
          <p className="mt-6 text-lg">{caso.resumen}</p>
          <VotonApartado className="mt-8" {...paradasCaso(caso.id)[0]} />
        </div>

        <PasoLista pasos={caso.pasos} />

        {caso.aviso && (
          <Card
            render={<aside />}
            className="mt-6 gap-0 px-5 py-4 text-[15px] ring-0 [background:radial-gradient(120%_90%_at_100%_0%,#ffd34d_0%,rgba(255,211,77,0)_60%),var(--brand-yellow)]"
          >
            <p className="flex items-start gap-2">
              <Stamp
                aria-hidden="true"
                className="mt-[0.2em] size-4 shrink-0"
                strokeWidth={1.75}
              />
              {caso.aviso}
            </p>
          </Card>
        )}

        {/* El calendario completo, para situar los plazos de este caso. */}
        <section aria-labelledby="calendario" className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-4">
            <h2 id="calendario" className={titular}>
              El calendario completo
            </h2>
            <a
              href={fuentesGuia[0].url}
              className={`font-mono text-xs text-(--text-secondary) ${enlace}`}
            >
              Calendario de la JEC (PDF) ↗
            </a>
          </div>
          <ul className="mt-6 grid gap-px overflow-hidden rounded-xl ring-1 ring-border">
            {[
              hitos.convocatoria,
              hitos.correoSolicitud,
              hitos.ceraEnvioDoc,
              hitos.ertaSolicitud,
              hitos.braille,
              hitos.correoEnvioDoc,
              hitos.ertaEnvioDoc,
              hitos.ceraPapeletasDescarga,
              hitos.ceraEnvioPapeletas,
              hitos.ceraCorreo,
              hitos.ertaRemision,
              hitos.correoRemision,
              hitos.campana,
              hitos.ceraUrna,
              hitos.reflexion,
              hitos.votacion,
            ].map((hito) => (
              <li
                key={hito.evento}
                className="grid gap-x-6 gap-y-1 bg-background px-5 py-4 text-[15px] md:grid-cols-[minmax(0,180px)_minmax(0,1fr)]"
              >
                <span className="font-mono text-sm tabular-nums">
                  {hito.fechas}
                </span>
                <span>{hito.evento}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Siguiente y anterior: leer los casos en orden, sin volver al índice. */}
        <nav aria-label="Otros casos" className="mt-16 grid gap-3 md:grid-cols-2">
          {anterior && <TarjetaCaso caso={anterior} rotulo="Anterior" />}
          {siguiente && <TarjetaCaso caso={siguiente} rotulo="Siguiente" />}
        </nav>

        <VotonApartado id="voton-cierre" className="mt-16" {...cierreComoVotar} />

        <div className="mt-16 max-w-[760px]">
          <Fuentes fuentes={caso.fuentes} />
          <p className="mt-4 text-sm text-(--text-secondary)">
            Origen de los datos: Ministerio del Interior. Herramienta
            experimental, sin relación con ninguna Administración.
          </p>
        </div>
      </main>

      <GuiaVoton paradas={paradasCaso(caso.id)} />
    </>
  );
}

function TarjetaCaso({ caso, rotulo }: { caso: Caso; rotulo: string }) {
  const Icon = iconos[caso.icono];
  return (
    <Link
      href={`/como-votar/${caso.id}`}
      className="group outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-2xl"
    >
      <Card
        render={<div />}
        className="gap-0 px-5 py-4 text-base ring-0 bg-muted transition-colors group-hover:bg-(--surface)"
      >
        <p className={etiqueta}>{rotulo}</p>
        <span className="mt-1 flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-background text-brand ring-1 ring-border"
          >
            <Icon className="size-4.5" strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            <span className="block font-medium">{caso.pregunta}</span>
            <span className="mt-0.5 block text-[15px] text-(--text-secondary)">
              {caso.quien}
            </span>
          </span>
        </span>
      </Card>
    </Link>
  );
}

function EstadoPlazo({ paso }: { paso: Paso }) {
  if (!paso.plazo) return null;
  const fin = plazos[paso.plazo].fin;
  const abierto = hoyIso() <= fin;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs ${
        abierto
          ? "bg-muted text-(--text-secondary)"
          : "bg-(--brand-yellow)/25"
      }`}
    >
      <Clock3 aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
      {abierto
        ? `Plazo abierto hasta el ${fecha(fin)}`
        : `Cerró el ${fecha(fin)}`}
    </span>
  );
}

function PasoLista({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="relative mt-8 grid gap-4">
      <span
        aria-hidden="true"
        className="absolute top-5 bottom-5 left-4 w-px bg-border md:left-5"
      />
      {pasos.map((paso, i) => (
        <li
          key={paso.titulo}
          className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 md:grid-cols-[40px_minmax(0,1fr)] md:gap-x-6"
        >
          <span className="z-10 grid size-8 place-items-center rounded-full bg-background text-base font-light text-brand tabular-nums ring-1 ring-border md:size-10 md:text-lg">
            {i + 1}
          </span>
          <Card className="gap-0 px-4 py-4 text-base md:px-5 md:py-5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h3 className="text-lg leading-[1.35] font-medium">
                {paso.titulo}
              </h3>
              <EstadoPlazo paso={paso} />
            </div>
            <p className="mt-1.5 text-(--text-secondary)">{paso.texto}</p>
            {paso.nota && (
              <p className="mt-2 border-l-2 border-brand/60 pl-3 text-[15px] text-(--text-secondary)">
                {paso.nota}
              </p>
            )}
            {paso.fuente && (
              <a
                href={paso.fuente.url}
                target="_blank"
                rel="noreferrer"
                className={`mt-3 inline-flex min-h-11 items-center gap-1 font-mono text-sm ${enlace}`}
              >
                {paso.fuente.nombre} <span aria-hidden="true">↗</span>
              </a>
            )}
          </Card>
        </li>
      ))}
    </ol>
  );
}
