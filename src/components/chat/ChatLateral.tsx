"use client";

import { RotateCcw, SendHorizontal, X } from "lucide-react";
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
      className="fixed inset-x-2 bottom-2 z-40 flex h-[min(560px,calc(100dvh-16px))] flex-col overflow-hidden rounded-2xl bg-background shadow-(--shadow-overlay) sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[380px]"
    >
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id="chat-titulo" className="font-sans text-base font-medium">
            Dudas sobre cómo votar
          </h2>
          <p className="text-sm text-(--text-secondary)">
            Cada respuesta enlaza su fuente oficial
          </p>
        </div>
        {mensajes.length > 0 && (
          <Button
            variant="ghost"
            size="lg"
            onClick={nuevaConversacion}
            aria-label="Nueva conversación"
            title="Nueva conversación"
            className="size-9 px-0 text-(--text-secondary) sm:w-auto sm:px-2.5"
          >
            <RotateCcw aria-hidden="true" />
            <span aria-hidden="true" className="hidden sm:inline">
              Nueva
            </span>
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
          <div className="grid gap-4">
            <div className="grid grid-cols-[88px_minmax(0,1fr)] items-end gap-2">
              <Voton estado={saludo} className="h-[94px] w-[88px]" />
              <p
                data-entra
                className="mb-10 rounded-xl rounded-bl-sm bg-muted px-3 py-2 text-[15px]"
              >
                ¡Hola! Soy Votón. Pregúntame lo que quieras sobre cómo se vota
                el 29 de noviembre: voto por correo, plazos, mesas electorales…
              </p>
            </div>
            <p data-entra className="text-sm text-(--text-secondary)">
              No escribas datos personales.
            </p>
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
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => void preguntar(s)}
                      className="h-auto min-h-11 w-full justify-start px-3 py-2.5 text-left text-[15px] leading-snug font-normal whitespace-normal"
                    >
                      {s}
                    </Button>
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
                  className="ml-8 justify-self-end rounded-xl bg-primary px-3 py-2 text-[15px] text-primary-foreground"
                >
                  <span className="sr-only">Tú: </span>
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                </li>
              ) : (
              <li
                key={i}
                ref={entrada("abajo")}
                className="mr-2 grid grid-cols-[56px_minmax(0,1fr)] items-end gap-1"
              >
                {/* Votón reacciona a la última respuesta. */}
                {i === mensajes.length - 1 && !enviando ? (
                  <ReaccionVoton conFuentes={!!m.fuentes?.length} />
                ) : (
                  <span aria-hidden="true" />
                )}
                <div className="min-w-0 rounded-xl rounded-bl-sm bg-muted px-3 py-2 text-[15px] [overflow-wrap:anywhere]">
                <span className="sr-only">Asistente: </span>
                <Respuesta texto={m.texto} />
                {m.fuentes && m.fuentes.length > 0 && (
                  <div data-bloque className="mt-2 border-t pt-2">
                    <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
                      Fuentes
                    </p>
                    <ul className="mt-1 grid gap-1">
                      {m.fuentes.map((f) => (
                        <li key={f.url}>
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-sm text-sm underline underline-offset-2 outline-none [overflow-wrap:anywhere] hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            {f.nombre}
                            <span className="block font-mono text-xs text-(--text-secondary) no-underline">
                              {sinProtocolo(f.url)}
                            </span>
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
                className="mr-2 grid grid-cols-[56px_minmax(0,1fr)] items-end gap-1 text-[15px] text-(--text-secondary)"
              >
                <Voton estado="piensa" className="h-[60px] w-14" />
                <span className="justify-self-start rounded-xl rounded-bl-sm bg-muted px-3 py-2">
                  Buscando en las fuentes oficiales…
                </span>
              </li>
            )}
          </ol>
        )}
      </div>

      <form onSubmit={enviar} className="flex items-end gap-2 border-t p-3">
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
          className="field-sizing-content max-h-32 min-h-11 w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button
          type="submit"
          variant="sunset"
          size="icon-lg"
          disabled={!texto.trim() || enviando}
          aria-label="Enviar pregunta"
          className="size-11 shrink-0"
        >
          <SendHorizontal aria-hidden="true" />
        </Button>
      </form>
    </section>
  );
}
