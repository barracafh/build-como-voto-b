// Lo que circula sobre cómo se vota, contrastado con la norma. Solo
// afirmaciones del tipo (a) de contexto.md (proceso electoral), con el
// artículo que las contradice; sin candidaturas, partidos ni encuestas.
// Siguiendo contexto.md 6.2, no se califica la afirmación (ni «falso» ni
// «bulo»): se dice si coincide o no con la fuente y se cita. El ejemplo del
// umbral es el de contexto.md 3.2, con datos inventados.

import { fecha, plazos, type Fuente } from "@/datos/como-votar";

const LOREG = "https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672";
const art = (n: string): Fuente => ({ nombre: `LOREG, art. ${n} (BOE)`, url: LOREG });

const INTERIOR_FAQ: Fuente = {
  nombre: "Interior · Preguntas frecuentes: desarrollo de la votación",
  url: "https://infoelectoral.interior.gob.es/es/proceso-electoral/preguntas-frecuentes/desarrollo-de-la-votacion/",
};
const INTERIOR_SUFRAGIO: Fuente = {
  nombre: "Interior · Preguntas frecuentes: el derecho de sufragio",
  url: "https://infoelectoral.interior.gob.es/es/proceso-electoral/preguntas-frecuentes/el-derecho-de-sufragio/",
};
const JEC_1_2012: Fuente = {
  nombre: "Instrucción JEC 1/2012, sobre papeletas con marcas (BOE)",
  url: "https://www.boe.es/buscar/doc.php?id=BOE-A-2012-3859",
};
const INE_GUIA: Fuente = {
  nombre: "INE · Guía de funciones electorales",
  url: "https://www.ine.es/dyngs/CEL/index.htm?cid=1700",
};
const ET: Fuente = {
  nombre: "Estatuto de los Trabajadores, art. 37.3.d (BOE)",
  url: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430",
};
const RD605: Fuente = {
  nombre: "Real Decreto 605/1999, art. 13 (BOE)",
  url: "https://www.boe.es/buscar/act.php?id=BOE-A-1999-8583",
};

export type Afirmacion = {
  id: string;
  // Lo que se dice, tal como circula.
  dice: string;
  // Lo que dice la norma, en una frase.
  ley: string;
  texto: string;
  // Lo que el contraste no dice, o la excepción.
  matiz?: string;
  fuente: Fuente;
  // Verificación profesional publicada sobre lo mismo, atribuida y enlazada.
  verificacion?: { nombre: string; fecha: string; url: string };
};

export type Tema = {
  id: string;
  titulo: string;
  afirmaciones: Afirmacion[];
};

export const temas: Tema[] = [
  {
    id: "blanco",
    titulo: "Voto en blanco, nulo y abstención",
    afirmaciones: [
      {
        id: "blanco-reparte",
        dice: "El voto en blanco se lo lleva el partido más votado.",
        ley: "No va a ninguna candidatura.",
        texto:
          "El voto en blanco es válido, pero no se asigna a nadie: no suma votos a ningún partido ni genera escaño. Lo que sí hace es contar en la base sobre la que se calcula el 3 % mínimo para entrar en el reparto, así que sube esa barrera para todos.",
        fuente: art("96.5, 108.4 y 163.1"),
      },
      {
        id: "blanco-abstencion",
        dice: "Votar en blanco es lo mismo que quedarse en casa.",
        ley: "El blanco es voto válido; la abstención no es voto.",
        texto:
          "El voto en blanco se cuenta como válido y entra en el cálculo del 3 %. La abstención no computa como voto: los escaños se reparten solo con los votos válidos emitidos.",
        fuente: art("108.4 y 163.1.a"),
      },
      {
        id: "nulo-blanco",
        dice: "Un voto nulo cuenta como voto en blanco.",
        ley: "El nulo no es válido; el blanco sí.",
        texto:
          "El voto nulo no cuenta en la base del 3 % ni en el reparto. Aparece aparte en el acta de la mesa, como «votos nulos».",
        fuente: art("96 y 108.1"),
      },
      {
        id: "sobre-vacio",
        dice: "Si metes el sobre vacío en la urna, tu voto es nulo.",
        ley: "Un sobre sin papeleta es voto en blanco.",
        texto:
          "En el Congreso, el voto en blanco es precisamente eso: el sobre sin papeleta. En el Senado, también la papeleta sin ningún candidato marcado.",
        fuente: art("96.5"),
      },
      {
        id: "escanos-vacios",
        dice: "Si hay muchos votos en blanco, se quedan escaños vacíos.",
        ley: "Todos los escaños se reparten entre candidaturas.",
        texto:
          "Cada provincia reparte todos sus escaños, con la fórmula D'Hondt, entre las candidaturas que superan el 3 % de los votos válidos. El voto en blanco no genera escaño, ni ocupado ni vacío.",
        fuente: art("163.1"),
      },
    ],
  },
  {
    id: "papeleta",
    titulo: "La papeleta y el sobre",
    afirmaciones: [
      {
        id: "tachar",
        dice: "Si tachas un nombre de la lista, el voto sigue valiendo.",
        ley: "Una papeleta tachada o con añadidos es nula.",
        texto:
          "Son nulas las papeletas en las que se han modificado, añadido o tachado nombres, cambiado su orden o escrito leyendas, y los sobres alterados.",
        matiz:
          "Una señal, cruz o aspa junto a un candidato no anula el voto si no altera la papeleta ni expresa reproche (Instrucción JEC 1/2012). En el Senado, los candidatos se marcan precisamente con una cruz.",
        fuente: JEC_1_2012,
      },
      {
        id: "dos-papeletas",
        dice: "Si metes dos papeletas iguales en el sobre, el voto es nulo.",
        ley: "Varias papeletas de la misma candidatura cuentan como un voto.",
        texto:
          "Solo es nulo el sobre con papeletas de candidaturas distintas. Si todas son de la misma, se computa un solo voto válido.",
        fuente: art("96"),
      },
      {
        id: "senado-todos",
        dice: "En el Senado puedes marcar a todos los candidatos que quieras.",
        ley: "Hay un máximo de cruces, y pasarse anula el voto.",
        texto:
          "Hasta 3 candidatos en las provincias; 2 en Gran Canaria, Mallorca, Tenerife, Ceuta y Melilla, y 1 en el resto de islas. Una papeleta con más nombres marcados es nula.",
        fuente: art("96 y 166.1"),
      },
    ],
  },
  {
    id: "dia",
    titulo: "El día de votar",
    afirmaciones: [
      {
        id: "obligatorio",
        dice: "Votar es obligatorio.",
        ley: "Votar es un derecho, no una obligación.",
        texto:
          "Nadie puede ser obligado ni coaccionado a votar. Lo que sí es obligatorio es ser miembro de mesa si te toca en el sorteo.",
        fuente: art("5 y 27.1"),
      },
      {
        id: "revelar",
        dice: "En la mesa te pueden pedir que digas a quién votas.",
        ley: "El voto es secreto.",
        texto:
          "El voto es personal y secreto, y nadie puede obligarte a revelarlo, ni dentro ni fuera del colegio.",
        fuente: art("5 y 86"),
      },
      {
        id: "fotocopia",
        dice: "Para votar basta con una fotocopia del DNI.",
        ley: "Hace falta el documento original.",
        texto:
          "Valen el DNI, el pasaporte o el permiso de conducir con fotografía, en original. Interior aclara que no valen fotocopias ni el resguardo del DNI en trámite.",
        fuente: INTERIOR_FAQ,
      },
      {
        id: "tarjeta-censal",
        dice: "Sin la tarjeta censal que llega a casa no puedes votar.",
        ley: "La tarjeta censal no es requisito.",
        texto:
          "Basta con estar inscrito en las listas del censo de tu mesa e identificarte con un documento válido. Tu mesa y tu colegio puedes consultarlos en la sede del INE.",
        fuente: art("85.1"),
      },
      {
        id: "trabajo",
        dice: "Si trabajas el día 29, tu empresa no tiene por qué dejarte ir a votar.",
        ley: "Tienes permiso retribuido para votar.",
        texto:
          "El Estatuto de los Trabajadores da permiso pagado por el tiempo indispensable para votar. El Real Decreto 605/1999 prevé hasta cuatro horas libres retribuidas dentro de tu horario.",
        matiz:
          "Las horas concretas de cada elección las fijan las administraciones con competencias laborales; no las hemos podido confirmar para el 29-N.",
        fuente: ET,
      },
    ],
  },
  {
    id: "correo",
    titulo: "Por correo y desde el extranjero",
    afirmaciones: [
      {
        id: "correo-y-mesa",
        dice: "Si pides el voto por correo y al final no lo envías, puedes votar en tu mesa.",
        ley: "Si lo pides, ya no puedes votar en persona.",
        texto:
          "Al aceptarse la solicitud quedas anotado en el censo para que no votes en la mesa, aunque no llegues a enviar el voto por correo.",
        fuente: art("73.1"),
        verificacion: {
          nombre: "Maldita.es",
          fecha: "6 de octubre de 2026",
          url: "https://maldita.es/desinfo/20261006/para-asegurar-el-voto-por-correo-hay-que-ir-a-votar-a-la-mesa-electoral-tambien/",
        },
      },
      {
        id: "correo-tarde",
        dice: "El voto por correo vale aunque llegue a la mesa después de las 20:00.",
        ley: "Lo que llega después de las 20:00 no se cuenta.",
        texto:
          `Correos entrega los votos a las mesas hasta las 20:00. Los sobres que llegan más tarde se envían a la Junta Electoral de Zona y no se computan. Por eso hay que enviarlo como tarde el ${fecha(plazos.correoRemision.fin)}.`,
        fuente: art("73.3 y 73.4"),
      },
      {
        id: "extranjero-rogado",
        dice: "Si vives en el extranjero, tienes que pedir el voto.",
        ley: "Desde 2022, la documentación llega sin pedirla.",
        texto:
          "La reforma de 2022 (LO 12/2022) eliminó el «voto rogado»: si estás inscrito en el censo de residentes ausentes (CERA), la Oficina del Censo Electoral te envía la documentación de oficio.",
        matiz:
          "Si vives en España y estás fuera solo una temporada (ERTA), sí tienes que pedirla, en persona en el consulado.",
        fuente: art("75.1"),
      },
    ],
  },
];

// El 3 %, con y sin votos en blanco. Datos inventados (contexto.md 3.2).
export const ejemploUmbral = {
  validos: 180_300,
  blancos: 8_000,
  candidatura: 5_300,
};

export const fuentesBulos: Fuente[] = [
  {
    nombre: "BOE · LOREG (Ley Orgánica 5/1985), texto consolidado",
    url: LOREG,
  },
  INTERIOR_FAQ,
  INTERIOR_SUFRAGIO,
  JEC_1_2012,
  INE_GUIA,
  ET,
  RD605,
];
