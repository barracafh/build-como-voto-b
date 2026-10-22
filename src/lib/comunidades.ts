import provincias from "@/datos/provincias-2023.json";

// Comunidades autónomas y sus provincias (códigos INE de provincia).
export type Comunidad = { nombre: string; provincias: string[] };

export const COMUNIDADES: Comunidad[] = [
  { nombre: "Andalucía", provincias: ["04", "11", "14", "18", "21", "23", "29", "41"] },
  { nombre: "Aragón", provincias: ["22", "44", "50"] },
  { nombre: "Asturias", provincias: ["33"] },
  { nombre: "Canarias", provincias: ["35", "38"] },
  { nombre: "Cantabria", provincias: ["39"] },
  { nombre: "Castilla y León", provincias: ["05", "09", "24", "34", "37", "40", "42", "47", "49"] },
  { nombre: "Castilla-La Mancha", provincias: ["02", "13", "16", "19", "45"] },
  { nombre: "Cataluña", provincias: ["08", "17", "25", "43"] },
  { nombre: "Ceuta", provincias: ["51"] },
  { nombre: "Comunitat Valenciana", provincias: ["03", "12", "46"] },
  { nombre: "Extremadura", provincias: ["06", "10"] },
  { nombre: "Galicia", provincias: ["15", "27", "32", "36"] },
  { nombre: "Illes Balears", provincias: ["07"] },
  { nombre: "La Rioja", provincias: ["26"] },
  { nombre: "Madrid", provincias: ["28"] },
  { nombre: "Melilla", provincias: ["52"] },
  { nombre: "Murcia", provincias: ["30"] },
  { nombre: "Navarra", provincias: ["31"] },
  { nombre: "País Vasco", provincias: ["01", "20", "48"] },
];

export const comunidadDe = (codigo: string) =>
  COMUNIDADES.find((c) => c.provincias.includes(codigo)) ?? COMUNIDADES[0];

/** Provincias de una comunidad, por orden alfabético. */
export const provinciasDe = (comunidad: Comunidad) =>
  comunidad.provincias
    .map((codigo) => provincias.find((p) => p.codigo === codigo)!)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
