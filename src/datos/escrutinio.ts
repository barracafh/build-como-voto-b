// Del cierre de la mesa a los resultados oficiales. Cada paso resume el
// artículo de la LOREG consolidada (BOE-A-1985-11672) que lo sostiene; las
// fechas salen del calendario de la Junta Electoral Central para el 29-N.

const LOREG = "https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672";
const RD_605 = "https://www.boe.es/buscar/act.php?id=BOE-A-1999-8583";
const INTERIOR = "https://infoelectoral.interior.gob.es/es/proceso-electoral";
const FAQ_ESCRUTINIO = `${INTERIOR}/preguntas-frecuentes/escrutinio-y-final-de-la-jornada-electoral/`;
const FAQ_REPRESENTANTES = `${INTERIOR}/preguntas-frecuentes/representantes-de-la-administracion-en-los-locales-electorales/`;
const FAQ_RESULTADOS = `${INTERIOR}/preguntas-frecuentes/resultados-electorales/`;
const QUIEN_HACE_QUE = `${INTERIOR}/visitas-virtuales/quien-hace-que/`;
const CALENDARIO_JEC =
  "https://www.juntaelectoralcentral.es/cs/jec/documentos/eg2026_calendario.pdf";

export type Icono =
  | "reloj" | "ojo" | "lista" | "acta" | "firma" | "sobre" | "mundo"
  | "suma" | "escudo" | "balanza" | "premio" | "boe" | "urna" | "junta";

export type Paso = {
  // Cuándo ocurre, con las palabras de la fuente; sin él, la fuente no lo dice.
  cuando?: string;
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
    etiqueta: "29 nov",
    titulo: "En la mesa electoral",
    fuente: { nombre: "Art. 84.1 LOREG", url: `${LOREG}#aochentaycuatro` },
    pasos: [
      {
        cuando: "20:00",
        titulo: "Cierre de la votación",
        icono: "reloj",
        resumen: "Votan quienes ya están dentro; luego, el voto por correo y la mesa.",
        detalle: [
          "A las 20:00 el presidente anuncia en voz alta que va a concluir la votación. Votan los electores que estén en el local o en su acceso, y nadie más.",
          "El presidente introduce en la urna los votos por correo, tras comprobar sus requisitos y que el elector está en el censo.",
          "Votan los miembros de la mesa y los interventores, y vocales e interventores firman la lista numerada de votantes.",
        ],
        articulo: "Art. 88",
        url: `${LOREG}#aochentayocho`,
      },
      {
        cuando: "acto seguido",
        titulo: "Recuento público",
        icono: "ojo",
        resumen: "Sobre a sobre, en voz alta y en público.",
        detalle: [
          "El escrutinio empieza en cuanto termina la votación, es público y no se suspende salvo fuerza mayor.",
          "Se escrutan primero las papeletas del Congreso y después las del Senado.",
          "Cada papeleta leída se muestra a vocales, interventores y apoderados. Un notario, representante o candidato que dude de una puede pedirla y examinarla.",
        ],
        articulo: "Art. 95",
        url: `${LOREG}#anoventaycinco`,
      },
      {
        cuando: "al terminar el recuento",
        titulo: "Comprobación y resultado",
        icono: "lista",
        resumen: "Se cuadran sobres y votantes y se anuncia el resultado.",
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
        cuando: "inmediatamente",
        titulo: "Acta en la puerta",
        icono: "acta",
        resumen: "Se cuelga fuera del local; una copia va al Gobierno.",
        detalle: [
          "La mesa hace públicos los resultados con un acta de escrutinio que fija sin demora en el exterior o la entrada del local.",
          "Cada candidatura presente puede pedir una copia (una por candidatura).",
          "Otra copia se entrega a la persona designada por la Administración, «a los solos efectos de facilitar la información provisional sobre los resultados de la elección que ha de proporcionar el Gobierno».",
        ],
        articulo: "Art. 98",
        url: `${LOREG}#anoventayocho`,
      },
      {
        cuando: "al concluir el escrutinio",
        titulo: "Acta de la sesión",
        icono: "firma",
        resumen: "La firman la mesa y los interventores, con las reclamaciones.",
        detalle: [
          "Recoge electores, votantes, interventores que votaron sin figurar en la mesa, nulos, blancos y votos por candidatura.",
          "Consigna las reclamaciones y protestas, las resoluciones motivadas de la mesa y cualquier incidente.",
          "Representantes, candidatos, apoderados e interventores tienen derecho a copia gratuita e inmediata.",
        ],
        articulo: "Art. 99",
        url: `${LOREG}#anoventaynueve`,
      },
      {
        cuando: "acto seguido",
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
        cuando: "8:00",
        titulo: "Voto desde el extranjero (CERA)",
        icono: "mundo",
        resumen: "La Junta añade los votos de los residentes en el extranjero.",
        detalle: [
          "A las 8:00 del día del escrutinio general, la Junta Electoral se constituye en mesa electoral con interventores de las candidaturas.",
          "El presidente introduce en la urna los sobres de los residentes en el extranjero recibidos hasta ese día.",
          "Al acabar el escrutinio, la Junta Electoral Central publica ese voto por provincia y por consulado.",
        ],
        articulo: "Art. 75.10-14",
        url: `${LOREG}#asetentaycinco`,
      },
      {
        cuando: "10:00",
        titulo: "Suma de las actas",
        icono: "suma",
        resumen: "La Junta Electoral Provincial suma las actas de cada mesa.",
        detalle: [
          "Se celebra el quinto día tras la votación, en acto único y público, desde las 10:00.",
          "Si falta el sobre 1 o está incompleto, se usa el sobre 3; en su defecto, la copia del acta que presente un representante. Si hay copias contradictorias, no se tiene en cuenta ninguna.",
          "No se computan actas dobles y diferentes, ni las que tengan más votos que electores (salvo los interventores), salvo error material, de hecho o aritmético.",
        ],
        articulo: "Arts. 103–105",
        url: `${LOREG}#acientotres`,
      },
      {
        cuando: "hasta el 7 dic",
        titulo: "La Junta no anula votos",
        icono: "escudo",
        resumen: "Solo verifica y corrige errores materiales.",
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
        cuando: "1 día + 1 día",
        titulo: "Reclamaciones",
        icono: "balanza",
        resumen: "Plazos para reclamar, resolver y recurrir ante la JEC.",
        detalle: [
          "La Junta extiende por triplicado el acta de escrutinio: electores, votantes, votos por candidatura, blancos y nulos.",
          "Las reclamaciones solo pueden referirse a incidencias recogidas en las actas.",
          "La resolución puede recurrirse ante la Junta Electoral Central, que resuelve tras oír a las partes.",
        ],
        articulo: "Art. 108.1-3",
        url: `${LOREG}#acientoocho`,
      },
      {
        cuando: "dentro del día siguiente",
        titulo: "Proclamación de electos",
        icono: "premio",
        resumen: "Se proclama a los electos.",
        detalle: [
          "El acta de proclamación recoge electores, votantes, votos por candidatura, blancos, válidos y nulos, escaños y electos.",
        ],
        articulo: "Art. 108.4-5",
        url: `${LOREG}#acientoocho`,
      },
      {
        cuando: "≤ 40 días",
        titulo: "Publicación en el BOE",
        icono: "boe",
        resumen: "La Junta Electoral Central publica los resultados oficiales.",
        detalle: [
          "Es la publicación oficial de los resultados, sin perjuicio de los recursos contencioso-electorales.",
        ],
        articulo: "Art. 108.6",
        url: `${LOREG}#acientoocho`,
      },
    ],
  },
];

// Del 29 de noviembre al BOE, día a día.
export const calendario = [
  { cuando: "29 nov", titulo: "Votación y recuento", texto: "De 9:00 a 20:00; después, escrutinio en cada mesa y resultados provisionales.", fuente: "Arts. 84.1 y 95", url: `${LOREG}#aochentaycuatro` },
  { cuando: "+10 h", titulo: "Actas a la Junta", texto: "El juez lleva los sobres 1 a la Junta en las 10 horas siguientes a la última entrega.", fuente: "Art. 101.3", url: `${LOREG}#acientouno` },
  { cuando: "30 nov", titulo: "Correos envía el ‘sobre 3’", texto: "Al día siguiente de la elección, a la Junta que hace el escrutinio.", fuente: "Art. 102.2", url: `${LOREG}#acientodos` },
  { cuando: "4 dic", titulo: "Escrutinio general", texto: "El quinto día tras la votación, en cada Junta Electoral Provincial.", fuente: "Art. 103.1 y calendario JEC", url: CALENDARIO_JEC },
  { cuando: "7 dic", titulo: "Fin del escrutinio", texto: "No puede acabar después del octavo día tras la votación.", fuente: "Art. 107.2 y calendario JEC", url: CALENDARIO_JEC },
  { cuando: "Después", titulo: "Reclamaciones y proclamación", texto: "Un día para reclamar, uno para resolver, posible recurso ante la JEC y proclamación al día siguiente.", fuente: "Art. 108.2-4", url: `${LOREG}#acientoocho` },
  { cuando: "≤ 40 días", titulo: "Resultados en el BOE", texto: "La Junta Electoral Central publica los resultados generales y por circunscripción.", fuente: "Art. 108.6", url: `${LOREG}#acientoocho` },
];

// Los tres sobres de cada mesa.
export const sobres = [
  { n: 1, contiene: "Originales de las actas, lista de votantes, papeletas nulas o reclamadas, censo y certificaciones", destino: "Juzgado → Junta Electoral", nota: "El juez lo lleva a la Junta en 10 h" },
  { n: 2, contiene: "Copia del acta de constitución y del acta de la sesión", destino: "Juzgado", nota: "Queda archivado por si lo pide la Junta o un tribunal" },
  { n: 3, contiene: "Copia del acta de constitución y del acta de la sesión", destino: "Correos → Junta Electoral", nota: "Sale al día siguiente; sustituye al 1 si falta" },
];
export const fuenteSobres = { nombre: "Arts. 100 a 102 y 105.3 LOREG", url: `${LOREG}#aciento` };

// Resultados provisionales de la noche electoral. Base legal: art. 98.2 LOREG;
// cómo se hace: preguntas frecuentes y «Quién hace qué» del Ministerio del
// Interior; los representantes de la Administración: RD 605/1999.
export const provisional = {
  flujo: [
    { icono: "acta" as Icono, titulo: "Mesa", texto: "Entrega una copia del acta", fuente: "Art. 98.2 LOREG", url: `${LOREG}#anoventayocho` },
    { icono: "firma" as Icono, titulo: "Representante de la Administración", texto: "Uno por local; la transmite", fuente: "Interior", url: FAQ_REPRESENTANTES },
    { icono: "suma" as Icono, titulo: "Centro de Totalización de Datos", texto: "Suma los datos según llegan", fuente: "Interior", url: FAQ_ESCRUTINIO },
    { icono: "junta" as Icono, titulo: "Ministerio del Interior", texto: "Los difunde desde las 20:00", fuente: "Interior", url: FAQ_RESULTADOS },
  ],
  // Lo que los resultados definitivos incluyen y los provisionales no.
  diferencias: [
    {
      titulo: "Voto CERA",
      texto: "Es el voto de los españoles residentes en el extranjero. Cada Junta Electoral lo mete en la urna a las 8:00 del día del escrutinio general, así que no está en los datos de esa noche.",
      fuente: "Art. 75.10-11 LOREG",
      url: `${LOREG}#asetentaycinco`,
    },
    {
      titulo: "Reclamaciones resueltas",
      texto: "Tras el escrutinio general, las candidaturas tienen un día para reclamar por incidencias que consten en las actas. La Junta resuelve en un día y su decisión se puede recurrir ante la Junta Electoral Central.",
      fuente: "Art. 108.2-3 LOREG",
      url: `${LOREG}#acientoocho`,
    },
    {
      titulo: "Correcciones de las Juntas",
      texto: "Al revisar las actas, la Junta solo puede subsanar errores materiales, de hecho o aritméticos; no puede anular actas ni votos. No computa las actas dobles y diferentes ni las que tengan más votos que electores.",
      fuente: "Arts. 105.4 y 106.1 LOREG",
      url: `${LOREG}#acientoseis`,
    },
  ],
  fuenteDiferencias: FAQ_RESULTADOS,
};

export const tiposDeVoto = [
  {
    titulo: "Válido",
    texto: "Va a una candidatura.",
  },
  {
    titulo: "En blanco",
    texto: "Sobre sin papeleta. Cuenta como válido.",
  },
  {
    titulo: "Nulo",
    texto: "Papeleta alterada, no oficial o de varias candidaturas.",
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
  {
    nombre: "Interior · Preguntas frecuentes: escrutinio y final de la jornada",
    url: FAQ_ESCRUTINIO,
  },
  {
    nombre: "Interior · Preguntas frecuentes: representantes de la Administración",
    url: FAQ_REPRESENTANTES,
  },
  {
    nombre: "Interior · Preguntas frecuentes: resultados electorales",
    url: FAQ_RESULTADOS,
  },
  {
    nombre: "Interior · Quién hace qué en el proceso electoral",
    url: QUIEN_HACE_QUE,
  },
  {
    nombre: "Real Decreto 605/1999, de regulación complementaria de los procesos electorales (BOE)",
    url: RD_605,
  },
];
