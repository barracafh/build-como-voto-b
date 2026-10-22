// Entradas del chat: cada elemento se anima una sola vez, al montarse.
// Con prefers-reduced-motion aparece sin más.

export const SUAVE = "cubic-bezier(0.23, 1, 0.32, 1)";

export const sinMovimiento = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const animados = new WeakSet<Element>();

type Desde = "derecha" | "abajo";

const INICIO: Record<Desde, Keyframe> = {
  derecha: { transform: "translateX(18px) scale(0.92)", opacity: 0, transformOrigin: "bottom right" },
  abajo: { transform: "translateY(12px)", opacity: 0, transformOrigin: "bottom left" },
};

// Ref callback: anima el elemento y, escalonados, sus hijos con [data-bloque].
export function entrada(desde: Desde) {
  return (el: HTMLElement | null) => {
    if (!el || animados.has(el)) return;
    animados.add(el);
    if (sinMovimiento()) return;
    el.animate([INICIO[desde], { transform: "none", opacity: 1, transformOrigin: INICIO[desde].transformOrigin }], {
      duration: 380,
      easing: SUAVE,
    });
    el.querySelectorAll<HTMLElement>("[data-bloque]").forEach((hijo, i) =>
      hijo.animate(
        [
          { transform: "translateY(8px)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 420, delay: 180 + i * 140, easing: SUAVE, fill: "backwards" },
      ),
    );
  };
}
