"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import mapa from "@/datos/mapa-provincias.json";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { comunidadDe } from "@/lib/comunidades";
import { BARRERA_PCT } from "@/lib/dhondt";
import { COLOR_PARTIDO, GRIS_OTROS, calcularMapa, colorGrupo } from "@/lib/mapa";
import { calcularNacional, type Metodo } from "@/lib/nacional";
import { DesgloseProvincia } from "./DesgloseProvincia";
import { DetalleProvincia } from "./DetalleProvincia";
import { Mapa3D } from "./Mapa3D";
import { ResultadoNacional } from "./ResultadoNacional";
import { SelectorTerritorio } from "./SelectorTerritorio";

const num = (v: number) => v.toLocaleString("es-ES");
const PEQUENAS = new Set(["51", "52"]); // Ceuta y Melilla: círculo clicable, el polígono no se ve

type Hover = { codigo: string; x: number; y: number };
type Sistema = "provincias" | Metodo;

const SISTEMAS: { id: Sistema; titulo: string; texto: string }[] = [
  {
    id: "provincias",
    titulo: "Como ahora: por provincias",
    texto: "Cada provincia reparte sus escaños por separado. Es lo que pasó en 2023.",
  },
  {
    id: "dhondt",
    titulo: "Toda España a la vez · D'Hondt",
    texto:
      "Los 350 escaños se reparten con los votos de todo el país y la misma fórmula D'Hondt: un voto vale lo mismo viva donde viva quien lo da.",
  },
  {
    id: "proporcional",
    titulo: "Toda España a la vez · proporcional",
    texto:
      "Los 350 escaños se reparten en proporción exacta a los votos de todo el país: cada partido recibe los que le tocan por su porcentaje (restos mayores).",
  },
];

const ATAJOS = [
  { v: 0, t: "Sin barrera" },
  { v: 3, t: "3 % (la ley)" },
  { v: 5, t: "5 %" },
  { v: 10, t: "10 %" },
];

export function MapaEspana() {
  const idSlider = useId();
  const idRayas = `rayas-${useId().replace(/:/g, "")}`;
  const contenedor = useRef<HTMLDivElement>(null);
  const envoltorio = useRef<HTMLDivElement>(null);
  const [sistema, setSistema] = useState<Sistema>("provincias");
  const [barrera, setBarrera] = useState(BARRERA_PCT);
  const [codigo, setCodigo] = useState("46");
  const [hover, setHover] = useState<Hover | null>(null);
  const [vista, setVista] = useState<"3d" | "plano">("3d");
  const [sin3d, setSin3d] = useState(false);
  const [desglose, setDesglose] = useState(false);
  const [foco, setFoco] = useState<string | null>(null);

  const r = useMemo(() => calcularMapa(barrera), [barrera]);
  const nacional = useMemo(
    () => (sistema === "provincias" ? null : calcularNacional(barrera, sistema)),
    [sistema, barrera],
  );
  const seleccionada = r.porCodigo.get(codigo)!;
  const esLaLey = barrera === BARRERA_PCT;
  const vista3d = vista === "3d" && !sin3d;
  const infoSistema = SISTEMAS.find((s) => s.id === sistema)!;

  // Totales del Congreso con el sistema elegido, y lo que pasó de verdad en 2023
  const oficial = useMemo(() => new Map(r.totales.map((t) => [t.grupo, t.oficial])), [r]);
  const totales = useMemo(() => {
    if (!nacional) return r.totales;
    return nacional.filas
      .map((f) => ({ grupo: f.grupo, escanos: f.escanos, oficial: oficial.get(f.grupo) ?? 0 }))
      .filter((t) => t.escanos > 0 || t.oficial > 0)
      .sort((a, b) => Math.max(b.escanos, b.oficial) - Math.max(a.escanos, a.oficial));
  }, [nacional, r, oficial]);
  const maximo = Math.max(1, ...totales.map((t) => Math.max(t.escanos, t.oficial)));
  const cambios = totales
    .filter((t) => t.escanos !== t.oficial)
    .sort((a, b) => Math.abs(b.escanos - b.oficial) - Math.abs(a.escanos - a.oficial));

  // Pulsar una provincia: en 3D desmonta su comunidad en piezas por partido; en el plano abre su desglose.
  const elegir = (c: string) => {
    setCodigo(c);
    if (vista3d && !nacional) setFoco(comunidadDe(c).nombre);
    else setDesglose(true);
  };
  const cambiarSistema = (s: Sistema) => {
    setSistema(s);
    setFoco(null);
    setDesglose(false);
  };

  useEffect(() => {
    if (!foco) return;
    const alTeclear = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setFoco(null);
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [foco]);

  const hoverRes = hover ? r.porCodigo.get(hover.codigo) : undefined;
  const cuenta = (g: string | ((x: string | null) => boolean)) =>
    [...r.porCodigo.values()].filter((x) =>
      typeof g === "string" ? x.ganador === g : g(x.ganador),
    ).length;

  // Leyenda: un color por partido con escaños; los de un solo escaño comparten el gris.
  const propios = totales.filter((t) => t.escanos > 0 && COLOR_PARTIDO[t.grupo]);
  const otros = totales.filter((t) => t.escanos > 0 && !COLOR_PARTIDO[t.grupo]);
  const leyenda = [
    ...propios.map((t) => ({
      t: t.grupo,
      color: COLOR_PARTIDO[t.grupo],
      escanos: t.escanos,
      gana: nacional ? 0 : cuenta(t.grupo),
    })),
    ...(otros.length
      ? [
          {
            t: `Otros (${otros.map((o) => o.grupo).join(", ")})`,
            color: GRIS_OTROS,
            escanos: otros.reduce((m, o) => m + o.escanos, 0),
            gana: nacional ? 0 : cuenta((x) => !!x && !COLOR_PARTIDO[x]),
          },
        ]
      : []),
  ];

  const textoProvincia = (c: string) => {
    const x = r.porCodigo.get(c)!;
    return x.ganador
      ? `${x.provincia.nombre}: gana ${x.ganador} con ${x.escanosGanador} de ${x.provincia.escanos} escaños${x.cambia ? ". El reparto cambia respecto a la ley" : ""}`
      : `${x.provincia.nombre}: ninguna candidatura llega a la barrera`;
  };

  // Posición del cursor relativa al contenedor del mapa, para colocar el aviso flotante.
  const sobre = (c: string | null, clientX = 0, clientY = 0) => {
    const caja = contenedor.current?.getBoundingClientRect();
    setHover(c && caja ? { codigo: c, x: clientX - caja.left, y: clientY - caja.top } : null);
  };

  const props = (c: string) => ({
    role: "button" as const,
    tabIndex: 0,
    "aria-label": textoProvincia(c),
    "aria-pressed": c === codigo,
    onClick: () => elegir(c),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        elegir(c);
      }
    },
    onPointerMove: (e: PointerEvent) => sobre(c, e.clientX, e.clientY),
    onPointerLeave: () => setHover(null),
    className:
      "cursor-pointer outline-none stroke-background focus-visible:stroke-foreground [stroke-linejoin:round]",
  });

  // Resumen de lo que cambia con el sistema y la barrera elegidos
  const resumen = nacional
    ? cambios.length === 0
      ? "Con estas reglas el reparto sale igual que en 2023."
      : `Respecto a 2023: ${cambios
          .slice(0, 5)
          .map((t) => `${t.grupo} ${t.escanos - t.oficial > 0 ? "+" : "−"}${Math.abs(t.escanos - t.oficial)}`)
          .join(", ")}.`
    : esLaLey
      ? "Esto es lo que pasó en 2023: la ley fija el 3 %. Prueba otra barrera, o repartir toda España a la vez."
      : r.provinciasQueCambian === 0
        ? `Con ${barrera === 0 ? "ninguna barrera" : `el ${num(barrera)} %`} no cambia el reparto en ninguna de las 52 provincias.`
        : `Con ${barrera === 0 ? "ninguna barrera" : `el ${num(barrera)} %`} cambia el reparto en ${r.provinciasQueCambian} de 52 provincias${vista3d ? "" : " (rayadas en el mapa)"}.`;

  return (
    <div className="[&>*+*]:mt-10">
      {/* Controles del «¿y si…?» */}
      <Card render={<section />} className="gap-5 px-6 py-6 text-base">
        <div>
          <h2 className="text-lg font-medium">¿Y si cambiamos las reglas?</h2>
          <div role="group" aria-label="Sistema de reparto" className="mt-3 flex flex-wrap gap-2">
            {SISTEMAS.map((s) => (
              <Button
                key={s.id}
                variant={sistema === s.id ? "secondary" : "outline"}
                aria-pressed={sistema === s.id}
                onClick={() => cambiarSistema(s.id)}
              >
                {s.titulo}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-[15px] text-(--text-secondary)">{infoSistema.texto}</p>
        </div>

        <div>
          <label htmlFor={idSlider} className="text-base font-medium">
            Barrera mínima:{" "}
            <span className="tabular-nums">{barrera === 0 ? "sin barrera" : `${num(barrera)} %`}</span>
          </label>
          <input
            id={idSlider}
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={barrera}
            onChange={(e) => setBarrera(Number(e.target.value))}
            aria-valuetext={barrera === 0 ? "sin barrera" : `${num(barrera)} por ciento`}
            className="mt-3 block w-full accent-foreground"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {ATAJOS.map((a) => (
              <Button
                key={a.v}
                size="sm"
                variant={barrera === a.v ? "secondary" : "outline"}
                aria-pressed={barrera === a.v}
                onClick={() => setBarrera(a.v)}
              >
                {a.t}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-sm text-(--text-secondary)">
            «Sin barrera» significa que basta con ganar un escaño para entrar en el reparto.
          </p>
        </div>

        <p className="text-base text-(--text-secondary)" aria-live="polite">
          {resumen}
        </p>
      </Card>

      <div className="[&>*+*]:mt-12">
        {/* Mapa */}
        <section aria-labelledby="titulo-mapa" className="mx-auto max-w-[820px]">
          <h2
            id="titulo-mapa"
            className="font-sans text-[clamp(26px,4vw,34px)] leading-[1.1] tracking-[-0.03em]"
          >
            {nacional ? "Toda España, un solo bloque" : "Quién gana cada provincia"}
          </h2>
          <p className="mt-2 text-[15px] text-(--text-secondary)">
            {nacional
              ? "El país se une en un solo bloque y se parte en un montón de ladrillos por partido: uno por escaño, todos del mismo tamaño."
              : vista3d
                ? "Cada piso es un escaño, del color del partido que lo gana; la altura es el número de escaños de la provincia. Pulsa una provincia y su comunidad se desmonta en piezas por partido."
                : "Gana el partido con más escaños. Pulsa una provincia para ver su reparto."}
          </p>
          <div role="group" aria-label="Tipo de mapa" className="mt-4 flex gap-2">
            {(["3d", "plano"] as const).map((v) => (
              <Button
                key={v}
                variant={vista === v ? "secondary" : "outline"}
                aria-pressed={vista === v}
                disabled={v === "3d" && sin3d}
                onClick={() => {
                  setVista(v);
                  setFoco(null);
                }}
              >
                {v === "3d" ? "Mapa 3D" : "Mapa plano"}
              </Button>
            ))}
          </div>
          {sin3d && (
            <p className="mt-2 text-sm text-(--text-secondary)">
              Este navegador no puede dibujar el 3D: te enseñamos el mapa plano.
            </p>
          )}

          {nacional && !vista3d ? (
            <p className="mt-4 rounded-xl bg-muted p-4 text-base text-(--text-secondary)">
              Con toda España como una sola circunscripción no hay reparto por provincia, así que no
              hay mapa plano. El reparto está justo debajo; en «Mapa 3D» se ve el país partido en
              ladrillos.
            </p>
          ) : (
            /* En 3D el mapa queda fijo mientras se baja por la página y las provincias se separan */
            <div
              ref={envoltorio}
              className="mt-4"
              style={
                vista3d && !nacional
                  ? { height: "calc(clamp(380px, 72vw, 720px) + 90vh)" }
                  : undefined
              }
            >
              <div ref={contenedor} className={vista3d && !nacional ? "sticky top-4" : "relative"}>
                {vista3d ? (
                  <Mapa3D
                    envoltorio={envoltorio}
                    resultado={r}
                    nacional={nacional}
                    foco={foco}
                    codigo={codigo}
                    onSelect={elegir}
                    onHover={sobre}
                    onError={() => {
                      setSin3d(true);
                      setVista("plano");
                    }}
                  />
                ) : (
                  <svg
                    viewBox={`0 0 ${mapa.ancho} ${mapa.alto}`}
                    role="group"
                    aria-label="Mapa de España por provincias. Cada provincia es un botón."
                    className="h-auto w-full"
                  >
                    <defs>
                      <pattern
                        id={idRayas}
                        width="8"
                        height="8"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)"
                      >
                        <rect width="3.2" height="8" fill="#0b0b0b" fillOpacity="0.4" />
                      </pattern>
                    </defs>
                    {mapa.provincias.map((p) => {
                      const x = r.porCodigo.get(p.codigo)!;
                      const chica = PEQUENAS.has(p.codigo);
                      const [cx, cy] = [Number(p.centro[0]), Number(p.centro[1])];
                      return chica ? (
                        <g key={p.codigo}>
                          <path d={p.d} fill={colorGrupo(x.ganador)} pointerEvents="none" />
                          <circle
                            cx={cx}
                            cy={cy}
                            r={9}
                            fill={colorGrupo(x.ganador)}
                            strokeWidth={2}
                            {...props(p.codigo)}
                          />
                          {x.cambia && (
                            <circle cx={cx} cy={cy} r={9} fill={`url(#${idRayas})`} pointerEvents="none" />
                          )}
                          <text
                            x={cx + 14}
                            y={cy + 4}
                            fontSize={13}
                            className="fill-(--text-secondary)"
                            pointerEvents="none"
                          >
                            {p.nombre}
                          </text>
                        </g>
                      ) : (
                        <g key={p.codigo}>
                          <path d={p.d} fill={colorGrupo(x.ganador)} strokeWidth={1.2} {...props(p.codigo)} />
                          {x.cambia && <path d={p.d} fill={`url(#${idRayas})`} pointerEvents="none" />}
                        </g>
                      );
                    })}
                    {/* Provincia seleccionada, dibujada encima */}
                    {mapa.provincias
                      .filter((p) => p.codigo === codigo)
                      .map((p) =>
                        PEQUENAS.has(p.codigo) ? (
                          <circle
                            key={p.codigo}
                            cx={Number(p.centro[0])}
                            cy={Number(p.centro[1])}
                            r={11}
                            fill="none"
                            className="stroke-foreground"
                            strokeWidth={3}
                            pointerEvents="none"
                          />
                        ) : (
                          <path
                            key={p.codigo}
                            d={p.d}
                            fill="none"
                            className="stroke-foreground"
                            strokeWidth={3}
                            strokeLinejoin="round"
                            pointerEvents="none"
                          />
                        ),
                      )}
                  </svg>
                )}

                {/* Vista de una comunidad desmontada: cómo volver al mapa */}
                {foco && vista3d && !nacional && (
                  <div className="absolute top-2 left-2 z-20 flex max-w-[60%] flex-wrap items-center gap-2 rounded-xl bg-background p-2 text-sm shadow-md ring-1 ring-foreground/15">
                    <Button variant="outline" size="sm" onClick={() => setFoco(null)}>
                      ← Volver al mapa
                    </Button>
                    <span className="font-medium">{foco}</span>
                  </div>
                )}

                {hover && hoverRes && !nacional && (
                  <div
                    role="presentation"
                    style={{
                      left: Math.min(hover.x + 14, (contenedor.current?.clientWidth ?? 0) - 230),
                      top: hover.y + 14,
                    }}
                    className="pointer-events-none absolute z-10 w-56 rounded-xl bg-background px-3 py-2 text-sm shadow-md ring-1 ring-foreground/15"
                  >
                    <p className="font-medium">{hoverRes.provincia.nombre}</p>
                    <p className="text-(--text-secondary)">
                      {hoverRes.ganador
                        ? `Gana ${hoverRes.ganador} · ${hoverRes.escanosGanador} de ${hoverRes.provincia.escanos} escaños`
                        : "Nadie llega a la barrera"}
                    </p>
                    <p className="mt-1 text-(--text-secondary)">
                      {Object.entries(hoverRes.porGrupo)
                        .filter(([, n]) => n > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([g, n]) => `${g} ${n}`)
                        .join(" · ")}
                    </p>
                    {hoverRes.cambia && <p className="mt-1 font-mono text-xs">Cambia respecto a la ley</p>}
                  </div>
                )}

                {desglose && !nacional && !vista3d && (
                  <DesgloseProvincia
                    resumen={seleccionada}
                    barreraPct={barrera}
                    onCerrar={() => setDesglose(false)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Leyenda: un color por partido; el nombre va siempre en texto */}
          <ul className="mt-4 grid gap-x-4 gap-y-2 text-[15px] sm:grid-cols-2">
            {leyenda.map((l) => (
              <li key={l.t} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1 size-3 shrink-0 rounded-sm"
                  style={{ background: l.color }}
                />
                <span>
                  {l.t}: <span className="tabular-nums">{l.escanos}</span>{" "}
                  {l.escanos === 1 ? "escaño" : "escaños"}
                  {l.gana > 0 && (
                    <>
                      {" "}
                      · gana en <span className="tabular-nums">{l.gana}</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {vista3d ? (
            <p className="mt-3 text-[15px] text-(--text-secondary)">
              Arrastra para girar y usa la rueda para acercar.
              {nacional
                ? " Cada bloque es un partido, con un piso por escaño."
                : " Al bajar por la página las comunidades autónomas se van separando entre sí y, dentro de cada una, sus provincias. Pulsa una provincia y su comunidad se desmonta en un bloque por partido; Escape o «Volver al mapa» la recompone."}
            </p>
          ) : (
            !nacional && (
              <p className="mt-3 flex items-center gap-2 text-[15px] text-(--text-secondary)">
                <svg aria-hidden="true" width="14" height="14" className="shrink-0">
                  <rect width="14" height="14" rx="2" fill="#e1e0d9" />
                  <rect width="14" height="14" rx="2" fill={`url(#${idRayas})`} />
                </svg>
                Rayada: el reparto de escaños cambia respecto a la ley (3 %).
              </p>
            )
          )}
        </section>

        {/* Reparto nacional, o detalle de la provincia elegida */}
        {nacional ? (
          <ResultadoNacional nacional={nacional} oficial={oficial} />
        ) : (
          <section aria-labelledby="titulo-detalle" className="[&>*+*]:mt-6">
            <div>
              <h2
                id="titulo-detalle"
                className="font-sans text-[clamp(26px,4vw,34px)] leading-[1.1] tracking-[-0.03em]"
              >
                {seleccionada.provincia.nombre}
              </h2>
              <p className="mt-2 text-[15px] text-(--text-secondary)">
                {seleccionada.provincia.escanos}{" "}
                {seleccionada.provincia.escanos === 1 ? "escaño" : "escaños"} en juego
              </p>
            </div>
            <SelectorTerritorio codigo={codigo} onChange={setCodigo} />
            <DetalleProvincia provincia={seleccionada.provincia} barreraPct={barrera} sol={false} />
          </section>
        )}
      </div>

      {/* Totales en el Congreso */}
      <section aria-labelledby="titulo-totales" className="[&>*+*]:mt-4">
        <div>
          <h2
            id="titulo-totales"
            className="font-sans text-[clamp(26px,4vw,34px)] leading-[1.1] tracking-[-0.03em]"
          >
            Escaños en el Congreso
          </h2>
          <p className="mt-2 text-[15px] text-(--text-secondary)">
            {nacional ? "Con toda España como una sola circunscripción" : "Suma de las 52 provincias"}{" "}
            y una barrera del {num(barrera)} %
            {nacional || !esLaLey ? ", comparada con lo que pasó en 2023 (por provincias, 3 %)" : ""}. El
            Congreso tiene 350.
          </p>
        </div>
        <ul className="grid gap-2">
          {totales.map((t) => {
            const dif = t.escanos - t.oficial;
            const cambia = nacional || !esLaLey;
            return (
              <li
                key={t.grupo}
                className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_auto] items-center gap-3 text-[15px] sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_8rem]"
              >
                <span className="[overflow-wrap:anywhere]">{t.grupo}</span>
                <span aria-hidden="true" className="h-2.5 rounded-r-[4px] bg-muted">
                  <span
                    className="block h-full rounded-r-[4px]"
                    style={{
                      width: `${(t.escanos / maximo) * 100}%`,
                      background: colorGrupo(t.grupo),
                    }}
                  />
                </span>
                <span className="text-right tabular-nums">
                  <span className="font-semibold">{t.escanos}</span>
                  {cambia && dif !== 0 && (
                    <span className="ml-1 font-mono text-xs">
                      ({dif > 0 ? "▲ +" : "▼ "}
                      {dif})
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Alternativa en texto al mapa */}
      {!nacional && (
        <details className="rounded-xl ring-1 ring-foreground/10">
          <summary className="min-h-11 cursor-pointer px-4 py-3 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Ver el ganador de cada provincia en una tabla
          </summary>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full border-collapse text-left text-[15px] tabular-nums">
              <caption className="sr-only">
                Ganador de cada provincia con una barrera del {num(barrera)} %
              </caption>
              <thead>
                <tr className="sticky top-0 bg-muted text-sm text-(--text-secondary)">
                  <th scope="col" className="px-4 py-3 font-medium">Provincia</th>
                  <th scope="col" className="px-4 py-3 font-medium">Gana</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Escaños</th>
                  <th scope="col" className="px-4 py-3 font-medium">Cambia vs. ley</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...r.porCodigo.values()]
                  .sort((a, b) => a.provincia.nombre.localeCompare(b.provincia.nombre, "es"))
                  .map((x) => (
                    <tr key={x.provincia.codigo}>
                      <th scope="row" className="px-4 py-2 font-medium">
                        <button
                          type="button"
                          onClick={() => setCodigo(x.provincia.codigo)}
                          className="text-left underline-offset-4 hover:underline focus-visible:underline"
                        >
                          {x.provincia.nombre}
                        </button>
                      </th>
                      <td className="px-4 py-2">{x.ganador ?? "Nadie"}</td>
                      <td className="px-4 py-2 text-right">
                        {x.escanosGanador} de {x.provincia.escanos}
                      </td>
                      <td className="px-4 py-2">{x.cambia ? "Sí" : "No"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
