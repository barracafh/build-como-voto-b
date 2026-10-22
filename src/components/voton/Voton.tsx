"use client";

import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { useEffect, useRef, useState } from "react";
import { createVoton, type EstadoVoton, type InstanciaVoton } from "./motor";

export type { EstadoVoton };

// Votón, la mascota: un botón de abrigo con brazos y piernas de manguera.
// El dibujo y la animación viven en motor.js (SVG + GSAP); aquí solo se monta
// y se le cambia el estado. Es decorativo, así que va siempre con aria-hidden.
// El hueco tiene que tener tamaño: el SVG lo llena con proporción 240:256.
export function Voton({
  estado = "idle",
  className,
}: {
  estado?: EstadoVoton;
  className?: string;
}) {
  const hueco = useRef<HTMLDivElement>(null);
  const voton = useRef<InstanciaVoton | null>(null);

  useEffect(() => {
    if (!hueco.current) return;
    const v = createVoton(hueco.current, { gsap, MorphSVGPlugin });
    voton.current = v;
    return () => {
      v.destroy();
      voton.current = null;
    };
  }, []);

  useEffect(() => {
    voton.current?.set(estado);
  }, [estado]);

  return <div ref={hueco} aria-hidden="true" className={className} />;
}

// Saluda durante `duracion` ms cada vez que `clave` cambia y vuelve al reposo.
// El saludo de motor.js se repite en bucle, así que el regreso lo marca esto.
export function useSaludo(clave: unknown, duracion = 2400): EstadoVoton {
  const [saludando, setSaludando] = useState(true);
  useEffect(() => {
    setSaludando(true);
    const t = window.setTimeout(() => setSaludando(false), duracion);
    return () => window.clearTimeout(t);
  }, [clave, duracion]);
  return saludando ? "hola" : "idle";
}
