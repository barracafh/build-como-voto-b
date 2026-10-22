"use client";

import { useEffect, useState, type Ref } from "react";
import { Voton, type EstadoVoton } from "./Voton";

// Botón flotante que abre el chat: Votón con su bocadillo. Saluda al
// aparecer, al pasar el ratón o el foco, y de vez en cuando para recordar
// que está ahí.
export function BotonVoton({
  ref,
  onClick,
  controla,
}: {
  ref?: Ref<HTMLButtonElement>;
  onClick: () => void;
  controla: string;
}) {
  const [estado, setEstado] = useState<EstadoVoton>("hola");

  useEffect(() => {
    let vuelta = window.setTimeout(() => setEstado("idle"), 2000);
    const recordatorio = window.setInterval(() => {
      setEstado("hola");
      window.clearTimeout(vuelta);
      vuelta = window.setTimeout(() => setEstado("idle"), 2000);
    }, 15000);
    return () => {
      window.clearTimeout(vuelta);
      window.clearInterval(recordatorio);
    };
  }, []);

  const saluda = () => setEstado("hola");
  const reposa = () => setEstado("idle");

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onPointerEnter={saluda}
      onPointerLeave={reposa}
      onFocus={saluda}
      onBlur={reposa}
      aria-expanded={false}
      aria-controls={controla}
      className="group fixed right-2 bottom-2 z-40 flex cursor-pointer items-end rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:right-4 sm:bottom-3"
    >
      <span className="mb-16 rounded-xl rounded-br-sm bg-background px-3 py-2 text-[15px] font-medium shadow-(--shadow-overlay) transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none">
        ¿Dudas? Pregúntame
        <span className="sr-only"> sobre cómo votar</span>
      </span>
      <Voton
        estado={estado}
        className="h-[94px] w-[88px] transition-transform duration-150 group-active:scale-95 motion-reduce:transition-none"
      />
    </button>
  );
}
