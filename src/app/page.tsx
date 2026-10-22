import type { Metadata } from "next";
import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  Globe,
  IdCard,
  Mail,
  Plane,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BotonAviso } from "@/components/BotonAviso";
import { Fuentes } from "@/components/Fuentes";
import { ficha } from "@/lib/ficha";
import { casos, fecha, fuentesGuia, plazos, type Caso } from "@/datos/como-votar";

export const metadata: Metadata = {
  title: `${ficha.nombre} · ${ficha.frase}`,
  description:
    "Cómo votar en las generales del 29 de noviembre de 2026: en persona, por correo, desde el extranjero o con apoyo. Pasos, plazos y fuentes oficiales.",
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

const enlace =
  "underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm";

export default function Home() {
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
        <Badge variant="outline">
          {ficha.datos === "reales" ? "Datos públicos" : "Datos simulados"}
        </Badge>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-[760px] px-(--page-gutter) pt-12 pb-20 outline-none md:pt-20"
      >
        <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
          Elecciones generales · 29 de noviembre de 2026
        </p>
        <h1 className="mt-4 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
          Dime tu situación; te digo cómo votar.
        </h1>
        <p className="mt-6 text-lg text-(--text-secondary)">
          Pasos y plazos del 29-N con su fuente oficial: en tu ciudad, fuera de
          ella, desde el extranjero o con apoyo para votar. Sin candidaturas,
          programas ni recomendaciones: solo cómo se vota.
        </p>

        <section aria-labelledby="casos" className="mt-14">
          <h2 id="casos" className="sr-only">
            Elige tu caso
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {casos.map((caso) => {
              const Icon = iconos[caso.icono];
              return (
                <Card
                  key={caso.id}
                  render={<article />}
                  className="gap-0 px-5 py-4 text-base ring-0 bg-muted transition-colors hover:bg-(--surface)"
                >
                  <Link
                    href={`/como-votar#caso-${caso.id}`}
                    className="flex items-start gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
                  </Link>
                </Card>
              );
            })}
          </div>

          <Link
            href="/como-votar"
            className={buttonVariants({ variant: "sunset", size: "lg" })}
          >
            Ver la guía completa
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </section>

        {/* El plazo que más apremia. Una sola tarjeta con el sol por vista. */}
        <section aria-labelledby="plazos" className="mt-14">
          <h2 id="plazos" className="sr-only">
            Plazos abiertos
          </h2>
          <Card
            render={<section />}
            className="gap-2 px-6 py-6 text-base ring-0 [background:radial-gradient(120%_90%_at_100%_0%,#ffd34d_0%,rgba(255,211,77,0)_60%),var(--brand-yellow)]"
          >
            <p className="font-mono text-xs tracking-[0.06em] uppercase">
              Si vas a votar por correo
            </p>
            <p className="font-heading text-[clamp(30px,4vw,44px)] leading-none">
              Pide el voto hasta el {fecha(plazos.correoSolicitud.fin)}
            </p>
            <p>
              Y devuélvelo por correo certificado hasta el{" "}
              {fecha(plazos.correoRemision.fin)}. Gratis, en cualquier oficina
              de Correos.
            </p>
          </Card>
        </section>

        <section aria-labelledby="otras" className="mt-14">
          <h2 id="otras" className="text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-0.02em]">
            Otras piezas de la herramienta
          </h2>
          <ul className="mt-6 grid gap-3">
            <li>
              <Card
                render={<article />}
                className="gap-0 px-5 py-4 text-base ring-0 bg-muted"
              >
                <a
                  href="escrutinio"
                  className="flex items-center justify-between gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span>
                    <span className="block font-medium">
                      ¿Qué pasa con tu voto al cerrar el colegio?
                    </span>
                    <span className="mt-0.5 block text-[15px] text-(--text-secondary)">
                      Del recuento en la mesa a los resultados oficiales en el
                      BOE, artículo a artículo.
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-(--text-secondary)" />
                </a>
              </Card>
            </li>
          </ul>
          <p className="mt-4 text-[15px] text-(--text-secondary)">
            ¿Una duda concreta? Pregúntale al chat de la esquina: responde con
            el calendario oficial y enlaza la fuente.
          </p>
        </section>

        <div className="mt-14">
          <Fuentes fuentes={fuentesGuia} />
          <p className="mt-4 text-sm text-(--text-secondary)">
            Origen de los datos: Ministerio del Interior.
          </p>
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
