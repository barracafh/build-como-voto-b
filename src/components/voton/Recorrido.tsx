"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { casos } from "@/datos/como-votar";
import { abrirChat } from "./eventos";
import { Voton, type EstadoVoton } from "./Voton";

// Recorrido de la portada: al bajar, Votón camina con el lector y presenta
// cada pieza de la herramienta. En escritorio va fijo en una columna y cambia
// de pose en cada parada; en móvil aparece junto a cada parada.

type Parada = {
  id: string;
  pose: EstadoVoton;
  dice: string;
  etiqueta?: string;
  titulo: string;
  texto: string;
  proximamente?: boolean;
  escena?: (activa: boolean) => ReactNode;
  accion?: ReactNode;
};

const enlaceBoton = buttonVariants({ variant: "outline", size: "lg" });

// Aparece cuando la parada está activa; con menos movimiento, ya está.
const entra = (activa: boolean, retardo = 0) => ({
  className: `transition-[opacity,translate] duration-500 ease-(--ease-brand) motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
    activa ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
  }`,
  style: { transitionDelay: activa ? `${retardo}ms` : "0ms" },
});

const PARADAS: Parada[] = [
  {
    id: "hola",
    pose: "hola",
    dice: "¡Hola! Soy Votón. Baja conmigo y te enseño lo que puedes hacer aquí.",
    etiqueta: "Elecciones generales · 29 de noviembre de 2026",
    titulo: "Todo lo que necesitas para votar, explicado.",
    texto:
      "Pasos, plazos y fuentes oficiales para votar el 29-N, también si vives fuera. Solo cómo se vota: nada de candidaturas ni encuestas.",
    accion: (
      <a href="#parada-guia" className={enlaceBoton}>
        Empezar el recorrido
        <ArrowDown data-icon="inline-end" aria-hidden="true" />
      </a>
    ),
  },
  {
    id: "guia",
    pose: "ok",
    dice: "Primero, lo importante: dime tu situación y te digo cómo votar.",
    etiqueta: "1 · Tu caso",
    titulo: "Cómo votar, caso por caso",
    texto:
      "En persona, por correo, desde el extranjero o con apoyo. Cada caso con sus pasos, sus fechas y la fuente oficial.",
    escena: (activa) => (
      <ul className="grid gap-2">
        {casos.slice(0, 4).map((caso, i) => (
          <li
            key={caso.id}
            {...entra(activa, 120 * i)}
            className={`${entra(activa).className} rounded-xl bg-muted px-4 py-3 text-[15px] font-medium`}
          >
            {caso.pregunta}
          </li>
        ))}
      </ul>
    ),
    accion: (
      <a href="#casos" className={enlaceBoton}>
        Elegir mi caso
        <ArrowDown data-icon="inline-end" aria-hidden="true" />
      </a>
    ),
  },
  {
    id: "chat",
    pose: "piensa",
    dice: "¿Una duda concreta? Pregúntamela. Respondo con la fuente oficial.",
    etiqueta: "2 · Tus dudas",
    titulo: "Pregúntame lo que quieras",
    texto:
      "Escribe tu duda como la dirías. La respuesta llega en pasos y enlaza la página oficial que la sostiene.",
    escena: (activa) => (
      <div className="grid gap-2 text-[15px]" aria-hidden="true">
        <p
          {...entra(activa, 0)}
          className={`${entra(activa).className} ml-10 justify-self-end rounded-xl bg-primary px-3 py-2 text-primary-foreground`}
        >
          Vivo en Berlín, ¿cómo voto?
        </p>
        <div
          {...entra(activa, 500)}
          className={`${entra(activa).className} mr-10 grid gap-2 rounded-xl bg-muted px-3 py-2`}
        >
          <p>
            Tienes dos opciones: votar en el consulado o por correo. Te doy los
            pasos y las fechas de cada una.
          </p>
          <p className="border-t pt-2 font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
            Fuentes · INE · JEC
          </p>
        </div>
      </div>
    ),
    accion: (
      <button
        type="button"
        onClick={() => abrirChat({ pregunta: "Vivo en Berlín, ¿cómo voto?" })}
        className={enlaceBoton}
      >
        <MessageCircle data-icon="inline-start" aria-hidden="true" />
        Abrir el chat
      </button>
    ),
  },
  {
    id: "escrutinio",
    pose: "no",
    dice: "¿Y después de votar? Te cuento qué pasa con tu voto.",
    etiqueta: "3 · El recuento",
    titulo: "¿Qué pasa con tu voto al cerrar el colegio?",
    texto:
      "Del recuento en la mesa a los resultados oficiales en el BOE, paso a paso y con el artículo de la ley que lo regula.",
    escena: (activa) => (
      <ol className="grid gap-3" aria-hidden="true">
        {[
          "Recuento en la mesa",
          "Actas a la Junta Electoral",
          "Escrutinio general",
          "Resultados oficiales en el BOE",
        ].map((paso, i) => (
          <li
            key={paso}
            {...entra(activa, 180 * i)}
            className={`${entra(activa).className} grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 text-[15px]`}
          >
            <span className="grid size-7 place-items-center rounded-full bg-muted font-medium text-brand tabular-nums">
              {i + 1}
            </span>
            {paso}
          </li>
        ))}
      </ol>
    ),
    accion: (
      <Link href="/escrutinio" className={enlaceBoton}>
        Ver el recorrido del voto
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Link>
    ),
  },
  {
    id: "escanos",
    pose: "fuera",
    dice: "Esto aún lo estamos preparando. ¡Vuelve pronto!",
    etiqueta: "4 · Los escaños",
    titulo: "Cómo se reparten los escaños",
    proximamente: true,
    texto:
      "La ley D'Hondt aplicada a una provincia con los resultados oficiales de 2023, sin cambiar un solo voto.",
    escena: (activa) => (
      // Candidaturas genéricas: el reparto es ilustrativo.
      <div className="grid gap-2" aria-hidden="true">
        {[
          { c: "A", n: 3 },
          { c: "B", n: 2 },
          { c: "C", n: 1 },
          { c: "D", n: 1 },
        ].map(({ c, n }, i) => (
          <div key={c} className="grid grid-cols-[24px_minmax(0,1fr)] items-center gap-3">
            <span className="font-mono text-sm text-(--text-secondary)">{c}</span>
            <span className="flex gap-1.5">
              {Array.from({ length: n }, (_, j) => (
                <span
                  key={j}
                  {...entra(activa, 150 * (i + j * 2))}
                  className={`${entra(activa).className} size-5 rounded-full bg-foreground`}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "fin",
    pose: "hola",
    dice: "¡Listo! Empieza por tu caso. Si te atascas, estoy en la esquina.",
    titulo: "Empieza por tu caso",
    texto: "Y si te surge una duda por el camino, pulsa el botón de la esquina.",
    accion: (
      <a href="#casos" className={enlaceBoton}>
        Ir a los casos
        <ArrowDown data-icon="inline-end" aria-hidden="true" />
      </a>
    ),
  },
];

// Monta a Votón solo cuando se ve: en móvil hay uno por parada.
function VotonVisible({ estado, className }: { estado: EstadoVoton; className: string }) {
  const hueco = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = hueco.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: "120px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={hueco} className={className}>
      {visible && <Voton estado={estado} className="size-full" />}
    </div>
  );
}

function Bocadillo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`rounded-xl rounded-bl-sm bg-muted px-4 py-3 text-[15px] leading-snug ${className}`}
    >
      {children}
    </p>
  );
}

export function Recorrido() {
  const [activa, setActiva] = useState(0);
  const [caminando, setCaminando] = useState(false);
  const paradas = useRef<(HTMLElement | null)[]>([]);

  // La parada activa es la que cruza el centro de la pantalla.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas)
          if (e.isIntersecting) setActiva(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    paradas.current.forEach((p) => p && io.observe(p));
    return () => io.disconnect();
  }, []);

  // Entre parada y parada, Votón camina un momento y luego posa.
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    setCaminando(true);
    const t = window.setTimeout(() => setCaminando(false), 750);
    return () => window.clearTimeout(t);
  }, [activa]);

  const actual = PARADAS[activa];

  return (
    <section
      aria-labelledby="recorrido-titulo"
      className="mx-auto grid max-w-(--container-content) gap-x-12 px-(--page-gutter) md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
    >
      {/* Votón fijo (escritorio) */}
      <div className="hidden md:block">
        <div className="sticky top-[calc(50dvh-210px)] grid justify-items-center gap-4">
          <Bocadillo className="max-w-[340px] justify-self-stretch">
            <span aria-hidden="true" key={actual.id} className="block">
              {actual.dice}
            </span>
          </Bocadillo>
          <VotonVisible
            estado={caminando ? "camina" : actual.pose}
            className="h-[320px] w-[300px]"
          />
        </div>
      </div>

      <ol className="grid">
        {PARADAS.map((p, i) => {
          const esActiva = activa === i;
          const Titulo = "h2";
          return (
            <li
              key={p.id}
              id={`parada-${p.id}`}
              data-i={i}
              ref={(el) => {
                paradas.current[i] = el;
              }}
              className="grid content-center gap-5 py-12 md:min-h-[78dvh] md:py-16"
            >
              {/* Votón junto a cada parada (móvil) */}
              <div className="grid grid-cols-[88px_minmax(0,1fr)] items-end gap-2 md:hidden">
                <VotonVisible estado={p.pose} className="h-[94px] w-[88px]" />
                <Bocadillo className="mb-8">{p.dice}</Bocadillo>
              </div>

              {(p.etiqueta || p.proximamente) && (
                <p className="flex flex-wrap items-center gap-2 font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
                  {p.etiqueta}
                  {p.proximamente && <Badge variant="outline">Próximamente</Badge>}
                </p>
              )}
              <Titulo
                id={i === 0 ? "recorrido-titulo" : undefined}
                className={
                  i === 0
                    ? "font-heading text-[clamp(36px,5vw,60px)] leading-[1.05] font-normal tracking-[-0.02em]"
                    : "font-heading text-[clamp(28px,3.4vw,40px)] leading-[1.1] font-normal tracking-[-0.02em]"
                }
              >
                {p.titulo}
              </Titulo>
              <p className="max-w-[54ch] text-lg text-(--text-secondary)">{p.texto}</p>
              {p.escena && <div className="max-w-[460px]">{p.escena(esActiva)}</div>}
              {p.accion && <div>{p.accion}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
