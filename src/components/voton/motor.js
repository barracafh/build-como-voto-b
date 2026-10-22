/**
 * Votón — mascota animada de «¿Cómo voto?» (botón de abrigo rubber hose).
 *
 *   import { createVoton } from './voton.js';
 *   const v = createVoton(el, { gsap, MorphSVGPlugin });   // por defecto toma window.gsap / window.MorphSVGPlugin
 *   v.set('piensa');                // transición animada
 *   v.set('ok', { instant: true }); // sin transición
 *   v.state;                        // estado actual
 *   v.destroy();                    // mata tweens/timelines de ESTA instancia y quita el SVG
 *
 * Estados: idle, hola, piensa, ok, no, fuera, aviso, camina.
 * Cada instancia tiene su propio estado, su propia línea de tiempo y sus propios ids.
 * Solo toca el DOM dentro de `el`. Respeta prefers-reduced-motion (sin bote; solo cambios de pose).
 * Opciones extra (banco de pruebas): `paused: true` + `v.seek(t)` para fotogramas deterministas;
 * `reducedMotion: true|false` fuerza el modo.
 */

/* ---------- paleta ---------- */
const INK = '#1c1b1a', NAC = '#fbf6ee', SH = '#e9dcc8', CAN = '#d6c6ae',
      RED = '#df1717', SHOE = '#2b1e18', WHITE = '#ffffff';

export const STATES = ['idle', 'hola', 'piensa', 'ok', 'no', 'fuera', 'aviso', 'camina'];

/* ---------- formas ---------- */
const R = 64, DX = 6.5, DY = 10.5;               // radio del botón y desplazamiento del canto (vista 3/4)
const MOUTH = {
  smile: 'M -16 22 C -9 33 9 33 16 22',
  big:   'M -16 22 C -12 42 12 42 16 22',
  flat:  'M -16 22 C -6 24.5 6 24.5 16 22',
  hmm:   'M -16 22 C -7 15 5 33 16 22',
  wavy:  'M -16 22 C -10 30 -5 29 0 24 C 5 19 10 18 16 22',
  zig:   'M -16 22 L -10.5 28.5 L -5.3 22 L 0 28.5 L 5.3 22 L 10.5 28.5 L 16 22'
};

// Guantes: primitivas en marco local (muñeca en 0,0; la mano avanza hacia +x; -y = lado del pulgar).
// e=elipse, c=círculo, l=dedo recto, q=dedo curvo (x1 y1 cx cy x2 y2 w), f=forma rellena, p=línea de detalle
const O = 2.5, GS = 1.45;   // grosor de contorno (local) y escala del guante
// Puño de manga enrollado en campana (pieza propia, delante de la mano) con 2 pliegues.
const cuff = [['f', 'M8.5,-7.6C5,-8.2,1.8,-9.4,-1.2,-10.4C-5.6,-11.2,-5.6,11.2,-1.2,10.4C1.8,9.4,5,8.2,8.5,7.6C10,3.8,10,-3.8,8.5,-7.6Z']];
const cuffLines = [['p', 'M 1.2 -9 Q -1.2 0 1.2 9']];
const stitches = [['p', 'M 13 -3.4 L 17.5 -3.8'], ['p', 'M 13 0 L 17.5 0'], ['p', 'M 13 3.4 L 17.5 3.8']];
// Cada guante: "base" se funde en UNA silueta (contorno de tinta común), "lines" son pliegues interiores,
// "front" son piezas por delante con contorno propio (pulgar cruzado, manga).
const GLOVES = {
  // Reposo: mano relajada vista por el dorso, dedos curvados hacia dentro; 3 pespuntes + asterisco.
  rest: { base: [['e', 14, 0, 11, 10.5], ['t', 20, -6.5, 29.5, -8.5, 30.5, -1.5, 9.6, 8.6], ['t', 21, 0, 30.5, 1.5, 28.5, 7.8, 9.6, 8.6],
                 ['t', 19.5, 6, 26, 10, 23.5, 13.2, 9, 8], ['t', 12, -7, 16, -14.5, 22.5, -12.5, 9.4, 8.4]],
          lines: [['p', 'M25.2,-2.8Q28.6,-2,30.8,0.8'], ['p', 'M24.4,3.8Q27,6.2,27.4,9.4']],
          front: [cuff], ast: [16.5, 0.2, 3.2, -8, 0.78] },
  open: null,
  // Hola: palma al frente, dedos juntos en abanico leve, ahusados.
  wave: { base: [['e', 14, 0, 11.5, 11], ['t', 19, -6, 25.58, -8.39, 32.16, -10.79, 9.8, 9], ['t', 20.5, 0, 28.25, 0.27, 35.99, 0.54, 10, 9.2], ['t', 19.5, 6, 25.45, 7.93, 31.39, 9.86, 9.6, 8.8], ['t', 11, -7, 12.43, -12.31, 13.85, -17.63, 10.8, 9.8]],
          lines: [],
          front: [cuff], ast: [17, 0.5, 3.4, -6, 0.92] },
  // Aviso: abiertas, dedos separados.
  spread: { base: [['e', 14, 0, 11.5, 11], ['t', 19, -7, 24.36, -11.5, 29.72, -16.0, 9.6, 8.8], ['t', 21, -1, 28.68, -2.08, 36.35, -3.16, 9.8, 9], ['t', 20, 6, 25.51, 9.45, 31.02, 12.89, 9.4, 8.6], ['t', 10, -7, 9.04, -12.41, 8.09, -17.83, 10.6, 9.6]],
          lines: [],
          front: [cuff], ast: [17, 0.5, 3.4, -6, 0.92] },
  // Fuera: palma arriba, dedos juntos.
  palm: { base: [['e', 14, 0, 11.5, 10], ['t', 20, -5, 26.84, -6.46, 33.69, -7.91, 9.8, 9], ['t', 20.5, 1, 28.25, 1.27, 35.99, 1.54, 9.8, 9], ['t', 19.5, 6.5, 25.56, 8.01, 31.63, 9.52, 9.4, 8.6], ['t', 12, -6, 14.22, -10.76, 16.44, -15.52, 10.6, 9.6]],
          lines: [],
          front: [cuff], ast: [17, 0.4, 3.3, 0, 0.86] },
  // Piensa: puño redondo, nudillos apilados, pulgar por delante; 3 pespuntes en el dorso.
  fist: { base: [['e', 15, 0, 12, 12.5], ['c', 26, -7.5, 5.6], ['c', 27.5, 0, 6], ['c', 26, 7.5, 5.6]],
          lines: [['p', 'M31,-3.6Q28.6,-3,26.4,-3.8'], ['p', 'M31,3.8Q28.6,4.4,26.4,3.6']],
          front: [[['t', 11.5, -8.5, 18, -11.5, 24, -8.6, 9, 8]], cuff], ast: [16.8, 2.6, 3.1, 8, 0.6] },
  // Pulgar arriba: puño compacto con 4 nudillos apilados y pulgar corto, gordo, curvado hacia atrás.
  thumb: { base: [['e', 15, 4, 12, 11.5], ['c', 24.5, -3, 5.4], ['c', 26, 2.6, 5.6], ['c', 25.8, 8.4, 5.4], ['c', 23.8, 13.4, 4.8],
                  ['t', 16.5, -3, 15.42, -10.68, 14.34, -18.35, 11.4, 10]],
          lines: [['p', 'M30.4,-0.6Q28,0.4,25.6,-0.4'], ['p', 'M31,5.4Q28.6,6,26.2,5.4'], ['p', 'M29.6,11Q27.4,11.4,25.2,10.8'],
                  ['p', 'M11,-4.6Q15,-2.8,20,-4.6']],
          front: [cuff], ast: [17.2, 5, 3.2, 6, 0.62] },
  // Índice: puño redondo y compacto (como el de thumb) con nudillos curvos; encima, el índice ahusado.
  // El pulgar va recogido dentro del contorno como una sola línea curva.
  point: { base: [['e', 15, 4.5, 12, 11.5], ['c', 25.4, 3.4, 5.4], ['c', 25.6, 9, 5.2], ['c', 23.6, 13, 4.4],
                  ['t', 20, -1, 19.8, -12.5, 19.6, -24.0, 10.6, 9.4]],
          lines: [['p', 'M30.6,6.2Q28.2,6.8,25.8,6.2'], ['p', 'M29.6,11.4Q27.4,11.9,25.2,11.2'], ['p', 'M12,9.6Q17,12.6,22.4,10.2']],
          front: [cuff], ast: [16.4, 3, 3, 6, 0.62] }
};
delete GLOVES.open;
const GLOVE_NAMES = Object.keys(GLOVES);

// Dedo ahusado y curvo: ['t', x1, y1, cx, cy, x2, y2, anchoBase, anchoPunta] -> silueta cerrada con punta redonda.
function taper(p) {
  const [, x1, y1, cx, cy, x2, y2, w0, w1] = p, N = 10, L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, mt = 1 - t;
    const x = mt * mt * x1 + 2 * mt * t * cx + t * t * x2, y = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
    const tx = 2 * mt * (cx - x1) + 2 * t * (x2 - cx), ty = 2 * mt * (cy - y1) + 2 * t * (y2 - cy), tl = Math.hypot(tx, ty) || 1;
    const hw = (w0 + (w1 - w0) * t) / 2, nx = -ty / tl * hw, ny = tx / tl * hw;
    L.push((x + nx).toFixed(2) + ',' + (y + ny).toFixed(2)); R.push((x - nx).toFixed(2) + ',' + (y - ny).toFixed(2));
  }
  const r0 = (w0 / 2).toFixed(2), r1 = (w1 / 2).toFixed(2);
  return 'M' + L.join('L') + 'A' + r1 + ',' + r1 + ',0,0,0,' + R[N] + 'L' + R.reverse().join('L') + 'A' + r0 + ',' + r0 + ',0,0,0,' + L[0] + 'Z';
}
function prim(p, outline) {
  const t = p[0];
  const fill = outline ? INK : WHITE, os = outline ? ` stroke="${INK}" stroke-width="${2 * O}"` : '';
  if (t === 'e') return `<ellipse cx="${p[1]}" cy="${p[2]}" rx="${p[3]}" ry="${p[4]}" fill="${fill}"${os}/>`;
  if (t === 'c') return `<circle cx="${p[1]}" cy="${p[2]}" r="${p[3]}" fill="${fill}"${os}/>`;
  if (t === 'f') return `<path d="${p[1]}" fill="${fill}"${os} stroke-linejoin="round"/>`;
  if (t === 'l') return `<line x1="${p[1]}" y1="${p[2]}" x2="${p[3]}" y2="${p[4]}" stroke="${fill}" stroke-width="${outline ? p[5] + 2 * O : p[5]}" stroke-linecap="round"/>`;
  if (t === 't') return `<path d="${taper(p)}" fill="${fill}"${os} stroke-linejoin="round"/>`;
  if (t === 'q') return `<path d="M ${p[1]} ${p[2]} Q ${p[3]} ${p[4]} ${p[5]} ${p[6]}" fill="none" stroke="${fill}" stroke-width="${outline ? p[7] + 2 * O : p[7]}" stroke-linecap="round"/>`;
  return '';
}
// Asterisco rojo en el dorso, el icono de la herramienta: seis brazos.
// Asterisco rojo bordado en el dorso: [x, y, r, rot, sx]. sx < 1 lo aplana en el eje que se aleja
// de la cámara (escorzo sobre la superficie curva del guante) y rot lo orienta con el dorso.
function asterisco([x, y, r = 3.4, rot = 0, sx = 1]) {
  const cr = Math.cos(rot * Math.PI / 180), sr = Math.sin(rot * Math.PI / 180);
  const pt = (u, v) => { const px = u * sx, py = v; return [(x + px * cr - py * sr).toFixed(2), (y + px * sr + py * cr).toFixed(2)].join(','); };
  const brazo = (a) => { const u = r * Math.sin(a), v = r * Math.cos(a); return 'M' + pt(-u, -v) + 'L' + pt(u, v); };
  const d = [0, Math.PI / 3, (2 * Math.PI) / 3].map(brazo).join('');
  return `<path d="${d}" fill="none" stroke="${RED}" stroke-width="2" stroke-linecap="round"/>`;
}
const detail = (p) => `<path d="${p[1]}" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>`;
function gloveSVG(name) {
  const g = GLOVES[name];
  let s = g.base.map(p => prim(p, true)).join('') + g.base.map(p => prim(p, false)).join('');
  s += g.lines.map(detail).join('');
  if (g.ast && !g.astEncima) s += asterisco(g.ast);
  g.front.forEach(f => { s += f.map(p => prim(p, true)).join('') + f.map(p => prim(p, false)).join(''); });
  s += cuffLines.map(detail).join('');
  // En el índice, el pulgar cruzado tapa el dorso: el asterisco va encima.
  if (g.ast && g.astEncima) s += asterisco(g.ast);
  return `<g data-g="${name}" style="display:none">${s}</g>`;
}

/* ---------- SVG (ids con prefijo único por instancia) ---------- */
let uid = 0;
function buildSVG() {
  const p = 'voton' + (++uid) + Math.random().toString(36).slice(2, 7) + '-';
  const len = Math.hypot(DX, DY), ux = DX / len, uy = DY / len, nx = -uy, ny = ux;
  const poly = [[nx * R, ny * R], [DX + nx * R, DY + ny * R], [DX - nx * R, DY - ny * R], [-nx * R, -ny * R]]
    .map(a => a.map(v => v.toFixed(2)).join(',')).join(' ');
  const edgeShapes = (fill, stroke, sw) =>
    `<circle cx="${DX}" cy="${DY}" r="${R}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>` +
    `<polygon points="${poly}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`;
  const arc = (cx, cy, r, a0, a1) => {
    const f = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)].map(v => v.toFixed(2)).join(' ');
    return `M ${f(a0)} A ${r} ${r} 0 0 1 ${f(a1)}`;
  };
  const eye = (side) => `
    <g data-v="eye${side}">
      <clipPath id="${p}eye${side}"><ellipse rx="11.8" ry="16.8"/></clipPath>
      <g data-v="open${side}">
        <ellipse rx="11.8" ry="16.8" fill="${INK}"/>
        <g clip-path="url(#${p}eye${side})">
          <g data-v="pup${side}">
            <path d="M 0.8 -3.6 L 11 -8.6 L 6.6 -17.4 Z" fill="${NAC}"/>
            <ellipse cx="-4.6" cy="8.6" rx="2.2" ry="3" fill="${NAC}" opacity=".55"/>
          </g>
          <rect data-v="lid${side}" x="-15" y="-60" width="30" height="40" fill="${NAC}" stroke="${INK}" stroke-width="3.2"/>
        </g>
      </g>
      <path data-v="happy${side}" d="M -10 5 Q 0 -13 10 5" fill="none" stroke="${INK}" stroke-width="6.4" stroke-linecap="round" style="display:none"/>
    </g>`;
  const brow = (side) => `<g data-v="brow${side}"><path d="M -8 2 Q 0 -4.5 8 1.5" fill="none" stroke="${INK}" stroke-width="7.6" stroke-linecap="round"/><path d="M -8 2 Q 0 -4.5 8 1.5" fill="none" stroke="${RED}" stroke-width="4" stroke-linecap="round"/></g>`;
  const shoe = (side) => `
    <g data-v="shoe${side}">
      <path d="M -10.5 8.5 C -13.5 1 -10 -6.5 -1 -7.5 C 7 -8.5 13 -6.5 19.5 -3.2 C 28.5 0.5 32.5 5.5 30.5 10 C 29 13.2 24.5 13.6 18 13.6 L -5 13.6 C -8.5 13.6 -10 11.8 -10.5 8.5 Z"
            fill="${SHOE}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>
      <path d="M -9 11 C -2 12.4 16 12.6 29.4 10.6" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M 2 -5.8 C 5.5 -2.5 10 -2.6 13.5 -4.2" fill="none" stroke="#5c4537" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M18.5,-0.8C23.5,0.6,26.5,3.4,27,6.4" fill="none" stroke="${WHITE}" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="14.6" cy="-2" r="1.5" fill="${WHITE}"/>
    </g>`;
  const glove = (side) => `<g data-v="glove${side}">${GLOVE_NAMES.map(gloveSVG).join('')}</g>`;
  const cloud = [[30, 24, 8], [40, 16.5, 9.5], [51, 21.5, 8.5], [43, 30, 8], [32, 31, 6.5]];
  const cloudSVG = cloud.map(c => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}" fill="${INK}" stroke="${INK}" stroke-width="5.4"/>`).join('') +
                   cloud.map(c => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}" fill="${WHITE}"/>`).join('') +
                   `<circle cx="34" cy="24" r="2" fill="${INK}"/><circle cx="41" cy="24" r="2" fill="${INK}"/><circle cx="48" cy="24" r="2" fill="${INK}"/>`;
  // Orden: la pierna/zapato izquierdos (lado lejano al pasear) van detrás de los derechos.
  return { prefix: p, svg: `
<svg class="voton-svg" viewBox="0 0 240 256" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;overflow:visible">
  <defs><path id="${p}mouth" d="${MOUTH.smile}"/></defs>
  <ellipse data-v="shadow" cx="120" cy="248.5" rx="60" ry="5.5" fill="${INK}" opacity=".13"/>
  <path data-v="legL" fill="${INK}"/>${shoe('L')}
  <path data-v="legR" fill="${INK}"/>${shoe('R')}
  <path data-v="armRb" fill="${INK}"/><path data-v="armLb" fill="${INK}"/>
  <g data-v="body">
    <g data-v="mechon">
      <path d="M 0 6 C -1 -5 7.5 -9 5.5 -17.5 C 4 -24 -3.5 -23.5 -3 -17.5" fill="none" stroke="${INK}" stroke-width="7.4" stroke-linecap="round"/>
      <path d="M 0 6 C -1 -5 7.5 -9 5.5 -17.5 C 4 -24 -3.5 -23.5 -3 -17.5" fill="none" stroke="${RED}" stroke-width="3.8" stroke-linecap="round"/>
    </g>
    <g transform="translate(1.4 2.6)">${edgeShapes(INK, INK, 9)}</g>
    ${edgeShapes(INK, INK, 9)}
    <circle r="${R}" fill="${INK}" stroke="${INK}" stroke-width="9"/>
    ${edgeShapes(CAN)}
    <path d="${arc(DX * 0.55, DY * 0.55, R + 0.5, 12, 100)}" fill="none" stroke="${SH}" stroke-width="2" stroke-linecap="round"/>
    <clipPath id="${p}face"><circle r="${R}"/></clipPath>
    <clipPath id="${p}dish"><circle r="45"/></clipPath>
    <circle r="${R}" fill="${SH}"/>
    <g clip-path="url(#${p}face)"><circle cx="-3.5" cy="-4.5" r="61" fill="${NAC}"/></g>
    <circle r="${R}" fill="none" stroke="${INK}" stroke-width="3.4"/>
    <circle r="45" fill="${SH}"/>
    <g clip-path="url(#${p}dish)"><circle cx="4" cy="5.5" r="44" fill="${NAC}"/></g>
    <circle r="45" fill="none" stroke="${INK}" stroke-width="2.6"/>
    <path d="${arc(0, 0, 55.5, 200, 247)}" fill="none" stroke="${WHITE}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="${(55 * Math.cos(258 * Math.PI / 180)).toFixed(2)}" cy="${(55 * Math.sin(258 * Math.PI / 180)).toFixed(2)}" r="2.6" fill="${WHITE}"/>
    <path d="${arc(0, 0, 41.5, 28, 62)}" fill="none" stroke="${WHITE}" stroke-width="2.4" stroke-linecap="round"/>
    <g data-v="face">
      ${eye('L')}${eye('R')}
      ${brow('L')}${brow('R')}
      <use href="#${p}mouth" fill="none" stroke="${INK}" stroke-width="8.2" stroke-linecap="round" stroke-linejoin="round"/>
      <use href="#${p}mouth" fill="none" stroke="${RED}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="-16" cy="22" r="5.6" fill="${INK}"/><circle cx="16" cy="22" r="5.6" fill="${INK}"/>
      <circle cx="-15.4" cy="22.4" r="2.3" fill="${RED}"/><circle cx="15.4" cy="22.4" r="2.3" fill="${RED}"/>
    </g>
  </g>
  <g data-v="bub1"><circle cx="70" cy="58" r="3.4" fill="${WHITE}" stroke="${INK}" stroke-width="2.6"/></g>
  <g data-v="bub2"><circle cx="59" cy="44" r="5.2" fill="${WHITE}" stroke="${INK}" stroke-width="2.6"/></g>
  <g data-v="bub3">${cloudSVG}</g>
  <path data-v="armRf" fill="${INK}"/><path data-v="armLf" fill="${INK}"/>
  ${glove('R')}${glove('L')}
</svg>` };
}

/* ---------- poses ---------- */
const DEF = {
  hRx: 72, hRy: 47, hLx: -72, hLy: 47, fR: 1, fL: 1, gRotR: -10, gRotL: -10, oRy: 0.2, oLy: 0.2, frontR: 0, frontL: 0,
  armR: 50, armL: 50, sR: 0, sL: 0, minSag: 0.1, tfR: 0.3,
  lookX: 0, lookY: 0, faceX: 0, faceY: 0, lid: 0, pupilS: 1, browLy: 0, browRy: 0, browLr: 0, browRr: 0,
  happy: 0, tilt: 0, bob: 1, walk: 0, footRdir: 1, footLdir: -1, gazeW: 1, gfR: -1, gfL: -1,
  gR: 'rest', gL: 'rest', mouth: 'smile'
};
const DISCRETE = ['gR', 'gL', 'gfR', 'gfL'];
const ADD = { aRx: 0, aRy: 0, aLx: 0, aLy: 0, aRrot: 0, aLrot: 0, tapR: 0, tapL: 0, antic: 0, jy: 0, st: 0, shrug: 0, tremble: 0, b1: 0, b2: 0, b3: 0 };
const POSES = {
  idle: {},
  hola: { hRx: 70, hRy: -32, armR: 70, sR: 0.75, minSag: 0.16, fR: 0, gRotR: -78, oRy: 1, gfR: 1, gR: 'wave', mouth: 'big', browLy: 4, browRy: 4, tilt: -5, lookX: 0.25, faceX: 1.5, gazeW: 0 },
  piensa: { hRx: 2, hRy: 84, armR: 96, tfR: 0.12, fR: 0, gRotR: -96, oRy: 1, frontR: 1, gfR: 1, gR: 'fist', hLx: -66, hLy: 50, mouth: 'hmm',
            lookX: -0.9, lookY: -1, faceX: -3, faceY: -4, browLy: 6, browRy: -1, browRr: -8, tilt: 5, bob: 0.4, gazeW: 0 },
  ok: { hRx: 66, hRy: -10, fR: 0, gRotR: -6, oRy: 0.9, gfR: 1, gR: 'thumb', mouth: 'big', browLy: 4, browRy: 4, happy: 1, tilt: -4, lookX: 0.35, faceX: 2, gazeW: 0 },
  no: { hRx: 64, hRy: -20, fR: 0, gRotR: -4, oRy: 0.9, gfR: 1, gR: 'point', mouth: 'flat', browRy: 5, browLy: -1, browLr: 6, lid: 0.32, tilt: 5, lookX: 0.4, faceX: 2, bob: 0.6, gazeW: 0 },
  fuera: { hRx: 56, hRy: -2, hLx: -56, hLy: -2, fR: 0, fL: 0, gRotR: -14, gRotL: -14, oRy: 1, oLy: 1, gfR: 1, gfL: 1, gR: 'palm', gL: 'palm', mouth: 'wavy',
           browLy: 4, browRy: 4, browLr: 10, browRr: 10, lid: 0.2, tilt: -6, lookX: -0.5, lookY: -0.4, faceX: -1.5, gazeW: 0 },
  aviso: { hRx: 70, hRy: -24, hLx: -70, hLy: -24, fR: 0, fL: 0, gRotR: -84, gRotL: -84, oRy: 1, oLy: 1, gfR: 1, gfL: 1, gR: 'spread', gL: 'spread', mouth: 'zig',
           browLy: 7, browRy: 7, browLr: 6, browRr: 6, pupilS: 1.14, faceY: -2, gazeW: 0, bob: 0.3 },
  camina: { walk: 1, bob: 0, footLdir: 1, faceX: 4, lookX: 0.8, tilt: 4, gazeW: 0, hRy: 46, hLy: 46 }
};
const NUMKEYS = Object.keys(DEF).filter(k => typeof DEF[k] === 'number' && !DISCRETE.includes(k));

/* ---------- geometría ---------- */
const f2 = v => (Math.round(v * 100) / 100);
const smooth = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (a, n) => ((a % n) + n) % n;

// Extremidad de manguera ahusada: cúbica. sCurve 0 = curva en C, 1 = curva en S. minSag evita que quede recta.
function hose(a, b, L, ox, oy, w0, w1, sCurve = 0, minSag = 0, t0 = 0) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
  const sag = Math.max(d < L ? Math.sqrt(3 * d * (L - d) / 8) : 0, minSag * d);
  let nx = -dy / d, ny = dx / d;
  if (nx * ox + ny * oy < 0) { nx = -nx; ny = -ny; }
  const k = sag * 4 / 3, k1 = k, k2 = k * (1 - 2 * sCurve);
  const c1 = { x: a.x + dx / 3 + nx * k1, y: a.y + dy / 3 + ny * k1 };
  const c2 = { x: a.x + 2 * dx / 3 + nx * k2, y: a.y + 2 * dy / 3 + ny * k2 };
  const N = 24, A = [], B = [];
  let tx = 1, ty = 0, i0 = Math.round(t0 * N);
  for (let i = 0; i <= N; i++) {
    const t = i / N, mt = 1 - t;
    const x = mt * mt * mt * a.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * b.x;
    const y = mt * mt * mt * a.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * b.y;
    tx = 3 * mt * mt * (c1.x - a.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (b.x - c2.x);
    ty = 3 * mt * mt * (c1.y - a.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (b.y - c2.y);
    const tl = Math.hypot(tx, ty) || 1, hw = (w0 + (w1 - w0) * t) / 2;
    A.push(f2(x - ty / tl * hw) + ' ' + f2(y + tx / tl * hw));
    B.push(f2(x + ty / tl * hw) + ' ' + f2(y - tx / tl * hw));
  }
  const dFront = 'M' + A.slice(i0).join('L') + 'L' + B.slice(i0).reverse().join('L') + 'Z';
  return { d: 'M' + A.join('L') + 'L' + B.reverse().join('L') + 'Z', dFront, tx, ty };
}

const GAZE = [[0, 0, 0], [1.4, -1, -0.25], [2.5, 0, 0], [3.7, 0.9, 0.3], [5.0, 0.2, -0.55], [5.8, 0, 0]], GP = 6.4;
function gaze(c) {
  const t = mod(c, GP);
  let i = 0; while (i + 1 < GAZE.length && GAZE[i + 1][0] <= t) i++;
  const prev = GAZE[(i - 1 + GAZE.length) % GAZE.length], k = smooth((t - GAZE[i][0]) / 0.14);
  return [lerp(prev[1], GAZE[i][1], k), lerp(prev[2], GAZE[i][2], k)];
}
const BLINKS = [1.35, 3.62, 3.9, 5.75];
function blink(c) {
  const t = mod(c, GP); let v = 0;
  for (const b of BLINKS) { const d = t - b; if (d >= 0 && d < 0.07) v = Math.max(v, d / 0.07); else if (d >= 0.07 && d < 0.2) v = Math.max(v, 1 - (d - 0.07) / 0.13); }
  return v;
}
// Ciclo de paso: apoyo (contacto con talón -> despegue de puntera) y vuelo.
function stepFoot(ph, S, lift) {
  if (ph < 0.5) {
    const k = ph / 0.5;
    const r = k < 0.12 ? -16 * (1 - k / 0.12) : (k > 0.72 ? 20 * (k - 0.72) / 0.28 : 0);
    return { x: S - 2 * S * k, y: 0, r };
  }
  const k = (ph - 0.5) / 0.5, e = smooth(k);
  return { x: -S + 2 * S * e, y: -lift * Math.sin(Math.PI * Math.pow(k, 0.85)), r: lerp(20, -16, smooth(k * 1.1)) };
}

const SH_R = { x: 55, y: 16 }, SH_L = { x: -55, y: 16 }, HIP = 21, GROUND = 232.5;
const mStr = m => `matrix(${f2(m.a * 1000) / 1000},${f2(m.b * 1000) / 1000},${f2(m.c * 1000) / 1000},${f2(m.d * 1000) / 1000},${f2(m.e)},${f2(m.f)})`;

/* ======================================================================= */
export function createVoton(el, {
  gsap = (typeof window !== 'undefined' ? window.gsap : undefined),
  MorphSVGPlugin = (typeof window !== 'undefined' ? window.MorphSVGPlugin : undefined),
  paused = false,
  reducedMotion
} = {}) {
  if (!el) throw new Error('createVoton: falta el elemento contenedor');
  if (!gsap) throw new Error('createVoton: falta gsap');
  if (MorphSVGPlugin) gsap.registerPlugin(MorphSVGPlugin);

  const reduced = reducedMotion !== undefined ? !!reducedMotion
    : !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const MOTION = reduced ? 0 : 1;

  const rig = Object.assign({ clock: 0 }, DEF, ADD);
  const { svg, prefix } = buildSVG();
  el.insertAdjacentHTML('beforeend', svg);
  const root = el.lastElementChild;
  const $ = n => root.querySelector(`[data-v="${n}"]`);
  const I = {};
  ['body', 'face', 'mechon', 'shadow', 'eyeL', 'eyeR', 'openL', 'openR', 'happyL', 'happyR', 'pupL', 'pupR', 'lidL', 'lidR',
   'browL', 'browR', 'legR', 'legL', 'shoeR', 'shoeL', 'armRb', 'armLb', 'armRf', 'armLf', 'gloveR', 'gloveL', 'bub1', 'bub2', 'bub3']
    .forEach(n => { I[n] = $(n); });
  const mouth = root.querySelector('#' + prefix + 'mouth');
  let shownR = null, shownL = null, alive = true;

  /* ---------- render ---------- */
  function render() {
    if (!alive) return;
    const r = rig, c = r.clock, M0 = MOTION;
    const per = 0.6, p = mod(c / per, 1), beatN = Math.floor(c / per);
    const walk = clamp(r.walk, 0, 1.2) * M0, w = clamp(walk, 0, 1);
    const bw = Math.max(0, r.bob) * M0 * clamp(1 - walk, 0, 1);
    const s = Math.sin(Math.PI * p), con = Math.pow(1 - s, 6);
    let by = -5 * s * bw, bx = 0;
    let sy = 1 - 0.07 * con * bw + 0.03 * s * bw, sx = 1 + 0.06 * con * bw - 0.015 * s * bw;
    const br = Math.sin(2 * Math.PI * c / 2.8) * M0;
    sy += 0.012 * br; sx -= 0.008 * br;
    const q = mod(c / 0.9, 1);
    let rot = r.tilt;
    if (walk > 0) {
      const wb = Math.cos(2 * Math.PI * 2 * (q - 0.08));   // + = bajada
      by += 4.2 * wb * walk;
      const dn = Math.max(0, wb);
      sy -= 0.035 * dn * walk; sx += 0.03 * dn * walk;
      rot += 2 * Math.sin(2 * Math.PI * q) * walk;
      bx += 1.5 * Math.sin(2 * Math.PI * q) * walk;
    }
    by += 7 * r.antic + r.jy + 3 * r.shrug;
    sy += -0.09 * r.antic + 0.08 * r.st - 0.05 * r.shrug;
    sx += 0.07 * r.antic - 0.05 * r.st + 0.03 * r.shrug;
    bx += r.tremble * M0 * Math.sin(c * 75) * 1.3;
    const M = new DOMMatrix().translateSelf(120 + bx, 121 + by).translateSelf(0, 70).rotateSelf(rot).scaleSelf(sx, sy).translateSelf(0, -70);
    const P = (x, y) => M.transformPoint(new DOMPoint(x, y));

    // manos: espacio del cuerpo + follow-through del bote + contrabalanceo al pasear
    const lagY = bw * (-5 * Math.sin(Math.PI * mod(p - 0.14, 1)) + 5 * s);
    const swing = walk * 11 * Math.cos(2 * Math.PI * q);
    const shake = r.tremble * M0 * Math.sin(c * 60) * 1.5;
    const hR = P(r.hRx + r.aRx - swing, r.hRy + r.aRy - Math.abs(swing) * 0.25 + shake);
    const hL = P(r.hLx + r.aLx + swing, r.hLy + r.aLy - Math.abs(swing) * 0.25 - shake);
    hR.y += lagY; hL.y += lagY;
    const sR = P(SH_R.x, SH_R.y), sL = P(SH_L.x, SH_L.y);
    const ms = Math.max(0, r.minSag);
    const armR = hose(sR, hR, r.armR, 1, r.oRy, 10, 7.2, clamp(r.sR, 0, 1), ms, clamp(r.tfR, 0, 0.9));
    const armL = hose(sL, hL, r.armL, -1, r.oLy, 10, 7.2, clamp(r.sL, 0, 1), ms, 0.44);

    // pies (al pasear: base más ancha y el izquierdo como pie lejano, más alto y pequeño)
    const tap = Math.pow(Math.sin(Math.PI * p), 2) * bw;
    const fR = { x: 120 + 24, y: GROUND, r: (beatN % 2 === 0 ? -9 * tap : 0) + r.tapR, k: 1 };
    const fL = { x: 120 - 24, y: GROUND, r: (beatN % 2 !== 0 ? -9 * tap : 0) + r.tapL, k: 1 };
    if (walk > 0) {
      const a = stepFoot(q, 12, 14), b = stepFoot(mod(q + 0.5, 1), 12, 14);
      fR.x = lerp(fR.x, 120 + 30 + a.x, w); fR.y = GROUND + a.y * w; fR.r = lerp(fR.r, a.r, w);
      fL.x = lerp(fL.x, 120 - 28 + b.x, w); fL.y = GROUND - 5 * w + b.y * w; fL.r = lerp(fL.r, b.r, w);
      fL.k = 1 - 0.09 * w;
    }
    const lift = Math.min(0, r.jy);
    fR.y += lift * 0.85; fL.y += lift * 0.85;
    const shoeM = (f, dir) => {
      const piv = f.r < 0 ? { x: -6, y: 13.6 } : { x: 25, y: 13.6 };
      const k = 1.16 * f.k;
      return new DOMMatrix().translateSelf(f.x, f.y + 15.8 * (1 - f.k)).scaleSelf(dir * k, k).translateSelf(piv.x, piv.y).rotateSelf(f.r).translateSelf(-piv.x, -piv.y);
    };
    const dR = r.footRdir, dL = r.footLdir;
    const mR = shoeM(fR, Math.abs(dR) < 0.15 ? 0.15 * Math.sign(dR || 1) : dR);
    const mL = shoeM(fL, Math.abs(dL) < 0.15 ? 0.15 * Math.sign(dL || 1) : dL);
    const aR = mR.transformPoint(new DOMPoint(1, -3)), aL = mL.transformPoint(new DOMPoint(1, -3));
    const hipX = HIP + 4 * w;
    const hipR = P(hipX, 48), hipL = P(-hipX + 1.5 * w, 48);
    const legR = hose(hipR, aR, 64, 1, 0, 12.5, 9), legL = hose(hipL, aL, 64, -1, 0, 12.5 - 1.2 * w, 9 - 0.8 * w);

    // cara
    const g = gaze(c), gw = r.gazeW * M0;
    const lx = r.lookX + g[0] * gw, ly = r.lookY + g[1] * gw;
    const bl = M0 ? blink(c) : 0;
    const lid = clamp(r.lid, 0, 1);
    const mech = bw * 9 * Math.cos(2 * Math.PI * mod(p - 0.2, 1)) + walk * 7 * Math.sin(2 * Math.PI * 2 * q) + r.tremble * M0 * 8 * Math.sin(c * 50) + rot * -0.8;
    const gloveT = (h, arm, f, rotv, mirror, fy) => {
      const ang = Math.atan2(arm.ty, mirror ? -arm.tx : arm.tx) * 180 / Math.PI;
      return `translate(${f2(h.x)} ${f2(h.y)})${mirror ? ' scale(-1 1)' : ''} rotate(${f2(ang * clamp(f, 0, 1) + rotv)}) scale(${GS} ${fy < 0 ? -GS : GS})`;
    };
    const jumpH = -Math.min(0, r.jy);

    I.body.setAttribute('transform', mStr(M));
    I.face.setAttribute('transform', `translate(${f2(r.faceX)} ${f2(r.faceY)})`);
    I.mechon.setAttribute('transform', `translate(6 -59) rotate(${f2(mech)})`);
    I.shadow.setAttribute('rx', f2(60 * (1 - jumpH / 70) + 3 * (1 - s) * bw));
    I.shadow.setAttribute('cx', f2(120 + bx * 0.5));
    const hp = r.happy >= 0.5;
    for (const [side, ex] of [['L', -17], ['R', 17]]) {
      I['eye' + side].setAttribute('transform', `translate(${ex} -8) scale(${f2(r.pupilS)} ${f2(r.pupilS * (1 - 0.9 * bl))})`);
      I['open' + side].style.display = hp ? 'none' : ''; I['happy' + side].style.display = hp ? '' : 'none';
      I['pup' + side].setAttribute('transform', `translate(${f2(lx * 3.4)} ${f2(ly * 4.2)})`);
      I['lid' + side].setAttribute('y', f2(-16.8 - 40 + lid * 33.6));
    }
    I.browL.setAttribute('transform', `translate(-17 ${f2(-34 - r.browLy)}) rotate(${f2(-r.browLr)})`);
    I.browR.setAttribute('transform', `translate(17 ${f2(-34 - r.browRy)}) rotate(${f2(r.browRr)})`);
    I.legR.setAttribute('d', legR.d); I.legL.setAttribute('d', legL.d);
    I.shoeR.setAttribute('transform', mStr(mR)); I.shoeL.setAttribute('transform', mStr(mL));
    const fr = r.frontR >= 0.5, fl = r.frontL >= 0.5;
    // brazo que rodea por delante: la parte que sale de detrás del cuerpo va detrás; el tramo final, delante
    I.armRb.setAttribute('d', armR.d); I.armRf.setAttribute('d', fr ? armR.dFront : '');
    I.armLb.setAttribute('d', armL.d); I.armLf.setAttribute('d', fl ? armL.dFront : '');
    I.gloveR.setAttribute('transform', gloveT(hR, armR, r.fR, r.gRotR + r.aRrot, false, r.gfR));
    I.gloveL.setAttribute('transform', gloveT(hL, armL, r.fL, r.gRotL + r.aLrot, true, r.gfL));
    if (shownR !== r.gR) { I.gloveR.querySelectorAll('[data-g]').forEach(n => { n.style.display = n.dataset.g === r.gR ? '' : 'none'; }); shownR = r.gR; }
    if (shownL !== r.gL) { I.gloveL.querySelectorAll('[data-g]').forEach(n => { n.style.display = n.dataset.g === r.gL ? '' : 'none'; }); shownL = r.gL; }
    [[r.b1, 70, 58, I.bub1], [r.b2, 59, 44, I.bub2], [r.b3, 40, 24, I.bub3]].forEach(([v, x, y, n]) => {
      const k = Math.max(0, v);
      n.setAttribute('transform', `translate(${x} ${y}) scale(${f2(k)}) translate(${-x} ${-y})`);
      n.style.display = k > 0.01 ? '' : 'none';
    });
  }

  /* ---------- línea de tiempo propia de la instancia ---------- */
  const master = gsap.timeline({ paused, autoRemoveChildren: false });
  const add = a => { if (a) master.add(a, master.time()); return a; };
  add(gsap.to(rig, { clock: 100000, duration: 100000, ease: 'none' }));

  function jump(tl, at, h) {
    tl.to(rig, { antic: 1, duration: 0.12, ease: 'power2.in' }, at)
      .to(rig, { antic: 0, st: 1, jy: -h, duration: 0.22, ease: 'power2.out' }, at + 0.12)
      .to(rig, { st: 0, duration: 0.16 }, at + 0.3)
      .to(rig, { jy: 0, duration: 0.18, ease: 'power2.in' }, at + 0.34)
      .to(rig, { antic: 0.8, duration: 0.06, ease: 'power1.out' }, at + 0.52)
      .to(rig, { antic: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' }, at + 0.58);
  }
  const LOOPS = {
    hola(d) {
      const tl = gsap.timeline({ delay: d });
      jump(tl, 0, 15);
      const wave = gsap.timeline({ repeat: -1, repeatDelay: 0.9 });
      wave.fromTo(rig, { aRrot: -14 }, { aRrot: 20, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 5 })
          .to(rig, { aRrot: 0, duration: 0.3, ease: 'back.out(2)' });
      tl.add(wave, 0.08);
      return tl;
    },
    piensa(d) {
      const tl = gsap.timeline({ delay: d });
      const tap = gsap.timeline({ repeat: -1, repeatDelay: 0.16 });
      tap.to(rig, { tapR: -17, duration: 0.15, ease: 'power2.out' }).to(rig, { tapR: 0, duration: 0.09, ease: 'power3.in' });
      const bub = gsap.timeline({ repeat: -1, repeatDelay: 0.35 });
      bub.to(rig, { b1: 1, duration: 0.3, ease: 'back.out(3)' }, 0)
         .to(rig, { b2: 1, duration: 0.3, ease: 'back.out(3)' }, 0.28)
         .to(rig, { b3: 1, duration: 0.45, ease: 'back.out(2.2)' }, 0.56)
         .to(rig, { b1: 0, b2: 0, b3: 0, duration: 0.22, ease: 'power2.in' }, 2.8);
      tl.add(tap, 0).add(bub, 0);
      return tl;
    },
    ok(d) {
      const tl = gsap.timeline({ delay: d });
      jump(tl, 0, 9);
      tl.fromTo(rig, { aRy: 10, aRrot: -25 }, { aRy: 0, aRrot: 0, duration: 0.55, ease: 'back.out(3)' }, 0.12);
      const pump = gsap.timeline({ repeat: -1, repeatDelay: 1.1 });
      pump.to(rig, { aRy: -5, aRrot: -6, duration: 0.14, ease: 'power2.out' }).to(rig, { aRy: 0, aRrot: 0, duration: 0.4, ease: 'back.out(3)' });
      tl.add(pump, 0.9);
      return tl;
    },
    no(d) {
      const tl = gsap.timeline({ delay: d, repeat: -1, repeatDelay: 1.2 });
      tl.to(rig, { aRrot: -12, aRx: -2, duration: 0.32, ease: 'sine.inOut' })
        .to(rig, { aRrot: 9, aRx: 1.5, duration: 0.36, ease: 'sine.inOut' })
        .to(rig, { aRrot: -5, aRx: -1, duration: 0.32, ease: 'sine.inOut' })
        .to(rig, { aRrot: 0, aRx: 0, duration: 0.4, ease: 'sine.inOut' });
      return tl;
    },
    fuera(d) {
      const tl = gsap.timeline({ delay: d, repeat: -1, repeatDelay: 1.1 });
      tl.to(rig, { shrug: 1, aRy: -8, aLy: -8, aRrot: -8, aLrot: -8, duration: 0.18, ease: 'power2.out' })
        .to(rig, { shrug: 0, aRy: 0, aLy: 0, aRrot: 0, aLrot: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }, 0.45);
      return tl;
    },
    aviso(d) {
      const tl = gsap.timeline({ delay: d });
      jump(tl, 0, 13);
      tl.to(rig, { tremble: 1, duration: 0.1 }, 0.3).to(rig, { tremble: 0.35, duration: 1.2 }, 1.2);
      return tl;
    }
  };

  let current = null, loopTL = null, transTL = null;
  function set(name, opts) {
    if (!alive || !POSES[name]) return;
    const instant = (opts && opts.instant) || !MOTION;
    if (loopTL) { loopTL.kill(); loopTL = null; }
    if (transTL) { transTL.kill(); transTL = null; }
    const P = Object.assign({}, DEF, POSES[name]);
    const nums = {}; NUMKEYS.forEach(k => { nums[k] = P[k]; });
    gsap.killTweensOf(mouth);
    if (instant) {
      Object.assign(rig, nums, ADD, { gR: P.gR, gL: P.gL, gfR: P.gfR, gfL: P.gfL });
      mouth.setAttribute('d', MOUTH[P.mouth]);
    } else {
      const tl = gsap.timeline();
      const zero = Object.assign({}, ADD); delete zero.antic;
      tl.to(rig, Object.assign(zero, { duration: 0.2, ease: 'power2.out' }), 0)
        .to(rig, { antic: 0.75, duration: 0.12, ease: 'power2.in' }, 0)
        .to(rig, { antic: 0, duration: 0.55, ease: 'elastic.out(1, 0.5)' }, 0.12)
        .to(rig, Object.assign(nums, { duration: 0.5, ease: 'back.out(1.5)' }), 0.1)
        .call(() => { rig.gR = P.gR; rig.gL = P.gL; rig.gfR = P.gfR; rig.gfL = P.gfL; }, null, 0.17);
      if (MorphSVGPlugin) tl.to(mouth, { morphSVG: MOUTH[P.mouth], duration: 0.35, ease: 'back.out(2)' }, 0.1);
      else tl.call(() => mouth.setAttribute('d', MOUTH[P.mouth]), null, 0.15);
      transTL = add(tl);
    }
    current = name;
    if (MOTION && LOOPS[name]) loopTL = add(LOOPS[name](instant ? 0 : 0.4));
    render();
  }

  gsap.ticker.add(render);
  set('idle', { instant: true });

  return {
    set,
    get state() { return current; },
    /** Solo pruebas: salta a t segundos de la línea de tiempo de la instancia (útil con paused:true). */
    seek(t) { master.time(t); render(); },
    destroy() {
      if (!alive) return;
      alive = false;
      gsap.ticker.remove(render);
      master.getChildren(true, true, true).forEach(c => c.kill());
      master.kill();
      gsap.killTweensOf(rig); gsap.killTweensOf(mouth);
      root.remove();
    },
    el: root
  };
}
