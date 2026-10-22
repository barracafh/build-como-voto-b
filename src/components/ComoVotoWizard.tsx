"use client";

// Asistente «¿Cómo voto?»: dos preguntas para averiguar la situación y
// llevar a la guía del caso. Es un formulario estático, sin IA: las respuestas
// solo escogen entre los casos de src/datos/como-votar.ts y las fechas que
// muestra el resultado salen de ese módulo, no de aquí.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, RotateCcw, Vote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
    ayuda: "Solo importa el día de la votación: si esos días estás en otra ciudad, también cuenta.",
    opciones: [
      {
        texto: "En mi municipio",
        detalle: "Podré ir a mi mesa electoral ese día",
        lleva: { caso: "presencial", titulo: "Votas en persona en tu mesa" },
      },
      {
        texto: "Fuera de mi municipio, en España",
        detalle: "Estaré en otra ciudad o no podré acudir a la mesa",
        lleva: {
          caso: "correo",
          titulo: "Voto por correo desde España",
        },
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

export function ComoVotoWizard() {
  const [abierto, setAbierto] = useState(false);
  const [pasoActual, setPasoActual] = useState(0);
  const [resultado, setResultado] = useState<Respuesta | null>(null);
  const [camino, setCamino] = useState<string[]>([]);
  const router = useRouter();

  const reiniciar = () => {
    setPasoActual(0);
    setResultado(null);
    setCamino([]);
  };

  const elegir = (opcion: (typeof arbol)[0]["opciones"][0]) => {
    setCamino((c) => [...c, opcion.texto]);
    if (opcion.lleva === "siguiente") {
      setPasoActual((p) => p + 1);
    } else {
      setResultado(opcion.lleva);
    }
  };

  const irALaGuia = (casoId: string) => {
    setAbierto(false);
    router.push(`/como-votar#caso-${casoId}`);
  };

  const casoId = resultado?.caso;

  const pregunta = arbol[pasoActual];

  return (
    <Dialog
      open={abierto}
      onOpenChange={(nuevo) => {
        setAbierto(nuevo);
        if (!nuevo) reiniciar();
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="group inline-flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl bg-foreground px-6 py-4 text-left text-lg font-medium text-background outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/60 hover:bg-foreground/90 sm:w-auto sm:min-w-[320px]"
          />
        }
      >
        <span className="flex items-center gap-3">
          <Vote aria-hidden="true" className="size-6 shrink-0" strokeWidth={1.75} />
          ¿Cómo voto?
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-5 motion-safe:transition-transform group-hover:translate-x-1"
        />
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl leading-snug">
            {resultado ? "Tu caso" : `Paso ${pasoActual + 1} de ${arbol.length}`}
          </DialogTitle>
          <DialogDescription className="text-[15px]">
            {resultado
              ? "Por tu respuesta, esto es lo que te toca. En la guía tienes el paso a paso con fechas y fuentes."
              : pregunta.ayuda}
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="grid gap-4">
            <div className="rounded-xl bg-muted px-5 py-5">
              <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
                Caso: {resultado.titulo}
              </p>
              <p className="mt-2 font-heading text-2xl leading-tight">
                {remate[resultado.caso as keyof typeof remate].plazo}
              </p>
              <p className="mt-3 text-[15px] text-(--text-secondary)">
                {remate[resultado.caso as keyof typeof remate].aviso}
              </p>
            </div>

            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => irALaGuia(resultado.caso)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
              >
                Ver mi guía paso a paso
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                onClick={reiniciar}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-(--text-secondary) outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                No es mi caso, empezar de nuevo
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            {pregunta.opciones.map((opcion) => (
              <button
                key={opcion.texto}
                type="button"
                onClick={() => elegir(opcion)}
                className="flex min-h-14 items-start gap-3 rounded-xl bg-muted px-4 py-3 text-left outline-none transition-colors hover:bg-(--surface) focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-brand"
                  strokeWidth={2}
                />
                <span className="min-w-0">
                  <span className="block font-medium">{opcion.texto}</span>
                  <span className="mt-0.5 block text-sm text-(--text-secondary)">
                    {opcion.detalle}
                  </span>
                </span>
              </button>
            ))}
            {pasoActual > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPasoActual((p) => p - 1);
                  setCamino((c) => c.slice(0, -1));
                }}
                className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-(--text-secondary) outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Volver a la pregunta anterior
              </button>
            )}
          </div>
        )}

        <p className="text-[13px] text-(--text-secondary)">
          ¿Prefieres leerlo todo de golpe?{" "}
          <Link
            href="/como-votar"
            onClick={() => setAbierto(false)}
            className={`${"underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm"}`}
          >
            Abre la guía completa
          </Link>{" "}
          o pregúntale al chat de la esquina.
        </p>
      </DialogContent>
    </Dialog>
  );
}
