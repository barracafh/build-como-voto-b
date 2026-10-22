"use client";

import {
  LoaderCircle,
  MessageCircle,
  RotateCcw,
  SendHorizontal,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { MensajeChat, RespuestaChat } from "@/app/api/chat/route";
import type { Source } from "@/components/Fuentes";
import { Button } from "@/components/ui/button";
import { ruta } from "@/config/sitio";

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
          <p key={i} className="whitespace-pre-line">
            {b.texto}
          </p>
        ) : (
          <ol key={i} start={b.inicio} className="grid gap-2">
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
  // Cambia al empezar una conversación nueva para descartar respuestas viejas.
  const conversacion = useRef(0);

  useEffect(() => {
    if (abierto) campo.current?.focus();
  }, [abierto]);

  useEffect(() => {
    lista.current?.lastElementChild?.scrollIntoView({ block: "end" });
  }, [mensajes, enviando]);

  function cerrar() {
    setAbierto(false);
    boton.current?.focus();
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
      <Button
        ref={boton}
        variant="sunset"
        size="lg"
        onClick={() => setAbierto(true)}
        aria-expanded={false}
        aria-controls="chat-lateral"
        className="fixed right-4 bottom-4 z-40 h-11 gap-2 rounded-full px-4 text-[15px] shadow-(--shadow-overlay)"
      >
        <MessageCircle aria-hidden="true" />
        Pregunta tus dudas
      </Button>
    );

  return (
    <section
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
            <p className="text-[15px] text-(--text-secondary)">
              Pregunta lo que quieras sobre cómo se vota el 29 de noviembre:
              voto por correo, plazos, mesas electorales… No escribas datos
              personales.
            </p>
            <div className="grid gap-2">
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
            {mensajes.map((m, i) => (
              <li
                key={i}
                className={
                  m.rol === "usuario"
                    ? "ml-8 justify-self-end rounded-xl bg-primary px-3 py-2 text-[15px] text-primary-foreground"
                    : "mr-8 min-w-0 rounded-xl bg-muted px-3 py-2 text-[15px] [overflow-wrap:anywhere]"
                }
              >
                <span className="sr-only">
                  {m.rol === "usuario" ? "Tú: " : "Asistente: "}
                </span>
                {m.rol === "usuario" ? (
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                ) : (
                  <Respuesta texto={m.texto} />
                )}
                {m.fuentes && m.fuentes.length > 0 && (
                  <div className="mt-2 border-t pt-2">
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
              </li>
            ))}
            {enviando && (
              <li className="mr-8 inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-[15px] text-(--text-secondary)">
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
                Buscando en las fuentes oficiales…
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
