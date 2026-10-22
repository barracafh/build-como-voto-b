"use client";

import { useEffect, useRef, useState } from "react";
import mapa from "@/datos/mapa-provincias.json";
import provincias from "@/datos/provincias-2023.json";
import { layoutHemiciclo } from "@/lib/hemiciclo";
import { ASIENTOS, DESTINOS, PARTIDOS_2023, PILAS, TOTAL_ESCANOS } from "@/lib/escena";
import { COLOR_PARTIDO, GRIS_OTROS, hexGrupo } from "@/lib/mapa";
import { PanelProvincia } from "./PanelProvincia";

const acotar = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
// Cada bolita sale con un pequeño retraso distinto, para que vuelen en bandada y no a la vez
const RETRASO = Array.from({ length: TOTAL_ESCANOS }, (_, i) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 0.38;
});
const FASES = [
  {
    titulo: "Así quedó el Congreso en 2023",
    texto: "350 escaños, una bolita por escaño. Baja para ver de qué provincia sale cada una.",
  },
  {
    titulo: "Cada escaño sale de una provincia",
    texto: "Cada provincia reparte un número fijo de escaños. Las bolitas van a la suya.",
  },
  {
    titulo: "Escaños por provincia",
    texto: "Pulsa una provincia para ver su tabla D'Hondt: quién entra en el reparto y quién se queda fuera.",
  },
] as const;

const nombreDe = new Map(provincias.map((p) => [p.codigo, p]));

export function EscenaHemiciclo() {
  const seccion = useRef<HTMLElement>(null);
  const escena = useRef<HTMLDivElement>(null);
  const cabecera = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const aviso = useRef<HTMLDivElement>(null);
  const [fase, setFase] = useState<0 | 1 | 2>(0);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const api = useRef<{ seleccionar: (c: string | null) => void } | null>(null);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rutas = mapa.provincias.map((p) => ({
      codigo: p.codigo,
      path: new Path2D(p.d),
      // Punto de la parte más grande de la provincia (en Baleares, Mallorca), no el centro de su caja
      ancla: [Number(p.ancla[0]), Number(p.ancla[1])] as [number, number],
    }));
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let dpr = 1;
    // Disposición del mapa: dónde queda cada provincia y la montaña de bolitas sobre ella.
    type Disposicion = {
      s: number;
      ox: number;
      oy: number;
      rB: number;
      pilas: Map<string, { x: number; y: number; hw: number; hh: number }>;
    };
    let centrada: Disposicion | null = null;
    // Valores con los que se dibuja y se pulsa
    let s = 1;
    let ox = 0;
    let oy = 0;
    let hemi: { x: number; y: number }[] = [];
    let rA = 6; // radio de la bolita en el hemiciclo
    let rB = 3; // radio de la bolita en la montaña
    let arco = 60;
    let alto = 0;
    let arribaPx = 0;
    let hemiCx = 0; // centro y radio del hemiciclo, para el «350» de en medio
    let hemiCy = 0;
    let hemiR = 0;
    let fuente = "system-ui, sans-serif";
    const centrosPx = new Map<string, { x: number; y: number; mitadAncho: number; mitadAlto: number }>();
    let p = 0;
    let pSuave = 0;
    let sucio = true;
    let hover: string | null = null;
    let sel: string | null = null;
    let faseActual = 0;

    const medir = () => {
      const caja = escena.current!.getBoundingClientRect();
      W = caja.width;
      H = caja.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      // Hueco entre los textos de arriba (con los escaños de cada partido) y el mapa / hemiciclo
      const arriba = (cabecera.current?.offsetHeight ?? 0) + 44;
      alto = Math.max(160, H - arriba - 16);
      arribaPx = arriba;
      // Hemiciclo: una semicircunferencia más pequeña que el hueco y pegada a los textos, para que
      // se vea entero al cargar la página (la escena empieza algo por debajo del borde de la pantalla)
      const R = Math.min(W * 0.4, alto * 0.7);
      const baseHemi = arriba + alto * 0.05 + R;
      const L = layoutHemiciclo(TOTAL_ESCANOS, W / 2, baseHemi, R);
      hemi = L.asientos;
      rA = L.radioAsiento;
      hemiCx = W / 2;
      hemiCy = baseHemi;
      hemiR = R;
      fuente = getComputedStyle(document.body).fontFamily || fuente;
      arco = alto * 0.12;
      centrada = disponer(W);
      aplicarDisposicion();
      sucio = true;
    };

    // Dónde queda el mapa (y la montaña de cada provincia) en un ancho dado
    const disponer = (anchoMapa: number): Disposicion => {
      const sc = Math.min((anchoMapa * 0.95) / mapa.ancho, alto / mapa.alto);
      const x0 = (anchoMapa - mapa.ancho * sc) / 2;
      const y0 = arribaPx + (alto - mapa.alto * sc) / 2;
      const radio = acotar(3.2 * sc, 1.8, 3.6);
      // Montañas: cada una sobre su provincia, y separadas entre sí para que no se pisen
      // (Barcelona, con 32 escaños, aplastaba a Girona, Lleida y Tarragona)
      const pilas = rutas.map((r) => {
        const pila = PILAS.get(r.codigo)!;
        const x = x0 + r.ancla[0] * sc;
        const y = y0 + r.ancla[1] * sc;
        return { codigo: r.codigo, x0: x, y0: y, x, y, hw: (pila.ancho / 2 + 0.6) * 2 * radio, hh: (pila.alto / 2 + 0.6) * 2 * radio };
      });
      const maxDesp = 30;
      for (let it = 0; it < 80; it++) {
        let movido = false;
        for (let i = 0; i < pilas.length; i++)
          for (let j = i + 1; j < pilas.length; j++) {
            const a = pilas[i];
            const b = pilas[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const solX = a.hw + b.hw + 2 - Math.abs(dx);
            const solY = a.hh + b.hh + 2 - Math.abs(dy);
            if (solX <= 0 || solY <= 0) continue;
            movido = true;
            if (solX < solY) {
              const m = (solX / 2) * (dx >= 0 ? 1 : -1);
              a.x -= m;
              b.x += m;
            } else {
              const m = (solY / 2) * (dy >= 0 ? 1 : -1);
              a.y -= m;
              b.y += m;
            }
          }
        for (const q of pilas) {
          q.x = acotar(q.x, q.x0 - maxDesp, q.x0 + maxDesp);
          q.y = acotar(q.y, q.y0 - maxDesp, q.y0 + maxDesp);
        }
        if (!movido) break;
      }
      return {
        s: sc,
        ox: x0,
        oy: y0,
        rB: radio,
        pilas: new Map(pilas.map((q) => [q.codigo, { x: q.x, y: q.y, hw: q.hw, hh: q.hh }])),
      };
    };

    const aplicarDisposicion = () => {
      if (!centrada) return;
      s = centrada.s;
      ox = centrada.ox;
      oy = centrada.oy;
      rB = centrada.rB;
      centrosPx.clear();
      for (const [codigo, a] of centrada.pilas)
        centrosPx.set(codigo, { x: a.x, y: a.y, mitadAncho: a.hw, mitadAlto: a.hh });
    };

    const progreso = () => {
      const sec = seccion.current;
      const esc = escena.current;
      if (!sec || !esc) return;
      const caja = sec.getBoundingClientRect();
      const recorrido = caja.height - esc.offsetHeight;
      // 16 px: el «top-4» con el que la escena queda fija
      p = recorrido > 0 ? acotar((16 - caja.top) / recorrido) : 0;
    };

    const llegada = () => (reducido ? (pSuave > 0.5 ? 1 : 0) : acotar((pSuave - 0.12) / 0.76));

    const dibujar = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const q = llegada();
      const aMapa = reducido ? q : ease(acotar((q - 0.3) / 0.45));

      // «350 escaños» en el centro del hemiciclo, como en los de los «¿y si…?»; se apaga al echar a volar
      const aTotal = reducido ? (q < 0.2 ? 1 : 0) : 1 - ease(acotar(q / 0.2));
      if (aTotal > 0.01 && hemiR > 0) {
        ctx.save();
        ctx.globalAlpha = aTotal;
        ctx.textAlign = "center";
        ctx.fillStyle = "#0b0b0b";
        ctx.font = `500 ${Math.round(hemiR * 0.149)}px ${fuente}`;
        ctx.fillText(String(TOTAL_ESCANOS), hemiCx, hemiCy - hemiR * 0.108);
        ctx.fillStyle = "#4d4d4d";
        ctx.font = `400 ${Math.max(13, Math.round(hemiR * 0.05))}px ${fuente}`;
        ctx.fillText("escaños", hemiCx, hemiCy - hemiR * 0.02);
        ctx.restore();
      }

      if (aMapa > 0.01) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(s, s);
        ctx.globalAlpha = aMapa;
        ctx.lineJoin = "round";
        // «evenodd»: los huecos (enclaves como Treviño, dentro de Álava) lo son sin importar
        // el sentido en que venga dibujado el contorno.
        const pintar = (r: (typeof rutas)[number], fondo: string, trazo: string, ancho: number) => {
          ctx.fillStyle = fondo;
          ctx.fill(r.path, "evenodd");
          ctx.strokeStyle = trazo;
          ctx.lineWidth = ancho / s;
          ctx.stroke(r.path);
        };
        for (const r of rutas) if (r.codigo !== sel && r.codigo !== hover) pintar(r, "#f1f0ec", "#c3c2b7", 0.9);
        // La provincia bajo el cursor o marcada va la última: así ninguna vecina le tapa el contorno
        for (const r of rutas) if (r.codigo === hover && r.codigo !== sel) pintar(r, "#cbcac2", "#4d4d4d", 1.8);
        for (const r of rutas) if (r.codigo === sel) pintar(r, "#a9a8a0", "#0b0b0b", 2.2);
        ctx.restore();
      }

      const d = 2 * rB;
      for (let i = 0; i < TOTAL_ESCANOS; i++) {
        const A = hemi[i];
        const dest = DESTINOS[i];
        const c = centrosPx.get(dest.codigo)!;
        const bx = c.x + dest.dx * d;
        const by = c.y - dest.dy * d;
        const t = reducido ? q : ease(acotar((q - RETRASO[i]) / (1 - 0.38)));
        const x = lerp(A.x, bx, t);
        const y = lerp(A.y, by, t) - Math.sin(Math.PI * t) * arco;
        const r = lerp(rA, rB, t);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = hexGrupo(ASIENTOS[i]);
        ctx.fill();
        ctx.lineWidth = Math.min(0.8, r * 0.22);
        ctx.strokeStyle = "rgba(11,11,11,0.3)";
        ctx.stroke();
      }
    };

    // Qué provincia hay bajo el puntero: primero las montañas, luego el contorno
    const buscar = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      const x = clientX - r.left;
      const y = clientY - r.top;
      let mejor: string | null = null;
      let mejorD = Infinity;
      for (const [codigo, c] of centrosPx) {
        const dx = Math.abs(x - c.x);
        const dy = Math.abs(y - c.y);
        if (dx <= c.mitadAncho && dy <= c.mitadAlto && dx * dx + dy * dy < mejorD) {
          mejor = codigo;
          mejorD = dx * dx + dy * dy;
        }
      }
      if (mejor) return mejor;
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
      for (const ruta of rutas) if (ctx.isPointInPath(ruta.path, x * dpr, y * dpr, "evenodd")) return ruta.codigo;
      return null;
    };
    const listo = () => llegada() > 0.97;

    const alMover = (e: PointerEvent) => {
      const c = listo() ? buscar(e.clientX, e.clientY) : null;
      canvas.style.cursor = c ? "pointer" : "default";
      if (c !== hover) {
        hover = c;
        sucio = true;
      }
      const a = aviso.current;
      if (a) {
        if (c) {
          const prov = nombreDe.get(c)!;
          const r = canvas.getBoundingClientRect();
          a.textContent = `${prov.nombre} · ${prov.escanos} ${prov.escanos === 1 ? "escaño" : "escaños"}`;
          a.style.opacity = "1";
          a.style.transform = `translate(${Math.min(e.clientX - r.left + 14, W - 220)}px, ${e.clientY - r.top + 14}px)`;
        } else a.style.opacity = "0";
      }
    };
    const alSalir = () => {
      hover = null;
      sucio = true;
      if (aviso.current) aviso.current.style.opacity = "0";
    };
    const alPulsar = (e: PointerEvent) => {
      if (!listo()) return;
      const c = buscar(e.clientX, e.clientY);
      if (c) {
        sel = c;
        sucio = true;
        setSeleccion(c);
      }
    };

    medir();
    progreso();
    pSuave = reducido ? p : 0;
    const alScroll = () => progreso();
    const alRedimensionar = () => {
      medir();
      progreso();
    };
    window.addEventListener("scroll", alScroll, { passive: true });
    window.addEventListener("resize", alRedimensionar);
    canvas.addEventListener("pointermove", alMover);
    canvas.addEventListener("pointerleave", alSalir);
    canvas.addEventListener("click", alPulsar as unknown as EventListener);
    const observador = new ResizeObserver(alRedimensionar);
    observador.observe(escena.current!);

    let raf = 0;
    const bucle = () => {
      raf = requestAnimationFrame(bucle);
      const dif = p - pSuave;
      if (Math.abs(dif) > 0.0004) {
        pSuave = reducido ? p : pSuave + dif * 0.2;
        sucio = true;
      }
      if (sucio) {
        dibujar();
        sucio = false;
        const f = pSuave < 0.1 ? 0 : pSuave < 0.86 ? 1 : 2;
        if (f !== faseActual) {
          faseActual = f;
          setFase(f as 0 | 1 | 2);
        }
      }
    };
    bucle();
    api.current = {
      seleccionar: (c) => {
        sel = c;
        sucio = true;
      },
    };

    return () => {
      api.current = null;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", alScroll);
      window.removeEventListener("resize", alRedimensionar);
      canvas.removeEventListener("pointermove", alMover);
      canvas.removeEventListener("pointerleave", alSalir);
      canvas.removeEventListener("click", alPulsar as unknown as EventListener);
      observador.disconnect();
    };
  }, []);

  const info = FASES[fase];
  const propios = PARTIDOS_2023.filter((p) => COLOR_PARTIDO[p.grupo]);
  const otros = PARTIDOS_2023.filter((p) => !COLOR_PARTIDO[p.grupo]);

  return (
    <>
      {/* El recorrido de scroll que da tiempo a que las bolitas vuelen */}
      <section
        ref={seccion}
        aria-label="Los escaños del Congreso de 2023, del hemiciclo a cada provincia"
        style={{ height: "calc(100svh + 240vh)" }}
      >
        <div ref={escena} className="sticky top-4 h-[calc(100svh-2rem)] overflow-hidden">
          <canvas
            ref={lienzo}
            role="img"
            aria-label={`Hemiciclo de 2023: ${PARTIDOS_2023.map((p) => `${p.grupo} ${p.escanos}`).join(", ")}. Al bajar, cada escaño se coloca en su provincia.`}
            className="absolute inset-0 h-full w-full"
          />

          <div ref={cabecera} className="pointer-events-none relative px-1">
            <h1 className="text-[clamp(30px,4.5vw,56px)] leading-[1.08] tracking-[-0.02em]">{info.titulo}</h1>
            <p className="mt-2 max-w-[640px] text-base text-(--text-secondary) sm:text-lg">{info.texto}</p>
            {/* Leyenda: un color por partido, con su número de escaños */}
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm sm:text-[15px]">
              {propios.map((p) => (
                <li key={p.grupo} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-3 rounded-full" style={{ background: COLOR_PARTIDO[p.grupo] }} />
                  <span>
                    {p.grupo} <span className="font-semibold tabular-nums">{p.escanos}</span>
                  </span>
                </li>
              ))}
              {otros.length > 0 && (
                <li className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-3 rounded-full" style={{ background: GRIS_OTROS }} />
                  <span>
                    {otros.map((o) => o.grupo).join(", ")}{" "}
                    <span className="font-semibold tabular-nums">{otros.reduce((s, o) => s + o.escanos, 0)}</span>
                  </span>
                </li>
              )}
            </ul>
          </div>

          <div
            ref={aviso}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-10 rounded-lg bg-background px-2.5 py-1 text-sm font-medium opacity-0 shadow-md ring-1 ring-foreground/15"
          />

          {fase === 0 && (
            <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
              Baja ↓
            </p>
          )}
          {/* La tabla D'Hondt de la provincia pulsada, al lado del mapa */}
          {fase === 2 && (
            <PanelProvincia
              codigo={seleccion}
              onCerrar={() => {
                setSeleccion(null);
                api.current?.seleccionar(null);
              }}
            />
          )}
        </div>
      </section>
    </>
  );
}
