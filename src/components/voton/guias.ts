// Lo que dice Votón en cada apartado de /como-votar y /escrutinio. Se lee en
// el servidor y llega a los componentes como texto. Las fechas salen de
// src/datos (calendario oficial); el resto solo repite lo que ya dice la
// página, sin añadir plazos ni requisitos.

import { fecha, plazos } from "@/datos/como-votar";
import type { EstadoVoton } from "./Voton";

export type ParadaGuia = {
  // id del elemento de la página: se sigue la <section> que lo contiene.
  ancla: string;
  pose: EstadoVoton;
  dice: string;
  // Si la tiene, Votón ofrece abrir el chat con esta pregunta escrita.
  pregunta?: string;
};

export const guiaCasos: Record<string, Omit<ParadaGuia, "ancla">> = {
  presencial: {
    pose: "ok",
    dice: "¿Votas en tu mesa? Lleva tu documento original, no una copia.",
  },
  correo: {
    pose: "aviso",
    dice: `Si votas por correo, ojo con los plazos: lo pides hasta el ${fecha(plazos.correoSolicitud.fin)}.`,
  },
  cera: {
    pose: "piensa",
    dice: "¿Vives fuera? Tienes dos caminos: por correo o en la urna del consulado.",
  },
  erta: {
    pose: "aviso",
    dice: `¿Fuera por una temporada? La documentación se pide hasta el ${fecha(plazos.ertaSolicitud.fin)}.`,
  },
  braille: {
    pose: "ok",
    dice: `El kit Braille se pide hasta el ${fecha(plazos.braille.fin)}. Y puedes ir con una persona de confianza.`,
  },
  dudas: {
    pose: "piensa",
    dice: "¿Nulo o en blanco? ¿Y si no sales en el censo? Lo vemos aquí.",
  },
};

export const cierreComoVotar: Omit<ParadaGuia, "ancla"> = {
  pose: "hola",
  dice: "¿Tu caso no está o te queda una duda? Pregúntamela.",
  pregunta: "Tengo una duda sobre cómo votar en mi caso",
};

export const paradasComoVotar: ParadaGuia[] = [
  {
    ancla: "contenido",
    pose: "hola",
    dice: "¡Hola! Busca tu caso y te acompaño paso a paso.",
  },
  {
    ancla: "fechas",
    pose: "aviso",
    dice: "Estas fechas mandan. Apúntatelas antes de seguir.",
  },
  ...Object.entries(guiaCasos).map(([id, g]) => ({ ancla: `caso-${id}`, ...g })),
  {
    ancla: "calendario",
    pose: "ok",
    dice: "Aquí tienes el calendario completo, tal como lo publica la JEC.",
  },
  { ancla: "voton-cierre", ...cierreComoVotar },
];

export const guiaEscrutinio = {
  recorrido: {
    pose: "ok",
    dice: "Cinco paradas, de la urna al BOE. Sígueme.",
  },
  provisional: {
    pose: "piensa",
    dice: "Ojo: lo de esa noche es provisional. Los oficiales llegan después.",
  },
  fases: [
    { pose: "ok", dice: "A las 20:00 se cierra y se cuenta en público, voto a voto." },
    { pose: "piensa", dice: "La Junta Electoral suma las actas de todas las mesas." },
    { pose: "hola", dice: "Y al final, los resultados oficiales salen en el BOE." },
  ],
  tipos: {
    pose: "no",
    dice: "¿Válido, en blanco o nulo? Así se clasifica cada voto.",
  },
} satisfies Record<string, Omit<ParadaGuia, "ancla"> | Omit<ParadaGuia, "ancla">[]>;

export const cierreEscrutinio: Omit<ParadaGuia, "ancla"> = {
  pose: "hola",
  dice: "¿Algo no te cuadra del recuento? Pregúntame.",
  pregunta: "¿Qué pasa con mi voto después de cerrar el colegio?",
};

export const paradasEscrutinio: ParadaGuia[] = [
  {
    ancla: "contenido",
    pose: "hola",
    dice: "¡Hola! Te enseño el viaje de tu voto cuando cierra el colegio.",
  },
  { ancla: "recorrido", ...guiaEscrutinio.recorrido },
  { ancla: "provisional", ...guiaEscrutinio.provisional },
  { ancla: "cifras", pose: "ok", dice: "Estas cifras las fija la ley, cada una con su artículo." },
  ...guiaEscrutinio.fases.map((g, f) => ({ ancla: `fase-${f}`, ...g })),
  { ancla: "tipos", ...guiaEscrutinio.tipos },
  { ancla: "voton-cierre", ...cierreEscrutinio },
];
