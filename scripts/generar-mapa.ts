// Proyecta los contornos de las provincias a rutas SVG simplificadas.
// Todas las fronteras se simplifican a la vez (TopoJSON, método de Visvalingam): una frontera
// compartida se simplifica una sola vez y coincide en las dos provincias, y los picos y lazos
// diminutos de las costas recortadas desaparecen.
// Entrada:  ../.tmp/geo/provincias.geojson  (descargado de
//   https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/spain-provinces.geojson;
//   comprobar su licencia antes de publicar el mapa).
// Salida:   src/datos/mapa-provincias.json
// Uso:      bun scripts/generar-mapa.ts   (desde la raíz del repo)
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
import { topology } from "topojson-server";
import { planarTriangleArea, presimplify, simplify } from "topojson-simplify";

type Anillo = [number, number][];
const K = 90; // px por grado de latitud
const LAT0 = 40; // paralelo de referencia para escalar la longitud
const COS = Math.cos((LAT0 * Math.PI) / 180);
const proyectar = ([lon, lat]: [number, number]): [number, number] => [
  lon * COS * K,
  -lat * K,
];

const area = (r: Anillo) => {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
};

const geo = JSON.parse(readFileSync("../.tmp/geo/provincias.geojson", "utf8"));
const CANARIAS = new Set(["35", "38"]);
const PEQUENAS = new Set(["51", "52"]); // Ceuta y Melilla: se conservan siempre

type Prov = { codigo: string; nombre: string; anillos: Anillo[] };
const provs: Prov[] = geo.features.map((f: any) => {
  const polis: Anillo[][] =
    f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const anillos: Anillo[] = [];
  for (const poli of polis) for (const anillo of poli) anillos.push(anillo.map(proyectar));
  return { codigo: f.properties.cod_prov, nombre: f.properties.name, anillos };
});

const caja = (ps: Prov[]) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of ps) for (const r of p.anillos) for (const [x, y] of r) {
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
};

// Canarias, reducidas y llevadas a un recuadro al suroeste de la península.
const pen = provs.filter((p) => !CANARIAS.has(p.codigo));
const can = provs.filter((p) => CANARIAS.has(p.codigo));
const cp = caja(pen);
const cc = caja(can);
const ESC = 0.62;
const [dx, dy] = [cp.x0 + 8 - cc.x0 * ESC, (cp.y1 - 6) - cc.y0 * ESC + 0];
for (const p of can)
  p.anillos = p.anillos.map((r) => r.map(([x, y]) => [x * ESC + dx, y * ESC + dy] as [number, number]));
const ci = caja(can);
const marco = { x0: ci.x0 - 8, y0: ci.y0 - 8, x1: ci.x1 + 8, y1: ci.y1 + 8 };

const todas = caja(provs);
const margen = 12;
const X0 = Math.min(todas.x0, marco.x0) - margen;
const Y0 = Math.min(todas.y0, marco.y0) - margen;
const X1 = Math.max(todas.x1, marco.x1) + margen;
const Y1 = Math.max(todas.y1, marco.y1) + margen;
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

// Peso mínimo (área del triángulo, en px²) por debajo del cual se quita un punto
const PESO_MIN = Number(process.env.PESO_MIN ?? 3);
{
  const colec = {
    type: "FeatureCollection" as const,
    features: provs.map((p) => ({
      type: "Feature" as const,
      id: p.codigo,
      properties: {},
      // cada anillo va como su propio polígono: aquí solo importa que las fronteras compartidas se reconozcan
      geometry: { type: "MultiPolygon" as const, coordinates: p.anillos.map((r) => [r]) },
    })),
  };
  // (los tipos de topojson-server y topojson-simplify no encajan del todo entre sí)
  const bruta = topology({ provincias: colec }) as unknown as Parameters<typeof presimplify>[0];
  const topo = simplify(presimplify(bruta, planarTriangleArea), PESO_MIN);
  const salidaTopo = feature(topo, topo.objects.provincias) as unknown as {
    features: { id: string; geometry: { coordinates: number[][][][] } | null }[];
  };
  for (const f of salidaTopo.features) {
    const p = provs.find((x) => x.codigo === f.id)!;
    const rings = (f.geometry?.coordinates ?? []).flat().map((r) => r.slice(0, -1) as Anillo);
    // Ceuta y Melilla son diminutas: si la simplificación se las llevara, se queda su forma original
    if (rings.length) p.anillos = rings;
  }
}

// Punto más «dentro» del anillo más grande de una provincia (el más alejado de su borde).
// Sirve para colocar cosas encima de la provincia: en Baleares el centro de la caja cae en el mar.
function distanciaAlBorde(px: number, py: number, r: Anillo) {
  let min = Infinity;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = dx || dy ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy))) : 0;
    min = Math.min(min, Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)));
  }
  return min;
}
function dentroDe(px: number, py: number, r: Anillo) {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function polo(r: Anillo): [number, number] {
  let ax = Infinity, ay = Infinity, bx = -Infinity, by = -Infinity;
  for (const [x, y] of r) { ax = Math.min(ax, x); ay = Math.min(ay, y); bx = Math.max(bx, x); by = Math.max(by, y); }
  let mejor: [number, number] = [(ax + bx) / 2, (ay + by) / 2];
  let mejorD = -Infinity;
  let paso = Math.max(bx - ax, by - ay) / 30;
  for (let ronda = 0; ronda < 4; ronda++) {
    for (let x = ax; x <= bx; x += paso)
      for (let y = ay; y <= by; y += paso) {
        const d = (dentroDe(x, y, r) ? 1 : -1) * distanciaAlBorde(x, y, r);
        if (d > mejorD) { mejorD = d; mejor = [x, y]; }
      }
    ax = mejor[0] - paso; bx = mejor[0] + paso; ay = mejor[1] - paso; by = mejor[1] + paso;
    paso /= 4;
  }
  return mejor;
}

const provincias = provs.map((p) => {
  const d = p.anillos
    .filter((r) => PEQUENAS.has(p.codigo) || area(r) >= 0.6)
    .map((r) => {
      return "M" + r.map(([x, y]) => `${f1(x - X0)},${f1(y - Y0)}`).join("L") + "Z";
    })
    .join("");
  const c = caja([p]);
  const mayor = [...p.anillos].sort((u, v) => area(v) - area(u))[0];
  const [ax, ay] = PEQUENAS.has(p.codigo) ? [(c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2] : polo(mayor);
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    d,
    centro: [f1((c.x0 + c.x1) / 2 - X0), f1((c.y0 + c.y1) / 2 - Y0)] as [string, string],
    ancla: [f1(ax - X0), f1(ay - Y0)] as [string, string],
  };
});

const m = (x: number, y: number) => `${f1(x - X0)},${f1(y - Y0)}`;
const salida = {
  ancho: Math.round(X1 - X0),
  alto: Math.round(Y1 - Y0),
  marcoCanarias: `M${m(marco.x0, marco.y0)}L${m(marco.x1, marco.y0)}L${m(marco.x1, marco.y1)}L${m(marco.x0, marco.y1)}Z`,
  provincias,
};
writeFileSync("src/datos/mapa-provincias.json", JSON.stringify(salida));
console.log(
  `${provincias.length} provincias, viewBox ${salida.ancho}x${salida.alto}, ${Math.round(JSON.stringify(salida).length / 1024)} KB`,
);
