"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Cuántos píxeles asoma el banner amarillo del pie por abajo de la pantalla.
// Los Votón que flotan suben eso mismo para quedarse justo encima del banner
// sin tapar «¿Algo está mal? Avísanos». El pie se busca en cada medida porque
// el botón del chat vive en el layout raíz y el pie cambia con la página.
export function usePie() {
  const ruta = usePathname();
  const [alzado, setAlzado] = useState(0);

  useEffect(() => {
    let raf = 0;
    const mide = () => {
      raf = 0;
      const pie = document.querySelector("footer");
      const banner = pie?.firstElementChild ?? pie;
      if (!banner) return setAlzado(0);
      const solape = window.innerHeight - banner.getBoundingClientRect().top;
      setAlzado(Math.max(0, Math.round(solape)));
    };
    const pide = () => {
      if (!raf) raf = requestAnimationFrame(mide);
    };
    mide();
    window.addEventListener("scroll", pide, { passive: true });
    window.addEventListener("resize", pide);
    const ro = new ResizeObserver(pide);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", pide);
      window.removeEventListener("resize", pide);
    };
  }, [ruta]);

  return alzado;
}
