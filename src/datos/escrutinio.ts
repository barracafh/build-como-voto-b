// Del cierre de la mesa a los resultados oficiales. Cada paso resume el
// artículo de la LOREG consolidada (BOE-A-1985-11672) que lo sostiene; las
// fechas salen del calendario de la Junta Electoral Central para el 29-N.

const LOREG = "https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672";
const CALENDARIO_JEC =
  "https://www.juntaelectoralcentral.es/cs/jec/documentos/eg2026_calendario.pdf";

export type Icono =
  | "reloj" | "ojo" | "lista" | "acta" | "firma" | "sobre" | "mundo"
  | "suma" | "escudo" | "balanza" | "premio" | "boe" | "urna" | "junta";

export type Paso = {
  titulo: string;
  icono: Icono;
  resumen: string;
  detalle: string[];
  articulo: string;
  url: string;
};

export type Fase = {
  etiqueta: string;
  titulo: string;
  fuente: { nombre: string; url: string };
  pasos: Paso[];
};

export const fases: Fase[] = [
  {
    etiqueta: "29 nov · 20:00",
    titulo: "En la mesa electoral",
    fuente: { nombre: "Art. 84.1 LOREG", url: `${LOREG}#aochentaycuatro` },
    pasos: [
      {
        titulo: "Cierre de la votación",
        icono: "reloj",
        resumen:
          "Votan quienes ya están en el local; después, el voto por correo y la mesa.",
        detalle: [
          "A las 20:00 el presidente anuncia en voz alta que va a concluir la votación. Votan los electores que estén en el local o en su acceso, y nadie más.",
          "El presidente introduce en la urna los votos por correo, tras comprobar sus requisitos y que el elector está en el censo.",
          "Votan los miembros de la mesa y los interventores, y vocales e interventores firman la lista numerada de votantes.",
        ],
        articulo: "Art. 88",
        url: `${LOREG}#aochentayocho`,
      },
      {
        titulo: "Recuento público",
        icono: "ojo",
        resumen:
          "El presidente saca los sobres uno a uno y lee cada voto en voz alta.",
        detalle: [
          "El escrutinio empieza en cuanto termina la votación, es público y no se suspende salvo fuerza mayor.",
          "Se escrutan primero las papeletas del Congreso y después las del Senado.",
          "Cada papeleta leída se muestra a vocales, interventores y apoderados. Un notario, representante o candidato que dude de una puede pedirla y examinarla.",
        ],
        articulo: "Art. 95",
        url: `${LOREG}#anoventaycinco`,
      },
      {
        titulo: "Comprobación y resultado",
        icono: "lista",
        resumen:
          "Se cuadran sobres y votantes, se resuelven protestas y se anuncia el resultado.",
        detalle: [
          "Se confronta el total de sobres con el de votantes anotados.",
          "El presidente pregunta si hay protestas; la mesa las resuelve por mayoría.",
          "Anuncia en voz alta: electores censados, certificaciones censales, votantes, papeletas nulas, votos en blanco y votos de cada candidatura.",
          "Las papeletas se destruyen ante los presentes, salvo las declaradas nulas o reclamadas, que se rubrican y se unen al acta.",
        ],
        articulo: "Art. 97",
        url: `${LOREG}#anoventaysiete`,
      },
      {
        titulo: "Acta en la puerta y datos provisionales",
        icono: "acta",
        resumen:
          "El acta de escrutinio se fija fuera del local; una copia sirve al Gobierno para los datos de esa noche.",
        detalle: [
          "La mesa hace públicos los resultados con un acta de escrutinio que fija sin demora en el exterior o la entrada del local.",
          "Cada candidatura presente puede pedir una copia (una por candidatura).",
          "Otra copia se entrega a la persona designada por la Administración, «a los solos efectos de facilitar la información provisional sobre los resultados de la elección que ha de proporcionar el Gobierno».",
        ],
        articulo: "Art. 98",
        url: `${LOREG}#anoventayocho`,
      },
      {
        titulo: "Acta de la sesión",
        icono: "firma",
        resumen:
          "Presidente, vocales e interventores firman el acta con las cifras y las reclamaciones.",
        detalle: [
          "Recoge electores, votantes, interventores que votaron sin figurar en la mesa, nulos, blancos y votos por candidatura.",
          "Consigna las reclamaciones y protestas, las resoluciones motivadas de la mesa y cualquier incidente.",
          "Representantes, candidatos, apoderados e interventores tienen derecho a copia gratuita e inmediata.",
        ],
        articulo: "Art. 99",
        url: `${LOREG}#anoventaynueve`,
      },
      {
        titulo: "Tres sobres",
        icono: "sobre",
        resumen:
          "Los sobres 1 y 2 van al juzgado; el 3, por Correos a la Junta Electoral.",
        detalle: [
          "Sobre 1: originales del acta de constitución y del acta de la sesión, lista numerada de votantes, papeletas nulas o reclamadas, lista del censo y certificaciones censales. Sobres 2 y 3: copias de las actas.",
          "Se firman de forma que las firmas crucen el cierre.",
          "El presidente lleva enseguida los sobres 1 y 2 al Tribunal de Instancia u Oficina de Justicia, acompañado por la Fuerza Pública. El juez da recibo con día y hora y, en las 10 horas siguientes a la última entrega, lleva los sobres 1 a la Junta Electoral. Los sobres 2 quedan archivados en el juzgado.",
          "El sobre 3 lo recoge un funcionario de Correos en la mesa y lo envía a la Junta al día siguiente.",
        ],
        articulo: "Arts. 100–102",
        url: `${LOREG}#aciento`,
      },
    ],
  },
  {
    etiqueta: "4 a 7 dic",
    titulo: "Escrutinio general",
    fuente: { nombre: "Calendario JEC", url: CALENDARIO_JEC },
    pasos: [
      {
        titulo: "Voto desde el extranjero (CERA)",
        icono: "mundo",
        resumen:
          "Antes del escrutinio, la Junta se constituye en mesa y añade estos votos.",
        detalle: [
          "A las 8:00 del día del escrutinio general, la Junta Electoral se constituye en mesa electoral con interventores de las candidaturas.",
          "El presidente introduce en la urna los sobres de los residentes en el extranjero recibidos hasta ese día.",
          "Al acabar el escrutinio, la Junta Electoral Central publica ese voto por provincia y por consulado.",
        ],
        articulo: "Art. 75.10-14",
        url: `${LOREG}#asetentaycinco`,
      },
      {
        titulo: "Suma de las actas",
        icono: "suma",
        resumen:
          "La Junta Electoral Provincial abre los sobres de cada mesa y suma sus resultados.",
        detalle: [
          "Se celebra el quinto día tras la votación, en acto único y público, desde las 10:00.",
          "Si falta el sobre 1 o está incompleto, se usa el sobre 3; en su defecto, la copia del acta que presente un representante. Si hay copias contradictorias, no se tiene en cuenta ninguna.",
          "No se computan actas dobles y diferentes, ni las que tengan más votos que electores (salvo los interventores), salvo error material, de hecho o aritmético.",
        ],
        articulo: "Arts. 103–105",
        url: `${LOREG}#acientotres`,
      },
      {
        titulo: "La Junta no anula votos",
        icono: "escudo",
        resumen:
          "Solo verifica el recuento y la suma de las mesas y corrige errores materiales.",
        detalle: [
          "Durante el escrutinio la Junta no puede anular ningún acta ni voto.",
          "Los representantes solo pueden hacer observaciones sobre la exactitud de los datos leídos.",
          "No se interrumpe; tras 12 horas puede suspenderse hasta el día siguiente. Debe acabar, como tarde, el octavo día tras la votación.",
        ],
        articulo: "Arts. 106–107",
        url: `${LOREG}#acientoseis`,
      },
    ],
  },
  {
    etiqueta: "Después",
    titulo: "Resultados oficiales",
    fuente: { nombre: "Art. 108 LOREG", url: `${LOREG}#acientoocho` },
    pasos: [
      {
        titulo: "Acta de la circunscripción y reclamaciones",
        icono: "balanza",
        resumen:
          "Un día para reclamar, un día para resolver y recurso ante la Junta Electoral Central.",
        detalle: [
          "La Junta extiende por triplicado el acta de escrutinio: electores, votantes, votos por candidatura, blancos y nulos.",
          "Las reclamaciones solo pueden referirse a incidencias recogidas en las actas.",
          "La resolución puede recurrirse ante la Junta Electoral Central, que resuelve tras oír a las partes.",
        ],
        articulo: "Art. 108.1-3",
        url: `${LOREG}#acientoocho`,
      },
      {
        titulo: "Proclamación de electos",
        icono: "premio",
        resumen:
          "Al día siguiente de agotarse los plazos o de resolver la Junta Electoral Central.",
        detalle: [
          "El acta de proclamación recoge electores, votantes, votos por candidatura, blancos, válidos y nulos, escaños y electos.",
        ],
        articulo: "Art. 108.4-5",
        url: `${LOREG}#acientoocho`,
      },
      {
        titulo: "Publicación en el BOE",
        icono: "boe",
        resumen:
          "La Junta Electoral Central publica los resultados generales y por circunscripción en 40 días.",
        detalle: [
          "Es la publicación oficial de los resultados, sin perjuicio de los recursos contencioso-electorales.",
        ],
        articulo: "Art. 108.6",
        url: `${LOREG}#acientoocho`,
      },
    ],
  },
];

// El recorrido de un voto, de la urna al BOE.
export const recorrido: {
  icono: Icono;
  cuando: string;
  titulo: string;
  texto: string;
}[] = [
  { icono: "urna", cuando: "29 nov · 20:00", titulo: "Urna", texto: "Recuento público, voto a voto" },
  { icono: "acta", cuando: "Esa noche", titulo: "Acta", texto: "En la puerta del local" },
  { icono: "sobre", cuando: "Esa noche", titulo: "Sobres", texto: "Al juzgado y por Correos" },
  { icono: "junta", cuando: "4 a 7 dic", titulo: "Junta Electoral", texto: "Escrutinio general" },
  { icono: "boe", cuando: "En 40 días", titulo: "BOE", texto: "Resultados oficiales" },
];

// Cifras que fija la ley, con su artículo.
export const cifras = [
  { valor: "20:00", texto: "Cierre de la votación", articulo: "Art. 88.1", url: `${LOREG}#aochentayocho` },
  { valor: "3", texto: "Sobres con la documentación de cada mesa", articulo: "Art. 100", url: `${LOREG}#aciento` },
  { valor: "10 h", texto: "Para que el juez lleve las actas a la Junta", articulo: "Art. 101.3", url: `${LOREG}#acientouno` },
  { valor: "5.º", texto: "Día tras la votación: empieza el escrutinio general", articulo: "Art. 103.1", url: `${LOREG}#acientotres` },
  { valor: "40", texto: "Días como máximo para publicar los resultados en el BOE", articulo: "Art. 108.6", url: `${LOREG}#acientoocho` },
];

export const tiposDeVoto = [
  {
    titulo: "Válido",
    texto: "El que va a una candidatura. Varias papeletas iguales en un sobre cuentan como un voto.",
  },
  {
    titulo: "En blanco",
    texto: "Sobre sin papeleta. En el Senado, papeleta sin ningún candidato marcado. Es válido.",
  },
  {
    titulo: "Nulo",
    texto: "Papeleta o sobre no oficiales, papeleta sin sobre, papeletas de distinta candidatura o papeleta alterada.",
  },
];

export const fuentesEscrutinio = [
  {
    nombre: "LOREG consolidada, arts. 75, 88 y 95 a 108 (BOE)",
    url: LOREG,
  },
  {
    nombre: "Art. 96 LOREG: votos nulos y en blanco (BOE)",
    url: `${LOREG}#anoventayseis`,
  },
  {
    nombre: "Calendario electoral del 29-N (Junta Electoral Central)",
    url: CALENDARIO_JEC,
  },
];
