export type EstadoVoton =
  | "idle"
  | "hola"
  | "piensa"
  | "ok"
  | "no"
  | "fuera"
  | "aviso"
  | "camina";

export const STATES: EstadoVoton[];

export interface InstanciaVoton {
  set(estado: EstadoVoton, opts?: { instant?: boolean }): void;
  readonly state: EstadoVoton | null;
  seek(t: number): void;
  destroy(): void;
  el: SVGSVGElement;
}

export function createVoton(
  el: HTMLElement,
  opts?: {
    gsap?: unknown;
    MorphSVGPlugin?: unknown;
    paused?: boolean;
    reducedMotion?: boolean;
  },
): InstanciaVoton;
