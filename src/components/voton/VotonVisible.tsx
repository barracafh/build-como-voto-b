"use client";

import { useEffect, useRef, useState } from "react";
import { Voton, type EstadoVoton } from "./Voton";

// Monta a Votón solo cuando su hueco se ve: en móvil hay uno por apartado y
// así no hay decenas de animaciones a la vez fuera de pantalla.
export function VotonVisible({ estado, className }: { estado: EstadoVoton; className: string }) {
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
