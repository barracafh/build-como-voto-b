"use client";

import { LoaderCircle, MessageCircle, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { MensajeChat, RespuestaChat } from "@/app/api/chat/route";
import type { Source } from "@/components/Fuentes";
import { Button } from "@/components/ui/button";
import { ruta } from "@/config/sitio";

type Mensaje = MensajeChat & { fuentes?: Source[] };

const sinProtocolo = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/\/$/, "");

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

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    const pregunta = texto.trim();
    if (!pregunta || enviando) return;
    const historial: Mensaje[] = [...mensajes, { rol: "usuario", texto: pregunta }];
    setMensajes(historial);
    setTexto("");
    setEnviando(true);
    try {
      const res = await fetch(ruta("/api/chat"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mensajes: historial.map(({ rol, texto }) => ({ rol, texto })),
        }),
      });
      const data: Partial<RespuestaChat> & { error?: string } = await res.json();
      setMensajes((m) => [
        ...m,
        {
          rol: "asistente",
          texto: data.respuesta ?? data.error ?? "No he podido responder.",
          fuentes: data.fuentes,
        },
      ]);
    } catch {
      setMensajes((m) => [
        ...m,
        { rol: "asistente", texto: "No he podido conectar. Inténtalo de nuevo." },
      ]);
    } finally {
      setEnviando(false);
    }
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
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 id="chat-titulo" className="font-sans text-base font-medium">
            Dudas sobre cómo votar
          </h2>
          <p className="text-sm text-(--text-secondary)">
            Cada respuesta enlaza su fuente oficial
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={cerrar}
          aria-label="Cerrar el chat"
        >
          <X aria-hidden="true" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {mensajes.length === 0 ? (
          <p className="text-[15px] text-(--text-secondary)">
            Pregunta lo que quieras sobre cómo se vota el 29 de noviembre: voto
            por correo, plazos, mesas electorales… No escribas datos personales.
          </p>
        ) : (
          <ol ref={lista} aria-live="polite" className="grid gap-3">
            {mensajes.map((m, i) => (
              <li
                key={i}
                className={
                  m.rol === "usuario"
                    ? "ml-8 justify-self-end rounded-xl bg-primary px-3 py-2 text-[15px] text-primary-foreground"
                    : "mr-8 rounded-xl bg-muted px-3 py-2 text-[15px]"
                }
              >
                <span className="sr-only">
                  {m.rol === "usuario" ? "Tú: " : "Asistente: "}
                </span>
                <p className="whitespace-pre-wrap">{m.texto}</p>
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
          maxLength={2000}
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
