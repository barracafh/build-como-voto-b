"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { abrirChat } from "./eventos";
import type { ParadaGuia } from "./guias";
import { VotonVisible } from "./VotonVisible";

// Votón guía de una página larga (escritorio, ≥ xl). Va fijo en el margen
// izquierdo, fuera de la columna de lectura de 960 px, y sigue el apartado
// que cruza el centro de la pantalla: camina un momento, posa y cambia de
// bocadillo con un fundido corto. En pantallas más estrechas no cabe en el
// margen; allí cada apartado lleva su propio Votón (VotonApartado).

const PASEO = 650;

const sinMovimiento = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function seccionDe(ancla: string): HTMLElement | null {
  const el = document.getElementById(ancla);
  if (!el) return null;
  return el.closest("section") ?? el;
}

export function GuiaVoton({ paradas }: { paradas: ParadaGuia[] }) {
  const [activa, setActiva] = useState(0);
  const [mostrada, setMostrada] = useState(0);
  const [caminando, setCaminando] = useState(false);
  const [oculta, setOculta] = useState(false);
  const [alzado, setAlzado] = useState(0);

  // El apartado activo es el último cuyo inicio ya pasó el centro de la
  // pantalla. El observador avisa cuando un borde cruza esa línea.
  useEffect(() => {
    const els = paradas.map((p) => seccionDe(p.ancla));
    const calcula = () => {
      const centro = window.innerHeight / 2;
      let i = 0;
      els.forEach((el, j) => {
        if (el && el.getBoundingClientRect().top <= centro) i = j;
      });
      setActiva(i);
    };
    const io = new IntersectionObserver(calcula, { rootMargin: "-50% 0px -50% 0px" });
    els.forEach((el) => el && io.observe(el));
    calcula();
    return () => io.disconnect();
  }, [paradas]);

  // Al llegar al pie, Votón sube con él para no taparlo.
  useEffect(() => {
    const pie = document.querySelector("footer");
    if (!pie) return;
    let raf = 0;
    const mide = () => {
      raf = 0;
      const solape = window.innerHeight - pie.getBoundingClientRect().top;
      setAlzado(Math.max(0, Math.round(solape)));
    };
    const pide = () => {
      if (!raf) raf = requestAnimationFrame(mide);
    };
    mide();
    window.addEventListener("scroll", pide, { passive: true });
    window.addEventListener("resize", pide);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", pide);
      window.removeEventListener("resize", pide);
    };
  }, []);

  // Coreografía: el bocadillo se va, Votón camina, posa y habla.
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    if (sinMovimiento()) {
      setMostrada(activa);
      return;
    }
    setOculta(true);
    setCaminando(true);
    const t = window.setTimeout(() => {
      setCaminando(false);
      setMostrada(activa);
      setOculta(false);
    }, PASEO);
    return () => window.clearTimeout(t);
  }, [activa]);

  const actual = paradas[mostrada];
  const suave =
    "transition-[opacity,translate] duration-300 ease-(--ease-brand) motion-reduce:transition-none motion-reduce:translate-y-0";

  return (
    <div
      style={{ bottom: 24 + alzado }}
      className="fixed left-4 z-30 hidden w-[clamp(136px,calc(50vw-504px),220px)] gap-3 xl:grid"
    >
      <div className={`grid gap-2 ${suave} ${oculta ? "translate-y-1.5 opacity-0" : "translate-y-0 opacity-100"}`}>
        <p
          aria-hidden="true"
          className="rounded-xl rounded-bl-sm bg-muted px-3.5 py-3 text-[15px] leading-snug"
        >
          {actual.dice}
        </p>
        {actual.pregunta && (
          <button
            type="button"
            onClick={() => abrirChat({ pregunta: actual.pregunta })}
            className={`${buttonVariants({ variant: "outline" })} justify-self-start`}
          >
            <MessageCircle data-icon="inline-start" aria-hidden="true" />
            Preguntar
          </button>
        )}
      </div>
      <VotonVisible
        estado={caminando ? "camina" : actual.pose}
        className="h-[128px] w-[120px]"
      />
    </div>
  );
}
