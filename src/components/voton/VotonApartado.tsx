"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import type { EstadoVoton } from "./Voton";
import { abrirChat } from "./eventos";
import { VotonVisible } from "./VotonVisible";

// Votón junto a un apartado (móvil y tableta, < xl). Va en el flujo de la
// página, así que nunca tapa texto ni el botón del chat. Al entrar en
// pantalla llega caminando, posa y entonces aparece el bocadillo. En
// escritorio lo sustituye GuiaVoton; el contenedor con `id` se queda para
// que GuiaVoton pueda seguirlo.
export function VotonApartado({
  id,
  pose,
  dice,
  pregunta,
  className = "",
}: {
  id?: string;
  pose: EstadoVoton;
  dice: string;
  pregunta?: string;
  className?: string;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [llego, setLlego] = useState(false);
  const [caminando, setCaminando] = useState(false);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setLlego(true);
          return;
        }
        setCaminando(true);
        window.setTimeout(() => {
          setCaminando(false);
          setLlego(true);
        }, 700);
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div id={id}>
      <div
        ref={caja}
        className={`grid grid-cols-[72px_minmax(0,1fr)] items-end gap-2 xl:hidden ${className}`}
      >
        <VotonVisible estado={caminando ? "camina" : pose} className="h-[77px] w-[72px]" />
        <div
          className={`mb-5 grid gap-2 transition-[opacity,translate] duration-300 ease-(--ease-brand) motion-reduce:transition-none ${
            llego ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
          }`}
        >
          <p className="rounded-xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-[15px] leading-snug">
            {dice}
          </p>
          {pregunta && (
            <button
              type="button"
              onClick={() => abrirChat({ pregunta })}
              className={`${buttonVariants({ variant: "outline" })} justify-self-start`}
            >
              <MessageCircle data-icon="inline-start" aria-hidden="true" />
              Preguntar a Votón
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
