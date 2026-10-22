"use client";

import { ArrowUp, ArrowUpRight, ExternalLink, Lock, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { MensajeChat, RespuestaChat } from "@/app/api/chat/route";
import type { Source } from "@/components/Fuentes";
import { Button } from "@/components/ui/button";
import { BotonVoton } from "@/components/voton/BotonVoton";
import { entrada } from "@/components/voton/animar";
import { ABRIR_CHAT, type AbrirChat } from "@/components/voton/eventos";
import { Voton, useSaludo } from "@/components/voton/Voton";
import { ruta } from "@/config/sitio";

const sinMovimiento = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// El panel crece desde la esquina del botón y se recoge hacia ella.
const ORIGEN = "bottom right";
const SUAVE = "cubic-bezier(0.23, 1, 0.32, 1)";

type Mensaje = MensajeChat & { fuentes?: Source[] };

const SUGERENCIAS = [
  "Vivo en València y el 29 no estoy, ¿cómo voto?",
  "Vivo en Berlín, ¿cómo voto?",
  "Me ha tocado mesa, ¿me puedo librar?",
];

const sinProtocolo = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/\/$/, "");

// Solo el dominio: la ruta completa ensucia la tarjeta y está en el enlace.
const dominio = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return sinProtocolo(url);
  }
};

type Bloque =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "pasos"; inicio: number; pasos: string[] };

type Marca = { ini: number; fin: number; n: number; inicioLinea: boolean };

// «1. », «2) »… al principio de una línea o tras un espacio.
const MARCA = /(^|\s)(\d{1,2})[.)]\s+/g;

const parrafos = (texto: string): Bloque[] =>
  texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p): Bloque => ({ tipo: "parrafo", texto: p }));

// Convierte la respuesta en texto plano en párrafos y listas de pasos.
// Los pasos pueden venir en líneas propias o seguidos en la misma línea
// («…: 1. Solicita… 2. Puedes…»). Solo cuenta como lista una serie
// correlativa (1, 2, 3…) o un número al principio de línea, para no
// confundir «el día 29. Después…» con un paso.
function trocear(bruto: string): Bloque[] {
  const texto = bruto.replace(/\r\n?/g, "\n").replace(/\*\*/g, "");

  const marcas: Marca[] = [];
  for (const m of texto.matchAll(MARCA)) {
    const ini = (m.index ?? 0) + m[1].length;
    const linea = texto.slice(texto.lastIndexOf("\n", ini - 1) + 1, ini);
    marcas.push({
      ini,
      fin: (m.index ?? 0) + m[0].length,
      n: Number(m[2]),
      inicioLinea: linea.trim() === "",
    });
  }

  const series: Marca[][] = [];
  let actual: Marca[] | null = null;
  for (const marca of marcas) {
    const ultima = actual?.at(-1);
    if (actual && ultima && marca.n === ultima.n + 1) actual.push(marca);
    else if (marca.n === 1 || marca.inicioLinea) {
      actual = [marca];
      series.push(actual);
    }
  }
  const validas = series.filter(
    (s) => s.length >= 2 || s.every((m) => m.inicioLinea),
  );

  const bloques: Bloque[] = [];
  let pos = 0;
  for (const serie of validas) {
    if (serie[0].ini < pos) continue;
    bloques.push(...parrafos(texto.slice(pos, serie[0].ini)));
    const pasos = serie.map((marca, i) => {
      const siguiente = serie[i + 1];
      let fin = siguiente ? siguiente.ini : texto.indexOf("\n", marca.fin);
      if (fin === -1) fin = texto.length;
      pos = fin;
      return texto.slice(marca.fin, fin).trim();
    });
    bloques.push({ tipo: "pasos", inicio: serie[0].n, pasos });
  }
  bloques.push(...parrafos(texto.slice(pos)));
  return bloques;
}

function Respuesta({ texto }: { texto: string }) {
  return (
    <div className="grid gap-2">
      {trocear(texto).map((b, i) =>
        b.tipo === "parrafo" ? (
          <p key={i} data-bloque className="whitespace-pre-line">
            {b.texto}
          </p>
        ) : (
          <ol key={i} data-bloque start={b.inicio} className="grid gap-2">
            {b.pasos.map((paso, j) => (
              <li
                key={j}
                className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-2"
              >
                <span className="font-medium text-brand tabular-nums">
                  {b.inicio + j}
                </span>
                <p className="whitespace-pre-line">{paso}</p>
              </li>
            ))}
          </ol>
        ),
      )}
    </div>
  );
}

// Votón junto a la última respuesta: pulgar arriba si trae fuentes oficiales,
// se encoge de hombros si no; después vuelve al reposo.
function ReaccionVoton({ conFuentes }: { conFuentes: boolean }) {
  const [reposo, setReposo] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReposo(true), 2200);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <Voton
      estado={reposo ? "idle" : conFuentes ? "ok" : "fuera"}
      className="h-[60px] w-14"
    />
  );
}

// Panel lateral de dudas. La conversación vive solo en memoria: al recargar,
// se pierde, y así debe ser (no se guarda lo que escribe el ciudadano).
export function ChatLateral() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const lista = useRef<HTMLOListElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const cerrando = useRef(false);
  const devolverFoco = useRef(false);
  // Cambia al empezar una conversación nueva para descartar respuestas viejas.
  const conversacion = useRef(0);
  // Votón saluda cada vez que aparece la bienvenida.
  const saludo = useSaludo(abierto && mensajes.length === 0);

  useEffect(() => {
    if (abierto) campo.current?.focus();
    else if (devolverFoco.current) {
      devolverFoco.current = false;
      boton.current?.focus();
    }
  }, [abierto]);

  // Apertura: el panel sale de la esquina de Votón y la bienvenida entra
  // escalonada después.
  useEffect(() => {
    const el = panel.current;
    if (!abierto || !el || sinMovimiento()) return;
    el.animate(
      [
        { transform: "scale(0.2)", opacity: 0, transformOrigin: ORIGEN },
        { transform: "scale(1)", opacity: 1, transformOrigin: ORIGEN },
      ],
      { duration: 420, easing: SUAVE },
    );
    el.querySelectorAll<HTMLElement>("[data-entra]").forEach((hijo, i) =>
      hijo.animate(
        [
          { transform: "translateY(10px)", opacity: 0 },
          { transform: "translateY(0)", opacity: 1 },
        ],
        { duration: 360, delay: 260 + i * 110, easing: SUAVE, fill: "backwards" },
      ),
    );
  }, [abierto]);

  useEffect(() => {
    lista.current?.lastElementChild?.scrollIntoView({
      block: "end",
      behavior: sinMovimiento() ? "auto" : "smooth",
    });
  }, [mensajes, enviando]);

  // Otras partes de la página (el recorrido de la portada) abren el chat.
  useEffect(() => {
    const abrir = (e: Event) => {
      const { pregunta } = (e as CustomEvent<AbrirChat>).detail ?? {};
      if (pregunta) setTexto(pregunta);
      setAbierto(true);
    };
    window.addEventListener(ABRIR_CHAT, abrir);
    return () => window.removeEventListener(ABRIR_CHAT, abrir);
  }, []);

  function cerrar() {
    const el = panel.current;
    if (cerrando.current) return;
    devolverFoco.current = true;
    if (!el || sinMovimiento()) {
      setAbierto(false);
      return;
    }
    cerrando.current = true;
    el.animate(
      [
        { transform: "scale(1)", opacity: 1, transformOrigin: ORIGEN },
        { transform: "scale(0.2)", opacity: 0, transformOrigin: ORIGEN },
      ],
      { duration: 200, easing: "ease-in", fill: "forwards" },
    ).onfinish = () => {
      cerrando.current = false;
      setAbierto(false);
    };
  }

  function nuevaConversacion() {
    conversacion.current += 1;
    setMensajes([]);
    setTexto("");
    setEnviando(false);
    campo.current?.focus();
  }

  async function preguntar(bruta: string) {
    const pregunta = bruta.trim();
    if (!pregunta || enviando) return;
    const id = conversacion.current;
    const historial: Mensaje[] = [...mensajes, { rol: "usuario", texto: pregunta }];
    setMensajes(historial);
    setTexto("");
    setEnviando(true);
    let respuesta: Mensaje;
    try {
      const res = await fetch(ruta("/api/chat"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mensajes: historial.slice(-6).map(({ rol, texto }) => ({ rol, texto })),
        }),
      });
      const data: Partial<RespuestaChat> & { error?: string } = await res.json();
      respuesta = {
        rol: "asistente",
        texto: data.respuesta ?? data.error ?? "No he podido responder.",
        fuentes: data.fuentes,
      };
    } catch {
      respuesta = {
        rol: "asistente",
        texto: "No he podido conectar. Inténtalo de nuevo.",
      };
    }
    if (id !== conversacion.current) return;
    setMensajes((m) => [...m, respuesta]);
    setEnviando(false);
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    void preguntar(texto);
  }

  if (!abierto)
    return (
      <BotonVoton
        ref={boton}
        onClick={() => setAbierto(true)}
        controla="chat-lateral"
      />
    );

  return (
    <section
      ref={panel}
      id="chat-lateral"
      aria-labelledby="chat-titulo"
      onKeyDown={(e) => e.key === "Escape" && cerrar()}
      className="fixed inset-x-2 bottom-2 z-40 flex h-[min(640px,calc(100dvh-16px))] flex-col overflow-hidden rounded-3xl border bg-background shadow-(--shadow-overlay) sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[400px]"
    >
      {/* Cabecera como en una app de mensajería: Votón, su nombre y qué hace. */}
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <span className="grid size-11 shrink-0 place-items-start justify-center overflow-hidden rounded-full bg-muted">
          <Voton
            estado={enviando ? "piensa" : "idle"}
            className="mt-1.5 h-[60px] w-14 shrink-0"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="chat-titulo" className="font-sans text-base leading-tight font-medium">
            Votón
            <span className="sr-only">: dudas sobre cómo votar</span>
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-(--text-secondary)">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-brand" />
            <span className="truncate">
              {enviando ? "Buscando en las fuentes…" : "Respondo con la fuente oficial"}
            </span>
          </p>
        </div>
        {mensajes.length > 0 && (
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={nuevaConversacion}
            aria-label="Nueva conversación"
            title="Nueva conversación"
            className="text-(--text-secondary)"
          >
            <RotateCcw aria-hidden="true" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={cerrar}
          aria-label="Cerrar el chat"
        >
          <X aria-hidden="true" />
        </Button>
      </header>

      <div
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        {mensajes.length === 0 ? (
          <div className="grid gap-5">
            {/* Bienvenida: Votón saluda en su pequeño escenario. */}
            <div className="grid justify-items-center gap-3 rounded-2xl bg-muted px-5 pt-5 pb-5 text-center">
              <Voton estado={saludo} className="h-[128px] w-[120px]" />
              <div data-entra className="grid gap-1">
                <p className="text-lg leading-snug font-medium">¡Hola! Soy Votón.</p>
                <p className="text-[15px] text-(--text-secondary)">
                  Pregúntame cómo se vota el 29 de noviembre: voto por correo,
                  plazos, mesas electorales…
                </p>
              </div>
            </div>
            <div data-entra className="grid gap-2">
              <p
                id="chat-sugerencias"
                className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase"
              >
                Prueba con
              </p>
              <ul aria-labelledby="chat-sugerencias" className="grid gap-2">
                {SUGERENCIAS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => void preguntar(s)}
                      className="group flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border bg-background px-3.5 py-2.5 text-left text-[15px] leading-snug outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span>{s}</span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-(--text-secondary) transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <ol ref={lista} className="grid gap-3">
            {mensajes.map((m, i) =>
              m.rol === "usuario" ? (
                <li
                  key={i}
                  ref={entrada("derecha")}
                  className="ml-10 justify-self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[15px] text-primary-foreground"
                >
                  <span className="sr-only">Tú: </span>
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                </li>
              ) : (
                <li
                  key={i}
                  ref={entrada("abajo")}
                  className="mr-1 grid grid-cols-[48px_minmax(0,1fr)] items-end gap-1.5"
                >
                  {/* Votón reacciona a la última respuesta. */}
                  {i === mensajes.length - 1 && !enviando ? (
                    <ReaccionVoton conFuentes={!!m.fuentes?.length} />
                  ) : (
                    <span aria-hidden="true" />
                  )}
                  <div className="min-w-0 rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-[15px] [overflow-wrap:anywhere]">
                    <span className="sr-only">Votón: </span>
                    <Respuesta texto={m.texto} />
                    {m.fuentes && m.fuentes.length > 0 && (
                      <div data-bloque className="mt-3 grid gap-1.5">
                        <p className="font-mono text-[11px] tracking-[0.06em] text-(--text-secondary) uppercase">
                          Fuentes
                        </p>
                        <ul className="grid gap-1.5">
                          {m.fuentes.map((f) => (
                            <li key={f.url}>
                              <a
                                href={f.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-start gap-2 rounded-lg bg-background px-2.5 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                              >
                                <ExternalLink
                                  aria-hidden="true"
                                  className="mt-0.5 size-3.5 shrink-0 text-brand"
                                />
                                <span className="min-w-0">
                                  <span className="block text-sm leading-snug font-medium underline-offset-2 group-hover:underline">
                                    {f.nombre}
                                  </span>
                                  <span className="block truncate font-mono text-xs text-(--text-secondary)">
                                    {dominio(f.url)}
                                  </span>
                                </span>
                                <span className="sr-only"> (se abre en otra pestaña)</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </li>
              ),
            )}
            {enviando && (
              <li
                ref={entrada("abajo")}
                className="mr-1 grid grid-cols-[48px_minmax(0,1fr)] items-end gap-1.5 text-[15px] text-(--text-secondary)"
              >
                <Voton estado="piensa" className="h-[51px] w-12" />
                <span className="justify-self-start rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5">
                  Buscando en las fuentes oficiales…
                </span>
              </li>
            )}
          </ol>
        )}
      </div>

      <form onSubmit={enviar} className="border-t px-3 pt-3 pb-2">
        <div className="flex items-end gap-2 rounded-2xl border bg-background py-1.5 pr-1.5 pl-3.5 transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25 motion-reduce:transition-none">
          <label htmlFor="chat-pregunta" className="sr-only">
            Escribe tu pregunta
          </label>
          <textarea
            id="chat-pregunta"
            ref={campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) enviar(e);
            }}
            rows={1}
            placeholder="¿Cómo voto por correo?"
            className="field-sizing-content max-h-32 min-h-9 w-full resize-none bg-transparent py-1.5 text-base outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            variant="sunset"
            size="icon-lg"
            disabled={!texto.trim() || enviando}
            aria-label="Enviar pregunta"
            className="size-9 shrink-0 rounded-full"
          >
            <ArrowUp aria-hidden="true" />
          </Button>
        </div>
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-(--text-secondary)">
          <Lock aria-hidden="true" className="size-3" />
          No escribas datos personales.
        </p>
      </form>
    </section>
  );
}
