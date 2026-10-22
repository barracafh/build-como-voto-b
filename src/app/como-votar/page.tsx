import type { Metadata } from "next";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BotonAviso } from "@/components/BotonAviso";
import { FormularioCaso } from "@/components/ComoVotoWizard";
import { Fuentes } from "@/components/Fuentes";
import { ficha } from "@/lib/ficha";
import { GuiaVoton } from "@/components/voton/GuiaVoton";
import { VotonApartado } from "@/components/voton/VotonApartado";
import {
  cierreComoVotar,
  guiaCasos,
  paradasComoVotar,
} from "@/components/voton/guias";
import {
  casos,
  fecha,
  fuentesGuia,
  hitos,
  plazos,
  type Caso,
  type Paso,
} from "@/datos/como-votar";

export const metadata: Metadata = {
  title: `Cómo votar, caso por caso · ${ficha.nombre}`,
  description:
    "Voto presencial, voto por correo, desde el extranjero y ayudas para votar: pasos, plazos y fuente oficial para cada caso.",
};

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

function SeccionCaso({ caso }: { caso: Caso }) {
  const Icon = iconos[caso.icono];
  return (
    <section
      key={caso.id}
      aria-labelledby={`caso-${caso.id}`}
      className="scroll-mt-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-1 grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-brand"
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className={etiqueta}>{caso.quien}</p>
            <h2 id={`caso-${caso.id}`} className={`mt-1 ${titular}`}>
              {caso.pregunta}
            </h2>
          </div>
        </div>
      </div>

      {guiaCasos[caso.id] && (
        <VotonApartado className="mt-5" {...guiaCasos[caso.id]} />
      )}

      <p className="mt-5 max-w-[760px] text-lg">{caso.resumen}</p>

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

      <div className="mt-8 max-w-[760px]">
        <Fuentes fuentes={caso.fuentes} />
      </div>
    </section>
  );
}

export default function ComoVotar() {
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
        <Badge variant="outline">Fuente: JEC, INE, Correos y LOREG</Badge>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-[960px] px-(--page-gutter) pt-12 pb-20 outline-none md:pt-20"
      >
        <div className="max-w-[760px]">
          <p className={etiqueta}>Elecciones generales · 29 de noviembre de 2026</p>
          <h1 className="mt-4 text-[clamp(36px,5.5vw,68px)] leading-[1.05] tracking-[-0.02em]">
            Cómo votar, caso por caso
          </h1>
          <p className="mt-6 text-lg text-(--text-secondary)">
            Elige tu situación: en tu ciudad, fuera de ella, en el extranjero o
            con necesidad de apoyo. Cada paso lleva su fecha del calendario
            oficial y la fuente que la sostiene.
          </p>

          <div className="mt-8 max-w-[560px]">
            <FormularioCaso />
          </div>
          <VotonApartado className="mt-8" {...paradasComoVotar[0]} />
        </div>

        {/* Fechas que ordenan todo el proceso. Una sola tarjeta con el sol. */}
        <section aria-labelledby="fechas" className="mt-14">
          <h2 id="fechas" className="sr-only">
            Fechas clave
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <Card
              render={<section />}
              className="gap-2 px-6 py-6 text-base ring-0 [background:radial-gradient(120%_90%_at_100%_0%,#ffd34d_0%,rgba(255,211,77,0)_60%),var(--brand-yellow)]"
            >
              <p className={etiqueta}>Solicitud del voto por correo</p>
              <p className="font-heading text-[clamp(28px,3.4vw,40px)] leading-none">
                Hasta el {fecha(plazos.correoSolicitud.fin)}
              </p>
              <p className="text-[15px]">
                Residentes en España. La documentación llega del{" "}
                {fecha("2026-11-09")} al {fecha("2026-11-22")}.
              </p>
            </Card>
            <Card
              render={<section />}
              className="gap-2 bg-muted px-6 py-6 text-base ring-0"
            >
              <p className={etiqueta}>Envío del voto por correo</p>
              <p className="font-heading text-[clamp(28px,3.4vw,40px)] leading-none">
                Hasta el {fecha(plazos.correoRemision.fin)}
              </p>
              <p className="text-[15px] text-(--text-secondary)">
                Por correo certificado, sin franqueo, en cualquier oficina de
                Correos.
              </p>
            </Card>
            <Card
              render={<section />}
              className="gap-2 bg-muted px-6 py-6 text-base ring-0"
            >
              <p className={etiqueta}>Jornada de votación</p>
              <p className="font-heading text-[clamp(28px,3.4vw,40px)] leading-none">
                {fecha("2026-11-29")} · 9–20 h
              </p>
              <p className="text-[15px] text-(--text-secondary)">
                En tu mesa, con DNI, pasaporte o permiso de conducir original.
              </p>
            </Card>
          </div>
        </section>

        {/* Índice de casos */}
        <nav aria-label="Casos" className="mt-8 grid gap-3 md:grid-cols-2">
          {casos.map((caso) => {
            const Icon = iconos[caso.icono];
            return (
              <Card
                key={caso.id}
                render={<div />}
                className="gap-0 px-5 py-4 text-base ring-0 bg-muted transition-colors hover:bg-(--surface)"
              >
                <a
                  href={`#caso-${caso.id}`}
                  className="flex items-start gap-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-lg"
                >
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
                </a>
              </Card>
            );
          })}
        </nav>

        <div className="mt-20 grid gap-20 [&>*+*]:mt-0">
          {casos.map((caso) => (
            <SeccionCaso key={caso.id} caso={caso} />
          ))}
        </div>

        {/* Todo el calendario, del JSON oficial */}
        <section aria-labelledby="calendario" className="mt-20">
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

        <VotonApartado id="voton-cierre" className="mt-16" {...cierreComoVotar} />

        <div className="mt-16 max-w-[760px]">
          <Fuentes fuentes={fuentesGuia} />
          <p className="mt-4 text-sm text-(--text-secondary)">
            Origen de los datos: Ministerio del Interior. Herramienta
            experimental, sin relación con ninguna Administración.
          </p>
        </div>
      </main>

      <GuiaVoton paradas={paradasComoVotar} />

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
