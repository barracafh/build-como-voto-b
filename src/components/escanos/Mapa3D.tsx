"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { BufferGeometry, Group, Mesh, MeshLambertMaterial, Vector3 } from "three";
import mapa from "@/datos/mapa-provincias.json";
import { Button } from "@/components/ui/button";
import { COMUNIDADES, provinciasDe } from "@/lib/comunidades";
import { SIN_ESCANO, hexGrupo, type ResultadoMapa } from "@/lib/mapa";
import { anillos, poligonos, type Punto } from "@/lib/geometria";
import type { Nacional } from "@/lib/nacional";

// Cada escaño es un piso de la misma altura en todas las provincias:
// lo que cambia de una provincia a otra es cuántos pisos tiene el edificio.
const UNIDAD = 6;
const GROSOR = UNIDAD * 0.86; // el resto es el hueco entre pisos
const PEQUENAS = new Set(["51", "52"]); // Ceuta y Melilla: cilindro
const CANARIAS = new Set(["35", "38"]);
// Separación al hacer scroll, en dos niveles. Cada comunidad se aleja del centro del mapa
// (fracción de su distancia a él) y, además, sus provincias se alejan del centro de su comunidad.
const SEPARACION_COMUNIDAD = 0.32;
const SEPARACION_PROVINCIA = 0.22;
const SEPARACION_CANARIAS = 0.6; // entre las dos provincias canarias
// Vista «desmontada»: una celda por bloque de partido.
const CELDA = 150; // separación entre bloques
const AJUSTE = 118; // tamaño al que se ajusta la silueta de cada provincia
const ALTURA_NACIONAL = 300; // altura de la barra del partido con más escaños
const SIN_REPARTO = "sin reparto";

type Pieza = { x: number; y: number; z: number; sx: number; sy: number };
type DatosPieza = { codigo?: string; bloque?: number; capa?: number; origen: Pieza; destino?: Pieza };
type Vista = { tipo: "mapa" } | { tipo: "comunidad"; nombre: string } | { tipo: "nacional" };

type Props = {
  /** Contenedor alto que da el recorrido de scroll: el mapa queda fijo dentro y se va separando. */
  envoltorio: RefObject<HTMLDivElement | null>;
  resultado: ResultadoMapa;
  /** Si hay reparto nacional, el país se unifica y se parte en un bloque por partido. */
  nacional: Nacional | null;
  /** Comunidad que se desmonta en piezas por partido. */
  foco: string | null;
  codigo: string;
  onSelect: (codigo: string) => void;
  onHover: (codigo: string | null, clientX?: number, clientY?: number) => void;
  onError: () => void;
};

type Api = {
  pintar: (r: ResultadoMapa) => void;
  pintarNacional: (n: Nacional | null) => void;
  vista: (v: Vista) => void;
  marcar: (seleccionada: string) => void;
  encuadrar: () => void;
};

const igualVista = (a: Vista, b: Vista) =>
  a.tipo === b.tipo && (a.tipo !== "comunidad" || a.nombre === (b as { nombre: string }).nombre);
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const acotar = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export function Mapa3D(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const actual = useRef(props);
  actual.current = props;

  useEffect(() => {
    let vivo = true;
    let limpiar = () => {};

    (async () => {
      const T = await import("three");
      const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
      const { mergeGeometries } = await import("three/addons/utils/BufferGeometryUtils.js");
      const el = host.current;
      if (!vivo || !el) return;

      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try {
        renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        actual.current.onError();
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const canvas = renderer.domElement;
      canvas.style.display = "block";
      canvas.style.touchAction = "none";
      canvas.setAttribute("aria-hidden", "true");
      el.appendChild(canvas);

      // Capa de etiquetas (HTML sobre el lienzo): nombre de cada partido sobre su bloque
      const capaEtiquetas = document.createElement("div");
      capaEtiquetas.className = "pointer-events-none absolute inset-0 overflow-hidden";
      el.appendChild(capaEtiquetas);

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(30, 1, 10, 9000);
      scene.add(new T.AmbientLight(0xffffff, 1.5));
      const sol = new T.DirectionalLight(0xffffff, 2.4);
      sol.position.set(-600, 1000, 800);
      scene.add(sol);

      const raiz = new T.Group();
      raiz.position.set(-mapa.ancho / 2, 0, -mapa.alto / 2);
      scene.add(raiz);
      raiz.updateMatrixWorld(true);

      // ---------- Geometrías ----------
      // Cada provincia se triangula una vez y se reutiliza en todos sus pisos.
      const geometrias = new Map<string, BufferGeometry>();
      const capas = new Map<string, Group>();
      const cajas = new Map<string, { cx: number; cz: number; w: number; h: number }>();
      let ex0 = Infinity;
      let ez0 = Infinity;
      let ex1 = -Infinity;
      let ez1 = -Infinity;
      for (const p of mapa.provincias) {
        const formas: InstanceType<typeof T.Shape>[] = [];
        let x0 = Infinity;
        let z0 = Infinity;
        let x1 = -Infinity;
        let z1 = -Infinity;
        if (PEQUENAS.has(p.codigo)) {
          const [cx, cz] = [Number(p.centro[0]), Number(p.centro[1])];
          const s = new T.Shape();
          s.absarc(cx, -cz, 13, 0, Math.PI * 2, false);
          formas.push(s);
          [x0, z0, x1, z1] = [cx - 13, cz - 13, cx + 13, cz + 13];
        } else {
          const rs = anillos(p.d);
          for (const r of rs)
            for (const [x, y] of r) {
              x0 = Math.min(x0, x);
              z0 = Math.min(z0, y);
              x1 = Math.max(x1, x);
              z1 = Math.max(z1, y);
            }
          for (const e of poligonos(rs)) {
            const s = new T.Shape(e.r.map(([x, y]) => new T.Vector2(x, -y)));
            for (const h of e.huecos) s.holes.push(new T.Path(h.map(([x, y]) => new T.Vector2(x, -y))));
            formas.push(s);
          }
        }
        if (!formas.length) continue;
        const geo = new T.ExtrudeGeometry(formas, { depth: GROSOR, bevelEnabled: false, curveSegments: 1 });
        geo.rotateX(-Math.PI / 2); // tumbada: la altura pasa al eje Y
        geometrias.set(p.codigo, geo);
        cajas.set(p.codigo, { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w: x1 - x0, h: z1 - z0 });
        ex0 = Math.min(ex0, x0);
        ez0 = Math.min(ez0, z0);
        ex1 = Math.max(ex1, x1);
        ez1 = Math.max(ez1, z1);
        const g = new T.Group();
        raiz.add(g);
        capas.set(p.codigo, g);
      }
      // España entera en una sola pieza (para el reparto nacional)
      const geoEspana = mergeGeometries([...geometrias.values()], false);
      const cajaEspana = { cx: (ex0 + ex1) / 2, cz: (ez0 + ez1) / 2, w: ex1 - ex0, h: ez1 - ez0 };
      const grupoNacional = new T.Group();
      grupoNacional.visible = false;
      raiz.add(grupoNacional);

      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 150;
      controls.maxDistance = 3800;
      controls.maxPolarAngle = Math.PI / 2 - 0.04;

      const DIR = new T.Vector3(0, 0.62, 0.78).normalize();
      const OBJETIVO = new T.Vector3(-30, 30, 40);
      let sucio = true;
      const tamano = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        sucio = true;
      };
      const encuadrarMapa = () => {
        tamano();
        const dist = 2300 * Math.max(1, 0.9 / camera.aspect);
        camera.position.copy(OBJETIVO).addScaledVector(DIR, dist);
        controls.target.copy(OBJETIVO);
        controls.update();
        sucio = true;
      };
      encuadrarMapa();
      const observador = new ResizeObserver(tamano);
      observador.observe(el);

      // ---------- Estado ----------
      let resultado = actual.current.resultado;
      let nacional: Nacional | null = null;
      let seleccionada = actual.current.codigo;
      let sobre: string | null = null;
      let pickables: Mesh[] = [];
      let vistaObjetivo: Vista = { tipo: "mapa" };
      let vistaActiva: Vista = { tipo: "mapa" };
      let f = 0; // 0 = mapa normal, 1 = vista desmontada
      let fObjetivo = 0;
      const camMapa = { pos: new T.Vector3(), target: new T.Vector3() };
      const camVista = { pos: new T.Vector3(), target: new T.Vector3() };
      type Etiqueta = { el: HTMLDivElement; pos: Vector3; alinear: "centro" | "derecha" };
      let etiquetas: Etiqueta[] = [];
      const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const meshesDe = (codigos: string[]) =>
        codigos.flatMap((c) => (capas.get(c)?.children ?? []) as Mesh[]);
      const todosProvinciales = () => meshesDe([...capas.keys()]);
      const codigosFoco = (): string[] => {
        if (vistaActiva.tipo !== "comunidad") return [];
        const nombre = vistaActiva.nombre;
        return COMUNIDADES.find((c) => c.nombre === nombre)?.provincias ?? [];
      };
      const piezasActivas = (): Mesh[] =>
        vistaActiva.tipo === "comunidad"
          ? meshesDe(codigosFoco())
          : vistaActiva.tipo === "nacional"
            ? (grupoNacional.children as Mesh[])
            : [];
      const recalcularPickables = () => {
        pickables = vistaActiva.tipo === "mapa" ? todosProvinciales() : vistaActiva.tipo === "comunidad" ? meshesDe(codigosFoco()) : [];
      };

      // ---------- Separación con el scroll ----------
      const centroMapa: Punto = [mapa.ancho / 2, mapa.alto / 2];
      const canarias = mapa.provincias.filter((p) => CANARIAS.has(p.codigo));
      const centroCanarias: Punto = [
        canarias.reduce((m, p) => m + Number(p.centro[0]), 0) / canarias.length,
        canarias.reduce((m, p) => m + Number(p.centro[1]), 0) / canarias.length,
      ];
      const apartar = new Map<string, Punto>();
      const centroProvincia = (codigo: string): Punto => {
        const p = mapa.provincias.find((x) => x.codigo === codigo)!;
        return [Number(p.centro[0]), Number(p.centro[1])];
      };
      for (const com of COMUNIDADES) {
        const cps = com.provincias.map(centroProvincia);
        const centroCom: Punto = [
          cps.reduce((m, c) => m + c[0], 0) / cps.length,
          cps.reduce((m, c) => m + c[1], 0) / cps.length,
        ];
        com.provincias.forEach((codigo, i) => {
          const c = cps[i];
          if (CANARIAS.has(codigo)) {
            apartar.set(codigo, [
              (c[0] - centroCanarias[0]) * SEPARACION_CANARIAS,
              (c[1] - centroCanarias[1]) * SEPARACION_CANARIAS,
            ]);
            return;
          }
          apartar.set(codigo, [
            (centroCom[0] - centroMapa[0]) * SEPARACION_COMUNIDAD + (c[0] - centroCom[0]) * SEPARACION_PROVINCIA,
            (centroCom[1] - centroMapa[1]) * SEPARACION_COMUNIDAD + (c[1] - centroCom[1]) * SEPARACION_PROVINCIA,
          ]);
        });
      }
      // Canarias se aparta un poco hacia su esquina para no chocar con Andalucía.
      const empujeCanarias: Punto = [-20, 50];
      const separar = (s: number) => {
        for (const [codigo, g] of capas) {
          const [dx, dz] = apartar.get(codigo) ?? [0, 0];
          const [ex, ez] = CANARIAS.has(codigo) ? empujeCanarias : [0, 0];
          g.position.set((dx + ex) * s, 0, (dz + ez) * s);
        }
      };
      const leerScroll = () => {
        const env = actual.current.envoltorio.current;
        if (!env) return 0;
        const caja = env.getBoundingClientRect();
        const fijo = env.firstElementChild as HTMLElement | null;
        const recorrido = caja.height - (fijo?.offsetHeight ?? 0);
        // 16 px: el «top-4» con el que el mapa queda fijo
        return recorrido > 0 ? acotar((16 - caja.top) / recorrido) : 0;
      };
      let separacion = 0;
      let objetivoSep = leerScroll();
      const alScroll = () => (objetivoSep = leerScroll());
      window.addEventListener("scroll", alScroll, { passive: true });
      window.addEventListener("resize", alScroll);

      // ---------- Pisos de las provincias ----------
      const brillo = () => {
        for (const [codigo, g] of capas) {
          const e = codigo === seleccionada ? 0x505050 : codigo === sobre ? 0x2c2c2c : 0x000000;
          for (const m of g.children as Mesh[]) (m.material as MeshLambertMaterial).emissive.setHex(e);
        }
        sucio = true;
      };
      const colorBloque = (grupo: string) => (grupo === SIN_REPARTO ? SIN_ESCANO : hexGrupo(grupo));
      const nuevaPieza = (geo: BufferGeometry, color: string, datos: DatosPieza) => {
        const m = new T.Mesh(geo, new T.MeshLambertMaterial({ color }));
        m.userData = datos;
        m.position.set(datos.origen.x, datos.origen.y, datos.origen.z);
        m.scale.set(datos.origen.sx, datos.origen.sy, datos.origen.sx);
        return m;
      };
      const pintar = (r: ResultadoMapa) => {
        resultado = r;
        for (const [codigo, g] of capas) {
          for (const m of [...g.children] as Mesh[]) {
            (m.material as MeshLambertMaterial).dispose();
            g.remove(m);
          }
          const res = r.porCodigo.get(codigo);
          if (!res) continue;
          // De abajo arriba, de menos a más escaños: el ganador queda en el piso de arriba,
          // así que mirando el mapa desde arriba se ve quién gana cada provincia.
          const grupos = Object.entries(res.porGrupo)
            .filter(([, n]) => n > 0)
            .sort((a, b) => a[1] - b[1]);
          let piso = 0;
          grupos.forEach(([grupo, n], gi) => {
            for (let k = 0; k < n; k++, piso++)
              g.add(
                nuevaPieza(geometrias.get(codigo)!, colorBloque(grupo), {
                  codigo,
                  bloque: grupos.length - 1 - gi, // en la vista desmontada, el mayor a la izquierda
                  capa: k,
                  origen: { x: 0, y: piso * UNIDAD, z: 0, sx: 1, sy: 1 },
                }),
              );
          });
          for (let k = 0; piso < res.provincia.escanos; k++, piso++)
            g.add(
              nuevaPieza(geometrias.get(codigo)!, SIN_ESCANO, {
                codigo,
                bloque: grupos.length,
                capa: k,
                origen: { x: 0, y: piso * UNIDAD, z: 0, sx: 1, sy: 1 },
              }),
            );
        }
        brillo();
        if (vistaActiva.tipo === "comunidad") aplicarPlan(false);
        recalcularPickables();
        recolocar();
      };

      // ---------- Vista desmontada: planes, etiquetas y cámara ----------
      const limpiarEtiquetas = () => {
        for (const e of etiquetas) e.el.remove();
        etiquetas = [];
      };
      const nuevaEtiqueta = (texto: string, color: string | null, local: Vector3, alinear: "centro" | "derecha") => {
        const div = document.createElement("div");
        div.className =
          "absolute top-0 left-0 flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-background/95 px-2 py-0.5 text-xs font-medium text-foreground opacity-0 shadow-sm ring-1 ring-foreground/15 will-change-transform";
        if (color) {
          const punto = document.createElement("span");
          punto.className = "size-2.5 shrink-0 rounded-sm";
          punto.style.background = color;
          div.appendChild(punto);
        }
        const t = document.createElement("span");
        t.textContent = texto;
        div.appendChild(t);
        capaEtiquetas.appendChild(div);
        etiquetas.push({ el: div, pos: raiz.localToWorld(local.clone()), alinear });
      };
      const camaraPara = (centroLocal: Vector3, ancho: number, fondo: number, alto: number) => {
        const tan = Math.tan(((camera.fov / 2) * Math.PI) / 180);
        const dir = new T.Vector3(0, 0.78, 0.62).normalize();
        const dAlto = (fondo * 0.78 + alto * 0.62 + 90) / (2 * tan);
        const dAncho = ancho / (2 * tan * camera.aspect);
        const d = Math.max(dAlto, dAncho) * 1.15;
        const target = raiz.localToWorld(centroLocal.clone()).add(new T.Vector3(0, alto * 0.25, 0));
        camVista.target.copy(target);
        camVista.pos.copy(target).addScaledVector(dir, d);
      };

      // Una comunidad: una fila por provincia y, en cada fila, un bloque por partido (de más a menos escaños).
      const aplicarComunidad = (nombre: string, moverCamara: boolean) => {
        const com = COMUNIDADES.find((c) => c.nombre === nombre);
        if (!com) return;
        const provs = provinciasDe(com);
        const info = provs.map((p, fila) => {
          const res = resultado.porCodigo.get(p.codigo)!;
          const grupos = Object.entries(res.porGrupo)
            .filter(([, n]) => n > 0)
            .sort((a, b) => b[1] - a[1]);
          const asignados = grupos.reduce((m, [, n]) => m + n, 0);
          if (asignados < p.escanos) grupos.push([SIN_REPARTO, p.escanos - asignados]);
          const c = cajas.get(p.codigo)!;
          return { codigo: p.codigo, nombre: p.nombre, fila, grupos, escanos: p.escanos, c, sc: Math.min(5, AJUSTE / Math.max(c.w, c.h, 1)) };
        });
        const maxK = Math.max(...info.map((i) => i.grupos.length));
        const cx = info.reduce((m, i) => m + i.c.cx, 0) / info.length;
        const cz = info.reduce((m, i) => m + i.c.cz, 0) / info.length;
        const X0 = cx - ((maxK - 1) * CELDA) / 2;
        const Z0 = cz - ((info.length - 1) * CELDA) / 2;
        const altoMax = Math.max(...info.map((i) => i.escanos)) * UNIDAD;

        limpiarEtiquetas();
        for (const i of info) {
          for (const m of capas.get(i.codigo)!.children as Mesh[]) {
            const d = m.userData as DatosPieza;
            d.destino = {
              x: X0 + (d.bloque ?? 0) * CELDA - i.c.cx * i.sc,
              z: Z0 + i.fila * CELDA - i.c.cz * i.sc,
              y: (d.capa ?? 0) * UNIDAD,
              sx: i.sc,
              sy: 1,
            };
          }
          nuevaEtiqueta(i.nombre.split("/")[0], null, new T.Vector3(X0 - CELDA * 0.62, 2, Z0 + i.fila * CELDA), "derecha");
          i.grupos.forEach(([grupo, n], j) =>
            nuevaEtiqueta(`${grupo} · ${n}`, colorBloque(grupo), new T.Vector3(X0 + j * CELDA, n * UNIDAD + 16, Z0 + i.fila * CELDA), "centro"),
          );
        }
        if (moverCamara)
          camaraPara(
            new T.Vector3(cx - CELDA * 0.4, 0, cz),
            (maxK - 1) * CELDA + AJUSTE + CELDA * 1.3,
            (info.length - 1) * CELDA + AJUSTE,
            altoMax,
          );
      };

      // Toda España: una torre unificada que se parte en una barra por partido.
      let planNac: { n: number; X0: number; ky: number; altoMax: number } | null = null;
      const pintarNacional = (nac: Nacional | null) => {
        nacional = nac;
        for (const m of [...grupoNacional.children] as Mesh[]) {
          (m.material as MeshLambertMaterial).dispose();
          grupoNacional.remove(m);
        }
        planNac = null;
        if (!nac || !geoEspana) return;
        const grupos = nac.filas.filter((x) => x.escanos > 0);
        const maxEsc = Math.max(1, ...grupos.map((x) => x.escanos));
        const ky = Math.min(1, ALTURA_NACIONAL / (maxEsc * UNIDAD));
        const sc = AJUSTE / Math.max(cajaEspana.w, cajaEspana.h);
        const X0 = cajaEspana.cx - ((grupos.length - 1) * CELDA) / 2;
        let piso = 0;
        // La torre unificada se apila de menos a más escaños (el mayor arriba) y más aplastada.
        [...grupos].reverse().forEach((g) => {
          const j = grupos.indexOf(g);
          for (let k = 0; k < g.escanos; k++, piso++)
            grupoNacional.add(
              nuevaPieza(geoEspana, hexGrupo(g.grupo), {
                bloque: j,
                capa: k,
                origen: { x: 0, y: piso * UNIDAD * ky * 0.3, z: 0, sx: 1, sy: ky * 0.3 },
                destino: {
                  x: X0 + j * CELDA - cajaEspana.cx * sc,
                  z: cajaEspana.cz - cajaEspana.cz * sc,
                  y: k * UNIDAD * ky,
                  sx: sc,
                  sy: ky,
                },
              }),
            );
        });
        planNac = { n: grupos.length, X0, ky, altoMax: maxEsc * UNIDAD * ky };
        if (vistaActiva.tipo === "nacional") aplicarPlan(false);
        recolocar();
      };
      const aplicarNacional = (moverCamara: boolean) => {
        limpiarEtiquetas();
        if (!nacional || !planNac) return;
        const { n, X0, ky, altoMax } = planNac;
        nacional.filas
          .filter((x) => x.escanos > 0)
          .forEach((g, j) =>
            nuevaEtiqueta(`${g.grupo} · ${g.escanos}`, hexGrupo(g.grupo), new T.Vector3(X0 + j * CELDA, g.escanos * UNIDAD * ky + 16, cajaEspana.cz), "centro"),
          );
        if (moverCamara)
          camaraPara(new T.Vector3(cajaEspana.cx, 0, cajaEspana.cz), (n - 1) * CELDA + AJUSTE + 80, AJUSTE, altoMax);
      };
      const aplicarPlan = (moverCamara: boolean) => {
        if (vistaActiva.tipo === "comunidad") aplicarComunidad(vistaActiva.nombre, moverCamara);
        else if (vistaActiva.tipo === "nacional") aplicarNacional(moverCamara);
      };

      // ---------- Transición ----------
      const colocarEtiquetas = () => {
        if (!etiquetas.length) return;
        const w = el.clientWidth;
        const h = el.clientHeight;
        const opacidad = acotar((f - 0.65) / 0.35);
        const v = new T.Vector3();
        for (const e of etiquetas) {
          v.copy(e.pos).project(camera);
          e.el.style.opacity = v.z < 1 ? String(opacidad) : "0";
          const x = (v.x * 0.5 + 0.5) * w;
          const y = (-v.y * 0.5 + 0.5) * h;
          e.el.style.transform = `translate(${x}px, ${y}px) translate(${e.alinear === "derecha" ? "-100%, -50%" : "-50%, -100%"})`;
        }
      };
      function recolocar() {
        const e = ease(f);
        const tipo = vistaActiva.tipo;
        const foco = new Set(codigosFoco());
        for (const [codigo, g] of capas)
          g.visible = tipo === "mapa" || f < (tipo === "nacional" ? 0.02 : 0.12) || foco.has(codigo);
        grupoNacional.visible = tipo === "nacional";
        separar(separacion * (1 - e));
        for (const m of piezasActivas()) {
          const d = m.userData as DatosPieza;
          const o = d.origen;
          const t = d.destino ?? o;
          m.position.set(lerp(o.x, t.x, e), lerp(o.y, t.y, e), lerp(o.z, t.z, e));
          m.scale.set(lerp(o.sx, t.sx, e), lerp(o.sy, t.sy, e), lerp(o.sx, t.sx, e));
        }
        if (f > 0 && f < 1) {
          camera.position.lerpVectors(camMapa.pos, camVista.pos, e);
          controls.target.lerpVectors(camMapa.target, camVista.target, e);
        }
        sucio = true;
      }
      const entrar = () => {
        if (f === 0) {
          camMapa.pos.copy(camera.position);
          camMapa.target.copy(controls.target);
        }
        aplicarPlan(true);
        recalcularPickables();
        fObjetivo = 1;
      };
      const pedirVista = (v: Vista) => {
        if (igualVista(v, vistaObjetivo)) {
          if (igualVista(v, vistaActiva)) {
            aplicarPlan(false);
            recolocar();
          }
          return;
        }
        vistaObjetivo = v;
      };

      // ---------- Ratón: pasar por encima y pulsar (sin confundirlo con arrastrar para girar) ----------
      const rayo = new T.Raycaster();
      const puntero = new T.Vector2();
      const buscar = (e: PointerEvent) => {
        const caja = canvas.getBoundingClientRect();
        puntero.set(((e.clientX - caja.left) / caja.width) * 2 - 1, -((e.clientY - caja.top) / caja.height) * 2 + 1);
        rayo.setFromCamera(puntero, camera);
        return (rayo.intersectObjects(pickables, false)[0]?.object.userData.codigo as string | undefined) ?? null;
      };
      let inicio: Punto | null = null;
      const alMover = (e: PointerEvent) => {
        if (e.buttons) {
          actual.current.onHover(null);
          return;
        }
        const c = buscar(e);
        canvas.style.cursor = c ? "pointer" : "grab";
        if (c !== sobre) {
          sobre = c;
          brillo();
        }
        actual.current.onHover(c, e.clientX, e.clientY);
      };
      const alBajar = (e: PointerEvent) => (inicio = [e.clientX, e.clientY]);
      const alSubir = (e: PointerEvent) => {
        if (!inicio || Math.hypot(e.clientX - inicio[0], e.clientY - inicio[1]) > 5) return;
        const c = buscar(e);
        if (c) actual.current.onSelect(c);
      };
      const alSalir = () => {
        sobre = null;
        brillo();
        actual.current.onHover(null);
      };
      canvas.addEventListener("pointermove", alMover);
      canvas.addEventListener("pointerdown", alBajar);
      canvas.addEventListener("pointerup", alSubir);
      canvas.addEventListener("pointerleave", alSalir);
      controls.addEventListener("change", () => (sucio = true));

      // ---------- Bucle ----------
      let raf = 0;
      const bucle = () => {
        raf = requestAnimationFrame(bucle);
        if (separacion !== objetivoSep) {
          separacion =
            reducido || Math.abs(objetivoSep - separacion) < 0.002
              ? objetivoSep
              : separacion + (objetivoSep - separacion) * 0.14;
          separar(separacion * (1 - ease(f)));
          sucio = true;
        }
        // Cambio de vista: primero se vuelve al mapa y luego se entra en la nueva
        if (!igualVista(vistaActiva, vistaObjetivo)) {
          if (f > 0) {
            if (fObjetivo !== 0) {
              camVista.pos.copy(camera.position);
              camVista.target.copy(controls.target);
              fObjetivo = 0;
            }
          } else {
            vistaActiva = vistaObjetivo;
            limpiarEtiquetas();
            recalcularPickables();
            if (vistaActiva.tipo !== "mapa") entrar();
            recolocar();
          }
        }
        if (f !== fObjetivo) {
          f = reducido || Math.abs(fObjetivo - f) < 0.001 ? fObjetivo : f + Math.sign(fObjetivo - f) * 0.05;
          f = acotar(f);
          recolocar();
        }
        const cambio = controls.update();
        if (cambio || sucio) {
          renderer.render(scene, camera);
          colocarEtiquetas();
          sucio = false;
        }
      };
      bucle();

      api.current = {
        pintar,
        pintarNacional,
        vista: pedirVista,
        marcar: (c) => {
          seleccionada = c;
          brillo();
        },
        encuadrar: () => {
          if (vistaActiva.tipo !== "mapa" && f === 1) {
            aplicarPlan(true);
            camera.position.copy(camVista.pos);
            controls.target.copy(camVista.target);
            controls.update();
            sucio = true;
          } else encuadrarMapa();
        },
      };
      pintar(actual.current.resultado);
      pintarNacional(actual.current.nacional);
      pedirVista(
        actual.current.nacional ? { tipo: "nacional" } : actual.current.foco ? { tipo: "comunidad", nombre: actual.current.foco } : { tipo: "mapa" },
      );

      limpiar = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("scroll", alScroll);
        window.removeEventListener("resize", alScroll);
        observador.disconnect();
        controls.dispose();
        canvas.removeEventListener("pointermove", alMover);
        canvas.removeEventListener("pointerdown", alBajar);
        canvas.removeEventListener("pointerup", alSubir);
        canvas.removeEventListener("pointerleave", alSalir);
        for (const g of [...capas.values(), grupoNacional])
          for (const m of g.children as Mesh[]) (m.material as MeshLambertMaterial).dispose();
        for (const geo of geometrias.values()) geo.dispose();
        geoEspana?.dispose();
        limpiarEtiquetas();
        capaEtiquetas.remove();
        renderer.dispose();
        canvas.remove();
        api.current = null;
      };
    })().catch(() => actual.current.onError());

    return () => {
      vivo = false;
      limpiar();
    };
  }, []);

  useEffect(() => {
    api.current?.pintar(props.resultado);
  }, [props.resultado]);

  useEffect(() => {
    api.current?.marcar(props.codigo);
  }, [props.codigo]);

  useEffect(() => {
    api.current?.pintarNacional(props.nacional);
    api.current?.vista(
      props.nacional ? { tipo: "nacional" } : props.foco ? { tipo: "comunidad", nombre: props.foco } : { tipo: "mapa" },
    );
  }, [props.nacional, props.foco]);

  return (
    <div className="relative">
      <div ref={host} className="relative h-[clamp(380px,72vw,720px)] w-full cursor-grab" />
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 bg-background"
        onClick={() => api.current?.encuadrar()}
      >
        Restablecer vista
      </Button>
    </div>
  );
}
