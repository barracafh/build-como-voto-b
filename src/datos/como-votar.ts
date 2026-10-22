// Casos de «cómo votar». Cada paso y cada fecha salen del calendario oficial
// (datos/calendario_29N_2026.json, con fuente: JEC, INE, BOE y LOREG); el
// detalle del trámite, de contexto.md, que lo toma de la LOREG consolidada,
// del INE y de Correos. Sin candidatos, programas ni recomendaciones de voto.
//
// Datos de resultados: Origen de los datos: Ministerio del Interior
// (datos/FUENTES.md).

import calendario from "../../datos/calendario_29N_2026.json";

type Entrada = {
  id: string;
  fecha?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  evento: string;
};

// El calendario oficial (datos/calendario_29N_2026.json) es la única fuente
// de fechas: cada hito se lee de su entrada por id y falla si falta.
const delCalendario = (id: string): Entrada => {
  const e = calendario.fechas.find((f) => f.id === id);
  if (!e) throw new Error(`Falta en el calendario oficial: ${id}`);
  return e;
};

export type Fuente = { nombre: string; url: string };

const JEC = {
  nombre: "Calendario electoral de la JEC (29-N)",
  url: "https://www.juntaelectoralcentral.es/cs/jec/documentos/eg2026_calendario.pdf",
};
const INE_PLAZOS = {
  nombre: "INE · Plazos para electores (Oficina del Censo Electoral)",
  url: "https://www.ine.es/dyngs/CEL/index.htm?cid=1702",
};
const LOREG = "https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672";
const CORREOS = {
  nombre: "Correos · Voto por correo",
  url: "https://www.correos.es/es/es/particulares/para-el-ciudadano/voto-por-correo",
};
const BOE_RD = {
  nombre: "BOE · Real Decreto 806/2026 de convocatoria",
  url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20742",
};

export const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${iso}T12:00:00`));

// «Del 6 de octubre al 19 de noviembre» / «El 29 de noviembre».
export const plazo = (e: Entrada): string => {
  const i = e.fecha_inicio ?? e.fecha;
  const f = e.fecha_fin ?? e.fecha;
  if (!i || !f) return "Fecha no disponible";
  return i === f ? `El ${fecha(i)}` : `Del ${fecha(i)} al ${fecha(f)}`;
};

// Hito del calendario listo para mostrar: fechas en una línea y evento.
export type Hito = { fechas: string; evento: string };

const leer = (id: string): Hito => {
  const e = delCalendario(id);
  return { fechas: plazo(e), evento: e.evento };
};

// Rango de fechas de un hito, en ISO, para compararlo con la fecha actual.
export type Plazo = { fin: string };

export const plazos = {
  correoSolicitud: { fin: delCalendario("voto_correo_solicitud").fecha_fin! },
  correoRemision: { fin: delCalendario("voto_correo_remision").fecha_fin! },
  ertaSolicitud: { fin: delCalendario("erta_solicitud").fecha_fin! },
  ertaRemision: { fin: delCalendario("erta_remision_voto").fecha_fin! },
  ceraCorreo: { fin: delCalendario("cera_voto_correo").fecha_fin! },
  ceraUrna: { fin: delCalendario("cera_deposito_urna").fecha_fin! },
  braille: { fin: delCalendario("braille_solicitud").fecha_fin! },
} satisfies Record<string, Plazo>;


export const hitos = {
  convocatoria: leer("convocatoria_boe"),
  braille: leer("braille_solicitud"),
  ertaSolicitud: leer("erta_solicitud"),
  correoSolicitud: leer("voto_correo_solicitud"),
  ceraEnvioDoc: leer("cera_envio_documentacion"),
  ceraPapeletasDescarga: leer("cera_papeletas_descargables"),
  ceraEnvioPapeletas: leer("cera_envio_papeletas"),
  ceraCorreo: leer("cera_voto_correo"),
  ceraUrna: leer("cera_deposito_urna"),
  correoEnvioDoc: leer("voto_correo_envio_documentacion"),
  correoRemision: leer("voto_correo_remision"),
  ertaEnvioDoc: leer("erta_envio_documentacion"),
  ertaRemision: leer("erta_remision_voto"),
  campana: leer("campana"),
  reflexion: leer("jornada_reflexion"),
  votacion: leer("votacion"),
};

export type Paso = {
  titulo: string;
  texto: string;
  nota?: string;
  fuente?: Fuente;
  // Hito de `plazos` del que sale la fecha límite del paso, si la tiene.
  plazo?: keyof typeof plazos;
};

export type Caso = {
  id: string;
  icono: "urna" | "correo" | "mundo" | "maleta" | "braille" | "sobre";
  pregunta: string;
  quien: string;
  resumen: string;
  pasos: Paso[];
  aviso?: string;
  fuentes: Fuente[];
};

const INE_CONSULTA_CENSO = {
  nombre: "INE · Consulta de mesa y local electoral",
  url: "https://sede.ine.gob.es/ce-mesas/?lang=es_ES",
};
const INTERIOR_FAQ = {
  nombre: "Interior · Preguntas frecuentes: desarrollo de la votación",
  url: "https://infoelectoral.interior.gob.es/es/proceso-electoral/preguntas-frecuentes/desarrollo-de-la-votacion/",
};
const INTERIOR_ACCESIBILIDAD = {
  nombre: "Interior · Accesibilidad y procesos electorales",
  url: "https://infoelectoral.interior.gob.es/es/proceso-electoral/accesibilidad-y-procesos-electorales/",
};
const INE_DESCARGA = {
  nombre: "INE · Descarga de papeletas para el voto en el extranjero",
  url: "https://www.ine.es/descarga_candidaturas_elecciones",
};
const INE_ESTADO = {
  nombre: "INE · Estado del voto por correo",
  url: "https://sede.ine.gob.es/ce-votoxcorreo/?lang=es_ES",
};
const INE_GUIA = {
  nombre: "INE · Guía de funciones electorales",
  url: "https://www.ine.es/dyngs/CEL/index.htm?cid=1700",
};
const LOREG_REF = (art: string) => ({
  nombre: `LOREG, art. ${art} (BOE)`,
  url: LOREG,
});
const ET = {
  nombre: "Estatuto de los Trabajadores, art. 37.3.d (BOE)",
  url: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430",
};
const RD605 = {
  nombre: "Real Decreto 605/1999, art. 13 (BOE)",
  url: "https://www.boe.es/buscar/act.php?id=BOE-A-1999-8583",
};

export const casos: Caso[] = [
  {
    id: "presencial",
    icono: "urna",
    pregunta: "Voto el día 29 en persona",
    quien: "Residentes en España que puedan acudir a su mesa",
    resumen: `La votación es el ${hitos.votacion.fechas
      .replace("El ", "")
      .toLowerCase()}, de 9:00 a 20:00, en la mesa de tu sección censal.`,
    pasos: [
      {
        titulo: "Consulta dónde te toca votar",
        texto:
          "Tu mesa y tu local salen del censo. El INE lo consulta en línea con la provincia, el municipio y la inicial del primer apellido, sin Cl@ve ni certificado.",
        fuente: INE_CONSULTA_CENSO,
      },
      {
        titulo: "Ve a tu mesa el 29 de noviembre, de 9:00 a 20:00",
        texto:
          "La fecha la fija el Real Decreto 806/2026 y el horario, de 9:00 a 20:00, el art. 84.1 de la LOREG. Puedes ir a cualquier hora de esa franja.",
        fuente: {
          nombre: "LOREG, art. 84.1 (BOE)",
          url: `${LOREG}#aochentaycuatro`,
        },
      },
      {
        titulo: "Identifícate con documento original",
        texto:
          "DNI, pasaporte o permiso de conducir con fotografía (art. 85.1 LOREG). Han de ser originales: no valen fotocopias ni el resguardo del DNI en trámite.",
        nota: "No cuentes con miDGT ni con el DNI digital como identificación: la JEC los suspendió como documentos de identificación en mesa (Acuerdo 94/2026).",
        fuente: INTERIOR_FAQ,
      },
      {
        titulo: "Recoge las dos papeletas y mete cada una en su sobre",
        texto:
          "En la mesa te entregan las papeletas del Congreso (blanca) y del Senado (sepia). Cada una va en su sobre de votación; los sobres son oficiales y gratuitos.",
        fuente: LOREG_REF("86"),
      },
      {
        titulo: "Deposita los sobres en la urna y firma",
        texto:
          "El voto es personal, libre y secreto: lo emite cada elector a solas en la cabina. No es obligatorio votar y nadie puede obligarte a revelar qué has votado.",
        fuente: LOREG_REF("87"),
      },
      {
        titulo: "Si trabajas ese día, tienes permiso retribuido",
        texto:
          "Por el tiempo indispensable para votar (art. 37.3.d del Estatuto de los Trabajadores). Si tu horario laboral impide ir a votar, hasta cuatro horas libres retribuidas (art. 13.1 del RD 605/1999).",
        fuente: ET,
      },
    ],
    aviso:
      "Si no apareces en el censo, solo puedes votar con sentencia judicial firme o con certificación censal específica (art. 85 LOREG). La tarjeta censal no es un documento de identificación.",
    fuentes: [BOE_RD, INE_CONSULTA_CENSO, INTERIOR_FAQ],
  },
  {
    id: "correo",
    icono: "correo",
    pregunta: "Estaré fuera de mi municipio el día 29",
    quien:
      "Residentes en España que no puedan acudir a su mesa (y extranjeros inscritos temporalmente en España)",
    resumen: `Voto por correo: pides la documentación hasta el ${fecha(
      plazos.correoSolicitud.fin,
    )} y la devuelves hasta el ${fecha(plazos.correoRemision.fin)}. Gratis, en cualquier oficina de Correos.`,
    pasos: [
      {
        titulo: "Solicita el voto por correo antes del 19 de noviembre",
        texto:
          "Puedes pedirlo si prevés no estar en tu localidad el día de la votación o no poder personarte (art. 72 LOREG). Quien lo solicita queda anotado en el censo especial y no puede votar en mesa ese día.",
        fuente: INE_PLAZOS,
        plazo: "correoSolicitud",
      },
      {
        titulo: "Elige cómo solicitarlo",
        texto:
          "Telemáticamente en la web de Correos con DNI electrónico o certificado digital, sin acudir a oficina; o en persona en cualquier oficina de Correos, con tu DNI, pasaporte u otro documento oficial, nunca fotocopia.",
        nota: "Otra vía: rellena la solicitud en la sede del INE sin certificado, imprímela por duplicado, fírmala y preséntala en Correos. Sin presentarla, no se tramita.",
        fuente: CORREOS,
      },
      {
        titulo: "Recibe la documentación en tu domicilio",
        texto:
          "La Oficina del Censo Electoral te envía por correo certificado las papeletas de todas las candidaturas, los sobres y el certificado de inscripción. Lo hacen entre el 9 y el 22 de noviembre. Si no estás en casa, el aviso de recibo se firma en persona con acreditación de identidad; si no, tendrás que recogerlo en la oficina de Correos.",
        fuente: INE_PLAZOS,
      },
      {
        titulo: "Prepara el sobre para tu mesa",
        texto:
          "Mete la papeleta elegida en el sobre de votación; este, junto al certificado de inscripción, en el sobre dirigido a tu mesa electoral. No firmes ni escribas nada en el sobre de la papeleta.",
        fuente: LOREG_REF("73"),
      },
      {
        titulo: "Entrégalo en Correos antes del 25 de noviembre",
        texto:
          "Envío por correo certificado, sin franqueo, desde que recibes la documentación y hasta antes del tercer día previo a la elección. Entrégalo personalmente o mediante autorización; Correos lo lleva a tu mesa el día de la votación.",
        nota: "El sobre debe llegar a la mesa antes de las 20:00 del 29 de noviembre para poder computarse.",
        fuente: CORREOS,
      },
      {
        titulo: "Comprueba el estado de tu solicitud",
        texto:
          "El INE permite consultar si tu voto por correo está en marcha con el número de DNI o pasaporte y la fecha de nacimiento.",
        fuente: INE_ESTADO,
      },
    ],
    aviso:
      "Quien tiene el voto por correo aceptado no puede votar en mesa el día 29: la mesa lo comprueba en su lista del censo (art. 73.1 LOREG).",
    fuentes: [CORREOS, INE_PLAZOS, LOREG_REF("72")],
  },
  {
    id: "cera",
    icono: "mundo",
    pregunta: "Vivo en el extranjero",
    quien: "Inscritos en el censo de residentes ausentes (CERA)",
    resumen:
      "No hay que pedir el voto: la Oficina del Censo Electoral lo envía de oficio a tu dirección en el extranjero. Puedes votar por correo postal o en urna en el consulado.",
    pasos: [
      {
        titulo: "Recibe la documentación de voto (llega de oficio)",
        texto:
          "Del 24 de octubre al 30 de octubre, a la dirección de tu inscripción consular: certificados de inscripción, sobres de votación (blanco para el Congreso, sepia para el Senado), sobre para la oficina consular, sobre para la Junta Electoral Provincial y hoja de instrucciones. No hace falta solicitar nada: desde la reforma de 2022 se eliminó el «voto rogado».",
        fuente: {
          nombre: "LOREG, art. 75.1 (BOE)",
          url: `${LOREG}#asetentaycinco`,
        },
      },
      {
        titulo: "Descarga o recibe las papeletas oficiales",
        texto:
          "El segundo envío, con las papeletas de todas las candidaturas proclamadas, llega del 4 al 8 de noviembre (hasta el 14 si hay recursos). El juego completo descargable se pone a disposición entre el 2 y el 7 de noviembre y sigue disponible después: solo se puede descargar el juego completo, para garantizar el secreto del voto.",
        fuente: INE_DESCARGA,
      },
      {
        titulo: "Elige: correo postal o urna en el consulado",
        texto:
          "Por correo: envías tu voto a la oficina consular donde estás inscrito del 4 al 24 de noviembre. En urna: votas en tu consulado o en el lugar habilitado entre el 21 y el 26 de noviembre. Puedes usar una sola de las dos modalidades para cada cámara.",
        fuente: JEC,
      },
      {
        titulo: "Si votas por correo: prepara los sobres",
        texto:
          "En el sobre dirigido a la Junta Electoral van los sobres de votación, uno de los certificados de inscripción firmado, con tu número de pasaporte o DNI al reverso, y la fotocopia del pasaporte o DNI españoles, o el certificado de nacionalidad o de inscripción en el Registro de Matrícula Consular. Ese sobre va dentro del dirigido al consulado, junto con el otro certificado.",
        fuente: {
          nombre: "LOREG, art. 75.7 (BOE)",
          url: `${LOREG}#asetentaycinco`,
        },
      },
      {
        titulo: "Entrégalo personalmente en Correos antes del 24 de noviembre",
        texto:
          "El envío es personal, por correo postal, certificado cuando sea posible, y gratuito (art. 75.12 LOREG). El sello consular con la fecha es indispensable. El sobre no es válido si llega al consulado antes de la proclamación definitiva de candidaturas (2 de noviembre) o después del 27 de noviembre.",
        nota: "No envíes nunca el voto directamente a la Junta Electoral Provincial en España: según el INE, esos votos se consideran nulos.",
        fuente: INE_PLAZOS,
        plazo: "ceraCorreo",
      },
      {
        titulo: "Si votas en urna: acude al consulado con tu documento",
        texto:
          "Del 21 al 26 de noviembre, con pasaporte o DNI españoles, certificado de nacionalidad o certificación de inscripción en el Registro de Matrícula Consular (art. 75.5 LOREG).",
        fuente: {
          nombre: "LOREG, art. 75.5 (BOE)",
          url: `${LOREG}#asetentaycinco`,
        },
        plazo: "ceraUrna",
      },
    ],
    aviso:
      "Los sobres que lleguen al consulado después del 27 de noviembre no son válidos por ley (art. 75.7 LOREG). Si cambias de dirección, actualiza tu inscripción en el consulado.",
    fuentes: [
      INE_PLAZOS,
      {
        nombre: "LOREG, art. 75 (BOE)",
        url: `${LOREG}#asetentaycinco`,
      },
      JEC,
    ],
  },
  {
    id: "erta",
    icono: "maleta",
    pregunta: "Resido en España y estaré temporalmente fuera",
    quien: "Electores temporalmente ausentes (ERTA), inscritos como no residentes en un consulado",
    resumen: `Pides la documentación en el consulado hasta el 31 de octubre y la devuelves por correo certificado hasta el 25 de noviembre. Este trámite no se hace en Correos: se pide a la Delegación Provincial de la Oficina del Censo Electoral de tu provincia.`,
    pasos: [
      {
        titulo: "Comprueba que cumples los requisitos",
        texto:
          "Eres residente en España inscrito en el Registro de Matrícula Consular como no residente y prevés permanecer en el extranjero hasta el día de la votación.",
        fuente: INE_PLAZOS,
      },
      {
        titulo: "Solicita la documentación hasta el 31 de octubre",
        texto:
          "Se pide a la Delegación Provincial de la Oficina del Censo Electoral de tu provincia y se entrega en persona en la oficina o sección consular más cercana. No se pide en las oficinas de Correos.",
        fuente: INE_PLAZOS,
        plazo: "ertaSolicitud",
      },
      {
        titulo: "Recibe la documentación en tu domicilio en el extranjero",
        texto:
          "Llega por correo certificado entre el 3 y el 9 de noviembre; si hay recursos contra la proclamación de candidaturas, del 10 al 17 de noviembre.",
        fuente: JEC,
      },
      {
        titulo: "Devuelve el voto a tu mesa hasta el 25 de noviembre",
        texto:
          "Por correo certificado a tu mesa electoral en España, desde que recibes la documentación y hasta antes del tercer día previo a la elección.",
        fuente: JEC,
        plazo: "ertaRemision",
      },
    ],
    aviso:
      "Correos aclara que los residentes en España temporalmente en el extranjero no pueden pedir el voto por correo en sus oficinas: el trámite es con la Oficina del Censo Electoral a través del consulado.",
    fuentes: [INE_PLAZOS, JEC],
  },
  {
    id: "braille",
    icono: "braille",
    pregunta: "Necesito el voto Braille o apoyo para votar",
    quien: "Personas ciegas o con discapacidad visual que lean Braille",
    resumen: `El kit de voto Braille se entrega en tu mesa el día de la votación. Hay que solicitarlo antes del ${fecha(
      plazos.braille.fin,
    )} y es incompatible con el voto por correo.`,
    pasos: [
      {
        titulo: "Solicita el kit Braille antes del 2 de noviembre",
        texto:
          "Es para quien lee Braille y tiene una discapacidad igual o superior al 33 % o condición de afiliado a la ONCE. Incluye papeletas y sobres normalizados y toda la documentación en Braille. La solicitud va del 6 de octubre al 2 de noviembre.",
        fuente: INTERIOR_ACCESIBILIDAD,
        plazo: "braille",
      },
      {
        titulo: "Recíbelo en tu mesa el día de la votación",
        texto:
          "El kit se entrega en la mesa electoral el 29 de noviembre. No se envía a casa y es incompatible con el voto por correo: si has pedido el kit, votas en persona.",
        fuente: INTERIOR_ACCESIBILIDAD,
      },
      {
        titulo: "Pide ayuda si la necesitas: la persona de confianza",
        texto:
          "Quien no pueda elegir la papeleta, introducirla en el sobre o depositarla puede servirse de una persona de su confianza, que la acompaña y hace lo que le indique (art. 87.1 LOREG).",
        fuente: LOREG_REF("87"),
      },
      {
        titulo: "Los locales electorales han de ser accesibles",
        texto:
          "Los ayuntamientos proponen locales accesibles; ante un incumplimiento se puede reclamar a la Junta Electoral de Zona (art. 24.3 LOREG) y la mesa debe hacer los ajustes razonables que precise el elector.",
        fuente: INTERIOR_ACCESIBILIDAD,
      },
    ],
    aviso:
      "La lengua de signos y el bucle magnético para miembros de mesa se piden por escrito a la Junta de Zona en los 7 días siguientes a la notificación.",
    fuentes: [INTERIOR_ACCESIBILIDAD, LOREG_REF("87"), JEC],
  },
  {
    id: "dudas",
    icono: "sobre",
    pregunta: "Tengo dudas el día de votar",
    quien: "Cualquier elector",
    resumen:
      "Qué documento vale, qué pasa si no estás en el censo, qué se considera voto nulo o en blanco y qué pasa con tu papeleta.",
    pasos: [
      {
        titulo: "¿Qué documento sirve para votar?",
        texto:
          "DNI, pasaporte o permiso de conducir con fotografía, en original. No valen fotocopias ni resguardos. La tarjeta censal no es requisito: basta la inscripción en el censo y identificarte.",
        fuente: INTERIOR_FAQ,
      },
      {
        titulo: "¿Qué pasa si no aparezco en las listas del censo?",
        texto:
          "Solo puedes votar con sentencia judicial firme o con certificación censal específica (art. 85.3 y 85.5 LOREG). Si la consulta censo ya cerró (el 19 de octubre), no hay trámite ordinario: acude a la mesa y, si lo reconocen, la mesa resuelve.",
        fuente: LOREG_REF("85"),
      },
      {
        titulo: "¿Qué es un voto nulo?",
        texto:
          "Sobre o papeleta no oficiales, papeleta sin sobre, sobres con papeletas de distintas candidaturas o papeletas modificadas, tachadas o con leyendas (art. 96 LOREG). No cuenta para el reparto de escaños.",
        fuente: LOREG_REF("96"),
      },
      {
        titulo: "¿Y un voto en blanco?",
        texto:
          "Sobre sin papeleta (y en el Senado, papeleta sin ningún candidato marcado). Es un voto válido: cuenta en la base del 3 % pero no va a ninguna candidatura ni genera escaño.",
        fuente: LOREG_REF("96"),
      },
      {
        titulo: "¿Puedo echar la papeleta doblada o con una marca?",
        texto:
          "Una señal, cruz o aspa junto a un candidato no anula el voto si no altera la configuración de la papeleta ni expresa reproche (Instrucción JEC 1/2012). Tampoco anulan la papeleta las dobleces ni el desgaste.",
        fuente: LOREG_REF("96"),
      },
      {
        titulo: "¿Me pueden obligar a decir a quién he votado?",
        texto:
          "No. El voto es personal, libre, igual, secreto y no es obligatorio (art. 5 LOREG). Nadie puede obligarte a revelar tu voto, ni dentro ni fuera de la cabina.",
        fuente: LOREG_REF("5"),
      },
    ],
    fuentes: [INTERIOR_FAQ, LOREG_REF("96"), INE_CONSULTA_CENSO],
  },
];

export const fuentesGuia: Fuente[] = [
  JEC,
  INE_PLAZOS,
  CORREOS,
  {
    nombre: "BOE · LOREG (Ley Orgánica 5/1985), texto consolidado",
    url: LOREG,
  },
  BOE_RD,
  {
    nombre: "Origen de los datos: Ministerio del Interior (Infoelectoral)",
    url: "https://infoelectoral.interior.gob.es/",
  },
];
