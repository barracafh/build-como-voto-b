"use client";

// Formulario «¿Cómo voto?»: dos preguntas con opciones claras y un botón que
// lleva al bloque de la guía que explica ese caso. Es HTML de toda la vida
// (radio buttons), sin IA ni diálogo; las fechas del remate salen de
// src/datos/como-votar.ts, no de aquí.

import { useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { fecha, hitos, plazos, type Caso } from "@/datos/como-votar";

type Respuesta = { caso: Caso["id"]; titulo: string };

type Pregunta = {
  id: string;
  pregunta: string;
  ayuda: string;
  opciones: { texto: string; detalle: string; lleva: Respuesta | "siguiente" }[];
};

// Dos preguntas bastan: dónde vives y dónde estarás el 29. El caso de dudas
// queda en la portada, junto al botón, y el de accesibilidad, en la guía.
const arbol: Pregunta[] = [
  {
    id: "donde-vives",
    pregunta: "¿Dónde vives habitualmente?",
    ayuda: "Tu inscripción en el censo electoral depende de esto.",
    opciones: [
      {
        texto: "En España",
        detalle: "Estoy empadronado en un municipio español",
        lleva: "siguiente",
      },
      {
        texto: "En el extranjero",
        detalle:
          "Vivo fuera y estoy inscrito en el consulado (censo de residentes ausentes, CERA)",
        lleva: { caso: "cera", titulo: "Vivo en el extranjero" },
      },
    ],
  },
  {
    id: "donde-estaras",
    pregunta: "¿Dónde estarás el 29 de noviembre, día de la votación?",
    ayuda:
      "Solo importa ese día: si esos días estás en otra ciudad, también cuenta.",
    opciones: [
      {
        texto: "En mi municipio",
        detalle: "Podré ir a mi mesa electoral ese día",
        lleva: { caso: "presencial", titulo: "Votas en persona en tu mesa" },
      },
      {
        texto: "Fuera de mi municipio, en España",
        detalle: "Estaré en otra ciudad o no podré acudir a la mesa",
        lleva: { caso: "correo", titulo: "Voto por correo desde España" },
      },
      {
        texto: "En el extranjero",
        detalle:
          "Vivo en España pero ese viaje me pilla fuera (temporalmente ausente, ERTA)",
        lleva: {
          caso: "erta",
          titulo: "Temporalmente en el extranjero (ERTA)",
        },
      },
    ],
  },
];

// El resultado repite la fecha que apremia de cada caso, para que quien no
// abra la guía sepa si aún está a tiempo.
const remate: Record<Caso["id"], { plazo: string; aviso: string }> = {
  presencial: {
    plazo: `Votación el ${hitos.votacion.fechas.toLowerCase()}, de 9:00 a 20:00`,
    aviso:
      "No hay trámite previo: consulta dónde te toca votar y acude con tu documento. Si quieres estar seguro de tu mesa, el INE lo consulta en línea.",
  },
  correo: {
    plazo: `Pide el voto hasta el ${fecha(plazos.correoSolicitud.fin)} y devuélvelo hasta el ${fecha(plazos.correoRemision.fin)}`,
    aviso:
      "El trámite se hace en la web de Correos (con certificado digital) o en cualquier oficina de Correos. Después te llega la documentación a casa y la devuelves por correo certificado, gratis.",
  },
  cera: {
    plazo: `Correo: entrega en Correos antes del ${fecha(plazos.ceraCorreo.fin)} · Urna en el consulado: hasta el ${fecha(plazos.ceraUrna.fin)}`,
    aviso:
      "No tienes que pedir nada: la documentación llega sola a tu dirección consular. Luego eliges votar por correo postal o en urna en el consulado.",
  },
  erta: {
    plazo: `Pide la documentación hasta el ${fecha(plazos.ertaSolicitud.fin)} y devuelve el voto hasta el ${fecha(plazos.ertaRemision.fin)}`,
    aviso:
      "Este trámite no se hace en Correos: se pide en la oficina consular y lo tramita la Oficina del Censo Electoral de tu provincia.",
  },
  braille: {
    plazo: `Pide el kit Braille hasta el ${fecha(plazos.braille.fin)}`,
    aviso:
      "El kit se recoge en tu mesa el día de la votación y es incompatible con el voto por correo. También puedes ir acompañado de una persona de confianza.",
  },
  dudas: {
    plazo: "Sin trámites: la votación es libre y secreta",
    aviso:
      "En la guía tienes qué documento vale para votar, qué pasa si no sales en el censo y qué es un voto nulo o en blanco.",
  },
};

export function FormularioCaso({ destino = "" }: { destino?: string }) {
  const [paso, setPaso] = useState<number>(0);
  const [resultado, setResultado] = useState<Respuesta | null>(null);

  const pregunta = arbol[paso];

  const alCambiar = (opcion: (typeof arbol)[0]["opciones"][0]) => {
    if (opcion.lleva === "siguiente") {
      setPaso((p) => Math.min(p + 1, arbol.length - 1));
      setResultado(null);
    } else {
      setResultado(opcion.lleva);
    }
  };

  const reiniciar = () => {
    setPaso(0);
    setResultado(null);
  };

  const irAlCaso = (casoId: string) => {
    const destinoFinal = `${destino}#caso-${casoId}`;
    const ancla = document.getElementById(`caso-${casoId}`);
    if (ancla) {
      ancla.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = destinoFinal;
    }
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="rounded-2xl ring-1 ring-border bg-background px-(--page-gutter) py-6 text-base md:px-8 md:py-8"
    >
      {resultado ? (
        <div className="grid gap-4">
          <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
            Tu caso: {resultado.titulo}
          </p>
          <p className="font-heading text-[clamp(24px,3vw,32px)] leading-tight">
            {remate[resultado.caso].plazo}
          </p>
          <p className="text-[15px] text-(--text-secondary)">
            {remate[resultado.caso].aviso}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => irAlCaso(resultado.caso)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
            >
              Ver mi caso paso a paso
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={reiniciar}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-(--text-secondary) outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              No es mi caso
            </button>
          </div>
        </div>
      ) : (
        <fieldset className="grid gap-3">
          <legend className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
            {`Pregunta ${paso + 1} de ${arbol.length}`}
          </legend>
          <p className="text-lg font-medium">{pregunta.pregunta}</p>
          <p className="text-[15px] text-(--text-secondary)">{pregunta.ayuda}</p>

          {pregunta.opciones.map((opcion) => (
            <label
              key={opcion.texto}
              className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl bg-muted px-4 py-3 transition-colors has-[input:checked]:ring-2 has-[input:checked]:ring-foreground/60 hover:bg-(--surface) focus-within:ring-3 focus-within:ring-ring/50"
            >
              <input
                type="radio"
                name={pregunta.id}
                value={opcion.texto}
                onChange={() => alCambiar(opcion)}
                className="mt-1 size-4 accent-(--brand)"
              />
              <span className="min-w-0">
                <span className="block font-medium">{opcion.texto}</span>
                <span className="mt-0.5 block text-sm text-(--text-secondary)">
                  {opcion.detalle}
                </span>
              </span>
            </label>
          ))}
          {paso > 0 && (
            <button
              type="button"
              onClick={() => {
                setPaso((p) => Math.max(p - 1, 0));
                setResultado(null);
              }}
              className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg px-4 text-sm font-medium text-(--text-secondary) outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Volver a la pregunta anterior
            </button>
          )}
        </fieldset>
      )}
    </form>
  );
}

