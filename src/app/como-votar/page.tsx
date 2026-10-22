import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Fuentes } from "@/components/Fuentes";
import { ficha } from "@/lib/ficha";
import { iconosCaso, rutaCaso } from "@/lib/iconos-casos";
import { GuiaVoton } from "@/components/voton/GuiaVoton";
import { VotonApartado } from "@/components/voton/VotonApartado";
import { cierreComoVotar, paradasIndice } from "@/components/voton/guias";
import { casos, fecha, fuentesGuia, hitos, plazos } from "@/datos/como-votar";

export const metadata: Metadata = {
  title: `Cómo votar, caso por caso · ${ficha.nombre}`,
  description:
    "Voto presencial, voto por correo, desde el extranjero y ayudas para votar: elige tu caso y lee sus pasos, plazos y fuente oficial.",
};

const enlace =
  "underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm";
const etiqueta =
  "font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase";
const titular = "text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-0.02em]";

export default function ComoVotar() {
  return (
    <>
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
            con necesidad de apoyo. Cada caso abre su propia página, con sus
            pasos, sus fechas del calendario oficial y la fuente que los
            sostiene.
          </p>
          <VotonApartado className="mt-8" {...paradasIndice[0]} />
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

        {/* Índice de casos: cada tarjeta abre su página. */}
        <nav aria-label="Casos" className="mt-8 grid gap-3 md:grid-cols-2">
          {casos.map((caso) => {
            const Icon = iconosCaso[caso.icono];
            return (
              <Card
                key={caso.id}
                render={<div />}
                className="gap-0 px-5 py-4 text-base ring-0 bg-muted transition-colors hover:bg-(--surface)"
              >
                <Link
                  href={rutaCaso(caso.id)}
                  className="flex items-start gap-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-lg"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-background text-brand ring-1 ring-border"
                  >
                    <Icon className="size-4.5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{caso.pregunta}</span>
                    <span className="mt-0.5 block text-[15px] text-(--text-secondary)">
                      {caso.quien}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-(--text-secondary)"
                  />
                </Link>
              </Card>
            );
          })}
        </nav>

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

      <GuiaVoton paradas={paradasIndice} />
    </>
  );
}
