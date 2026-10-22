"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { ArrowDown, ArrowRight, CircleX, MessageCircle } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { temas } from "@/datos/bulos";
import { casos } from "@/datos/como-votar";
import { abrirChat } from "./eventos";
import { Voton, type EstadoVoton } from "./Voton";

// Portada como una película corta: Votón entra caminando y saluda; al bajar,
// la escena se queda fija y cada capítulo presenta una pieza de la herramienta
// mientras Votón camina y posa. Todo el texto está en el HTML desde el
// servidor; la animación solo lo coreografía. En móvil no se fija nada: los
// capítulos se apilan y aparecen al llegar. Con prefers-reduced-motion, todo
// queda quieto y visible.

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const boton = buttonVariants({ variant: "outline", size: "lg" });
const botonPrincipal = buttonVariants({ variant: "sunset", size: "lg" });
const etiqueta = "font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase";

// Las afirmaciones más extendidas, sacadas de bulos.ts para que la portada
// diga lo mismo que /bulos.
const BULOS_PORTADA = ["blanco-reparte", "blanco-abstencion", "correo-y-mesa", "tarjeta-censal"].map(
  (id) => temas.flatMap((t) => t.afirmaciones).find((a) => a.id === id)!,
);

type Capitulo = {
  id: string;
  pose: EstadoVoton;
  dice: string;
  etiqueta: string;
  titulo: string;
  texto: string;
  proximamente?: boolean;
  escena: ReactNode;
  accion?: ReactNode;
};

const CAPITULOS: Capitulo[] = [
  {
    id: "guia",
    pose: "ok",
    dice: "Primero, lo importante: dime tu situación y te digo cómo votar.",
    etiqueta: "Tu caso",
    titulo: "Cómo votar, caso por caso",
    texto:
      "En persona, por correo, desde el extranjero o con apoyo. Cada caso con sus pasos, sus fechas y la fuente oficial.",
    escena: (
      <ul className="grid gap-2">
        {casos.slice(0, 4).map((caso) => (
          <li key={caso.id} className="rounded-xl bg-muted px-4 py-3 text-[15px] font-medium">
            <Link
              href={`/como-votar/${caso.id}`}
              className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm"
            >
              {caso.pregunta}
            </Link>
          </li>
        ))}
      </ul>
    ),
    accion: (
      <a href="#casos" className={boton}>
        Elegir mi caso
        <ArrowDown data-icon="inline-end" aria-hidden="true" />
      </a>
    ),
  },
  {
    id: "chat",
    pose: "piensa",
    dice: "¿Una duda concreta? Pregúntamela. Respondo con la fuente oficial.",
    etiqueta: "Tus dudas",
    titulo: "Pregúntame lo que quieras",
    texto:
      "Escribe tu duda como la dirías. La respuesta llega en pasos y enlaza la página oficial que la sostiene.",
    escena: (
      <div className="grid gap-2 text-[15px]" aria-hidden="true">
        <p className="ml-10 justify-self-end rounded-xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground">
          Vivo en Berlín, ¿cómo voto?
        </p>
        <div className="mr-10 grid gap-2 rounded-xl rounded-bl-sm bg-muted px-3 py-2">
          <p>
            Tienes dos opciones: votar en el consulado o por correo. Te doy los
            pasos y las fechas de cada una.
          </p>
          <p className={`border-t pt-2 ${etiqueta}`}>Fuentes · INE · JEC</p>
        </div>
      </div>
    ),
    accion: (
      <button
        type="button"
        onClick={() => abrirChat({ pregunta: "Vivo en Berlín, ¿cómo voto?" })}
        className={boton}
      >
        <MessageCircle data-icon="inline-start" aria-hidden="true" />
        Abrir el chat
      </button>
    ),
  },
  {
    id: "bulos",
    pose: "aviso",
    dice: "¿Te han dicho que el voto en blanco va al que gana? Lo miramos con la ley.",
    etiqueta: "Lo que se dice",
    titulo: "Lo que circula sobre votar, frente a la ley",
    texto:
      "Voto en blanco, nulo, abstención, papeletas tachadas o voto por correo: cada afirmación con el artículo que la contradice.",
    escena: (
      <ul className="grid divide-y divide-border rounded-xl ring-1 ring-border" aria-hidden="true">
        {BULOS_PORTADA.map((a) => (
          <li key={a.id} className="grid gap-1.5 px-4 py-3">
            <p className="text-[15px] leading-[1.35] font-medium">«{a.dice}»</p>
            <p className="flex items-start gap-2 text-sm text-(--text-secondary)">
              <CircleX className="mt-[0.15em] size-4 shrink-0 text-brand" strokeWidth={1.75} />
              <span>
                {a.ley}{" "}
                <span className="font-mono text-xs">({a.fuente.nombre.replace(" (BOE)", "")})</span>
              </span>
            </p>
          </li>
        ))}
      </ul>
    ),
    accion: (
      <Link href="/bulos" className={boton}>
        Ver lo que se dice
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Link>
    ),
  },
  {
    id: "escrutinio",
    pose: "no",
    dice: "¿Y después de votar? Te cuento qué pasa con tu voto.",
    etiqueta: "El recuento",
    titulo: "¿Qué pasa con tu voto al cerrar el colegio?",
    texto:
      "Del recuento en la mesa a los resultados oficiales en el BOE, paso a paso y con el artículo de la ley que lo regula.",
    escena: (
      <ol className="grid gap-3" aria-hidden="true">
        {[
          "Recuento en la mesa",
          "Actas a la Junta Electoral",
          "Escrutinio general",
          "Resultados oficiales en el BOE",
        ].map((paso, i) => (
          <li key={paso} className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 text-[15px]">
            <span className="grid size-7 place-items-center rounded-full bg-muted font-medium text-brand tabular-nums">
              {i + 1}
            </span>
            {paso}
          </li>
        ))}
      </ol>
    ),
    accion: (
      <Link href="/escrutinio" className={boton}>
        Ver el recorrido del voto
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Link>
    ),
  },
  {
    id: "escanos",
    pose: "aviso",
    dice: "¡Ojo! No gana «el más votado» y ya está. Te enseño la fórmula.",
    etiqueta: "Los escaños",
    titulo: "La ley D'Hondt, explicada",
    texto:
      "Cada provincia reparte sus escaños con una fórmula. Así funciona, con un ejemplo y con los resultados oficiales de 2023.",
    accion: (
      <Link href="/escanos" className={boton}>
        Ver cómo se reparten
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Link>
    ),
    // Candidaturas genéricas: el reparto es ilustrativo.
    escena: (
      <div className="grid gap-2" aria-hidden="true">
        {[
          { c: "A", n: 3 },
          { c: "B", n: 2 },
          { c: "C", n: 1 },
          { c: "D", n: 1 },
        ].map(({ c, n }) => (
          <div key={c} className="grid grid-cols-[24px_minmax(0,1fr)] items-center gap-3">
            <span className="font-mono text-sm text-(--text-secondary)">{c}</span>
            <span className="flex gap-1.5">
              {Array.from({ length: n }, (_, j) => (
                <span key={j} className="size-5 rounded-full bg-foreground" />
              ))}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "mapa",
    pose: "hola",
    dice: "Y ahora, provincia a provincia: así quedó el Congreso en 2023.",
    etiqueta: "El mapa",
    titulo: "Del hemiciclo a cada provincia",
    texto:
      "Cómo quedó el Congreso en 2023, de dónde sale cada escaño y qué habría pasado con otras reglas.",
    escena: <Hemiciclo />,
    accion: (
      <Link href="/mapa" className={boton}>
        Ver el mapa
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Link>
    ),
  },
];

// Hemiciclo ilustrativo: filas de escaños en arco, sin datos.
function Hemiciclo() {
  const filas = [9, 13, 17, 21];
  return (
    <svg viewBox="0 0 240 128" className="w-full max-w-[360px]" aria-hidden="true">
      <g>
        {filas.flatMap((n, f) => {
          const r = 50 + f * 20;
          return Array.from({ length: n }, (_, k) => {
            const a = Math.PI - (Math.PI * k) / (n - 1);
            return (
              <circle
                key={`${f}-${k}`}
                cx={(120 + r * Math.cos(a)).toFixed(1)}
                cy={(118 - r * Math.sin(a)).toFixed(1)}
                r={4.6}
                className="fill-foreground"
              />
            );
          });
        })}
      </g>
    </svg>
  );
}

// Posición de Votón en cada capítulo: camina de un sitio a otro.
const PASOS_X = [0, 56, -36, 28, -12];

function Bocadillo({ children, className = "bg-muted" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`rounded-xl rounded-bl-sm px-4 py-3 text-[15px] leading-snug text-foreground ${className}`}>
      {children}
    </p>
  );
}

// Monta a Votón solo cuando se ve (en móvil hay uno por capítulo).
function VotonVisible({ estado, className }: { estado: EstadoVoton; className: string }) {
  const hueco = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = hueco.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={hueco} className={className}>
      {visible && <Voton estado={estado} className="size-full" />}
    </div>
  );
}

// Divide el titular en palabras para que entren una a una. El texto sigue
// siendo uno solo para los lectores de pantalla.
function Palabras({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(" ").map((p, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span data-palabra className="inline-block">
            {p}
            {" "}
          </span>
        </span>
      ))}
    </>
  );
}

export function Recorrido() {
  const raiz = useRef<HTMLDivElement>(null);
  const andador = useRef<HTMLDivElement>(null);
  const andadorHero = useRef<HTMLDivElement>(null);
  const [cine, setCine] = useState(false);
  const [cap, setCap] = useState(0);
  const [caminando, setCaminando] = useState(false);
  const [estadoHero, setEstadoHero] = useState<EstadoVoton>("hola");
  const capRef = useRef(0);

  useIsoLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = raiz.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);

    mm.add(
      {
        escritorio: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        movil: "(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)",
      },
      (contexto) => {
        const { escritorio } = contexto.conditions as { escritorio: boolean; movil: boolean };

        // Apertura: Votón entra caminando, el titular sube palabra a palabra.
        const apertura = gsap.timeline({ defaults: { ease: "power3.out" } });
        setEstadoHero("camina");
        apertura
          .from(andadorHero.current, { x: -220, duration: 1.4, ease: "power1.out" }, 0)
          .call(() => setEstadoHero("hola"), undefined, 1.35)
          .from("[data-palabra]", { yPercent: 110, duration: 0.7, stagger: 0.06 }, 0.15)
          .from("[data-hero-entra]", { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.1 }, 0.6)
          .from("[data-hero-bocadillo]", { autoAlpha: 0, scale: 0.85, transformOrigin: "0% 100%", duration: 0.5, ease: "back.out(2)" }, 1.45);

        // Barra de progreso del recorrido.
        gsap.to("[data-progreso]", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.3 },
        });

        if (!escritorio) {
          // Móvil: cada capítulo aparece al llegar.
          gsap.utils.toArray<HTMLElement>("[data-capitulo]").forEach((c) => {
            gsap.from(c.querySelectorAll("[data-sube]"), {
              autoAlpha: 0,
              y: 24,
              duration: 0.6,
              stagger: 0.08,
              ease: "power3.out",
              scrollTrigger: { trigger: c, start: "top 80%", toggleActions: "play none none reverse" },
            });
          });
          return;
        }

        // Escritorio: la escena se fija y los capítulos se suceden.
        setCine(true);
        const caps = gsap.utils.toArray<HTMLElement>("[data-capitulo]");
        gsap.set(caps.slice(1), { autoAlpha: 0, y: 70 });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: "[data-escenario]",
            pin: true,
            start: "top top",
            end: () => `+=${caps.length * window.innerHeight * 0.85}`,
            scrub: 0.6,
            invalidateOnRefresh: true,
            snap: { snapTo: "labelsDirectional", duration: { min: 0.25, max: 0.7 }, ease: "power1.inOut" },
            onUpdate: (self) => {
              const i = Math.min(caps.length - 1, Math.round(self.progress * (caps.length - 1)));
              if (i !== capRef.current) {
                capRef.current = i;
                setCap(i);
              }
            },
          },
        });
        caps.forEach((c, i) => {
          tl.addLabel(`c${i}`);
          if (i === caps.length - 1) return;
          const sig = caps[i + 1];
          tl.to(c, { autoAlpha: 0, y: -70, duration: 0.5, ease: "power2.in" }, "+=0.5")
            .to(sig, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, "<0.25")
            .from(sig.querySelectorAll("[data-escena] > * > *, [data-escena] > ul > li"), { autoAlpha: 0, y: 18, stagger: 0.08, duration: 0.4 }, "<0.15");
        });
        tl.addLabel("fin", "+=0.4");

        return () => {
          setCine(false);
          setCap(0);
          capRef.current = 0;
        };
      },
    );

    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => mm.revert();
  }, []);

  // Entre capítulos, Votón camina a su sitio y luego posa.
  const primero = useRef(true);
  useEffect(() => {
    if (primero.current) {
      primero.current = false;
      return;
    }
    setCaminando(true);
    const mueve = andador.current
      ? gsap.to(andador.current, { x: PASOS_X[cap] ?? 0, duration: 0.8, ease: "power1.inOut" })
      : null;
    const t = window.setTimeout(() => setCaminando(false), 820);
    return () => {
      window.clearTimeout(t);
      mueve?.kill();
    };
  }, [cap]);

  const actual = CAPITULOS[cap];

  return (
    <div ref={raiz} data-cine={cine} className="group relative">
      <div
        data-progreso
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-30 h-1 origin-left scale-x-0 bg-brand motion-reduce:hidden"
      />

      <section aria-labelledby="recorrido-titulo">
        {/* Apertura: el atardecer de la marca, con Votón entrando en escena */}
        <div className="p-2">
          <div className="overflow-hidden rounded-[28px] text-white [background:var(--brand-gradient)]">
            <div className="mx-auto grid max-w-(--container-content) items-end gap-6 px-(--page-gutter) pt-10 lg:min-h-[calc(100svh-150px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-12 lg:pt-0">
              <div className="order-1 grid gap-5 lg:order-2 lg:pb-8">
                <p data-hero-entra className="font-mono text-xs tracking-[0.06em] text-white/85 uppercase">
                  Elecciones generales · 29 de noviembre de 2026
                </p>
                <h2
                  id="recorrido-titulo"
                  className="font-heading text-[clamp(40px,6vw,80px)] leading-[1.02] font-normal tracking-[-0.025em]"
                >
                  <Palabras texto="Votar, explicado de principio a fin." />
                </h2>
                <p data-hero-entra className="max-w-[46ch] text-lg text-white/90">
                  Pasos, plazos y fuentes oficiales para votar el 29-N, también
                  si vives fuera. Solo cómo se vota: nada de candidaturas ni
                  encuestas.
                </p>
                <div data-hero-entra className="flex flex-wrap gap-3">
                  <a href="#capitulos" className={botonPrincipal}>
                    Empezar el recorrido
                    <ArrowDown data-icon="inline-end" aria-hidden="true" />
                  </a>
                  <a href="#casos" className={`${boton} text-foreground`}>
                    Ir directo a mi caso
                  </a>
                </div>
              </div>
              <div className="relative order-2 grid justify-items-center pb-6 lg:order-1 lg:self-end lg:pb-12">
                <div data-hero-bocadillo className="mb-2 max-w-[300px] justify-self-center lg:justify-self-end">
                  <Bocadillo className="bg-background">
                    ¡Hola! Soy Votón. Baja conmigo y te enseño lo que puedes hacer aquí.
                  </Bocadillo>
                </div>
                <div ref={andadorHero}>
                  <Voton estado={estadoHero} className="h-[230px] w-[216px] lg:h-[380px] lg:w-[356px]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Capítulos */}
        <div id="capitulos" data-escenario className="relative bg-background">
          <div className="mx-auto grid max-w-(--container-content) px-(--page-gutter) group-data-[cine=true]:h-svh group-data-[cine=true]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] group-data-[cine=true]:items-center group-data-[cine=true]:gap-12">
            {/* Votón de la escena fija (escritorio) */}
            <div
              aria-hidden="true"
              className="relative hidden h-[min(640px,calc(100svh-96px))] content-center justify-items-center gap-4 overflow-hidden rounded-[28px] bg-muted px-8 group-data-[cine=true]:grid"
            >
              {/* Número del capítulo, gigante, al fondo del plató */}
              <span
                key={`n-${cap}`}
                className="pointer-events-none absolute right-5 bottom-12 font-heading text-[clamp(140px,14vw,210px)] leading-none text-background tabular-nums select-none"
              >
                {String(cap + 1).padStart(2, "0")}
              </span>
              <Bocadillo className="relative max-w-[340px] justify-self-stretch bg-background">
                <span key={actual.id} className="block">
                  {actual.dice}
                </span>
              </Bocadillo>
              <div ref={andador} className="relative">
                <Voton estado={caminando ? "camina" : actual.pose} className="h-[340px] w-[319px]" />
              </div>
              <div className="relative flex w-full max-w-[340px] items-center gap-3">
                <span className="font-mono text-sm tabular-nums">
                  {String(cap + 1).padStart(2, "0")} / {String(CAPITULOS.length).padStart(2, "0")}
                </span>
                <span className="flex flex-1 gap-1.5">
                  {CAPITULOS.map((c, i) => (
                    <span key={c.id} className="h-1 flex-1 overflow-hidden rounded-full bg-background">
                      <span
                        className={`block h-full origin-left rounded-full bg-brand transition-transform duration-500 ${
                          i <= cap ? "scale-x-100" : "scale-x-0"
                        }`}
                      />
                    </span>
                  ))}
                </span>
              </div>
            </div>

            <ol className="grid group-data-[cine=true]:grid-cols-1 group-data-[cine=true]:grid-rows-1">
              {CAPITULOS.map((c, i) => (
                <li
                  key={c.id}
                  id={`capitulo-${c.id}`}
                  data-capitulo
                  className="grid content-center gap-5 border-t py-14 first:border-t-0 group-data-[cine=true]:[grid-area:1/1] group-data-[cine=true]:border-t-0 group-data-[cine=true]:py-0"
                >
                  {/* Votón junto a cada capítulo (móvil) */}
                  <div data-sube className="grid grid-cols-[88px_minmax(0,1fr)] items-end gap-2 group-data-[cine=true]:hidden lg:max-w-[460px]">
                    <VotonVisible estado={c.pose} className="h-[94px] w-[88px]" />
                    <Bocadillo className="mb-8 bg-muted">{c.dice}</Bocadillo>
                  </div>
                  <p data-sube className={`flex flex-wrap items-center gap-2 ${etiqueta}`}>
                    <span className="text-brand tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    {c.etiqueta}
                    {c.proximamente && <Badge variant="outline">Próximamente</Badge>}
                  </p>
                  <h2
                    data-sube
                    className="font-heading text-[clamp(30px,3.6vw,48px)] leading-[1.06] font-normal tracking-[-0.02em]"
                  >
                    {c.titulo}
                  </h2>
                  <p data-sube className="max-w-[52ch] text-lg text-(--text-secondary)">
                    {c.texto}
                  </p>
                  <div data-sube data-escena className="max-w-[460px]">
                    {c.escena}
                  </div>
                  {c.accion && <div data-sube>{c.accion}</div>}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Cierre */}
        <div className="mx-auto grid max-w-(--container-content) justify-items-start gap-4 px-(--page-gutter) pt-16 pb-4 lg:pt-24">
          <p className={etiqueta}>Fin del recorrido</p>
          <h2 className="font-heading text-[clamp(30px,3.6vw,48px)] leading-[1.06] font-normal tracking-[-0.02em]">
            Empieza por tu caso
          </h2>
          <p className="max-w-[52ch] text-lg text-(--text-secondary)">
            Y si te surge una duda por el camino, pulsa a Votón en la esquina.
          </p>
          <a href="#casos" className={boton}>
            Ir a los casos
            <ArrowDown data-icon="inline-end" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}
