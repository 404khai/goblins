import * as THREE from "three";
import { kit } from "./build";
import type { MorphId } from "./spells";
import { rubikApply, rubikFrame } from "./rubik";

/**
 * Solid versions of each spell: toon-shaded, ink-outlined meshes in the goblins' own style.
 * Each matches its dot shape in placement, so dots can settle into it.
 */

export interface Palette { skin: string; hat: string; beard: string; scarf: string }
export interface Solid { group: THREE.Group; update: (t: number) => void }

const { toon, flat, mesh, shade } = kit;
const INK = "#1D2318", PAPER = "#F4EEDC", GOLD = "#F2B630", TEAL = "#7CF2C8", RED = "#E2443A";
const TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, abs, floor, min, max, pow } = Math;
const frac = (x: number) => x - floor(x);
const clamp01 = (x: number) => min(1, max(0, x));
const smooth = (x: number) => { x = clamp01(x); return x * x * (3 - 2 * x); };
type V3 = [number, number, number];
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const S = (r: number) => new THREE.SphereGeometry(r, 24, 16);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (r: number, h: number, seg = 24) => new THREE.CylinderGeometry(r, r, h, seg);
const arcGeo = (r: number, tube: number, a = PI) => new THREE.TorusGeometry(r, tube, 10, 40, a);
const g0 = (parent: THREE.Object3D, pos?: V3, rot?: V3) => {
  const g = new THREE.Group();
  if (pos) g.position.set(...pos);
  if (rot) g.rotation.set(...rot);
  parent.add(g);
  return g;
};

function planeGeo(scale: number) {
  const N = [1, 0, 0], BC = [-0.8, 0, 0], L = [-0.8, 0.06, 0.85], R = [-0.8, 0.06, -0.85], K = [-0.8, -0.38, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...N, ...L, ...BC, ...N, ...BC, ...R, ...N, ...K, ...BC].map((v) => v * scale), 3));
  g.computeVertexNormals();
  return g;
}
const paperMat = () => new THREE.MeshToonMaterial({ color: PAPER, side: THREE.DoubleSide, gradientMap: (toon("#fff") as THREE.MeshToonMaterial).gradientMap });

export const SOLIDS: Record<MorphId, (g: Palette) => Solid> = {
  writing: (g) => {
    const group = new THREE.Group();
    mesh(box(2.9, 1.85, 0.05), toon(PAPER), group, [0, -1.03, 0.28]);
    for (const s of [-1, 1]) mesh(cyl(0.16, 2.1), toon("#D8C394"), group, [s * 1.55, -1.02, 0.3]);
    const lines = [0, 1, 2, 3].map((i) => {
      const geo = box(2.4, 0.05, 0.03);
      geo.translate(1.2, 0, 0);
      return mesh(geo, flat(INK), group, [-1.2, -0.5 - i * 0.36, 0.33], null, null, false);
    });
    const quill = g0(group);
    mesh(cyl(0.025, 2.3, 8), toon("#EDE6D0"), quill, [0, 1.15, 0]);
    mesh(new THREE.ConeGeometry(0.05, 0.18, 8), flat(INK), quill, [0, 0.05, 0], null, [PI, 0, 0], false);
    mesh(S(0.5), toon(g.hat), quill, [0.02, 1.45, 0], [0.42, 1.75, 0.08]);
    mesh(S(0.3), toon(shade(g.hat, 0.8)), quill, [0.06, 1.0, 0.02], [0.4, 1.0, 0.06], null, false);
    return {
      group,
      update: (t) => {
        const prog = frac(t / 7), line = min(3, floor(prog * 4)), lu = frac(prog * 4);
        lines.forEach((l, i) => (l.scale.x = Math.max(0.001, i < line ? 1 : i === line ? lu : 0)));
        quill.position.set(-1.2 + 2.4 * lu + sin(t * 18) * 0.03, -0.5 - line * 0.36, 0.42);
        quill.rotation.z = -0.35;
      },
    };
  },

  sketching: (g) => {
    const group = new THREE.Group();
    mesh(box(2.6, 2.7, 0.05), toon(PAPER), group, [0, 0.5, 0.26]);
    for (const s of [-1, 1]) mesh(box(0.1, 3.9, 0.1), toon("#7A5236"), group, [s * 0.95, -0.35, 0.15], null, [0, 0, s * 0.12]);
    mesh(box(2.9, 0.1, 0.25), toon("#7A5236"), group, [0, -0.95, 0.3]);
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 81 }, (_, i) => {
      const th = (i / 80) * TAU + PI / 2, r = 0.6 + 0.3 * cos(5 * (th - PI / 2));
      return new THREE.Vector3(cos(th) * r, 0.5 + sin(th) * r, 0.32);
    }));
    const tube = new THREE.TubeGeometry(curve, 240, 0.035, 6, false);
    const line = mesh(tube, flat(INK), group, null, null, null, false);
    const total = tube.index!.count;
    const pencil = g0(group);
    mesh(cyl(0.13, 1.5, 6), toon(g.hat), pencil, [0, 0.95, 0]);
    mesh(new THREE.ConeGeometry(0.13, 0.2, 6), toon("#E9C9A0"), pencil, [0, 0.1, 0], null, [PI, 0, 0]);
    mesh(cyl(0.135, 0.12), toon("#C9C2B0"), pencil, [0, 1.76, 0]);
    mesh(cyl(0.13, 0.18), toon("#E78FA8"), pencil, [0, 1.9, 0]);
    return {
      group,
      update: (t) => {
        const prog = min(1, frac(t / 6) * 1.2);
        (line.geometry as THREE.BufferGeometry).setDrawRange(0, floor((total * prog) / 6) * 6);
        const nib = curve.getPointAt(prog);
        pencil.position.set(nib.x, nib.y, nib.z + 0.1);
        pencil.rotation.set(0.25, 0, -0.75 + sin(t * 9) * 0.05);
      },
    };
  },

  solving: () => {
    const group = new THREE.Group();
    const cube = g0(group, [0, 0.15, 0]);
    const COL = ["#D8402F", "#E8772E", "#F5F2EA", "#F2C230", "#3E9B4F", "#2F6FD6"];
    const D = 0.6;
    const cubies: { obj: THREE.Group; home: THREE.Vector3 }[] = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const c = g0(cube, [x * D, y * D, z * D]);
      mesh(box(0.58, 0.58, 0.58), toon("#151515"), c, null, null, null, false);
      const st = (n: V3, col: string) => mesh(box(n[0] ? 0.03 : 0.48, n[1] ? 0.03 : 0.48, n[2] ? 0.03 : 0.48), toon(col), c, [n[0] * 0.3, n[1] * 0.3, n[2] * 0.3], null, null, false);
      if (x === 1) st([1, 0, 0], COL[0]); if (x === -1) st([-1, 0, 0], COL[1]);
      if (y === 1) st([0, 1, 0], COL[2]); if (y === -1) st([0, -1, 0], COL[3]);
      if (z === 1) st([0, 0, 1], COL[4]); if (z === -1) st([0, 0, -1], COL[5]);
      cubies.push({ obj: c, home: c.position.clone() });
    }
    const shell = mesh(box(1.8, 1.8, 1.8), flat("#151515"), cube, null, null, null, false);
    shell.visible = false;
    // an outline shell drawn behind for the ink edge
    const ol = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.86, 1.86), kit.OUTLINE);
    cube.add(ol);
    return {
      group,
      update: (t) => {
        const f = rubikFrame(t);
        for (const c of cubies) {
          c.obj.position.copy(c.home);
          c.obj.quaternion.identity();
          rubikApply(f, c.obj.position, c.home.clone(), D, c.obj.quaternion);
        }
        cube.position.y = 0.15 + f.toss;
        cube.rotation.set(0.55, 0.75 + sin(t * 0.4) * 0.25 + f.spin, 0);
      },
    };
  },

  listening: (g) => {
    const group = new THREE.Group();
    mesh(arcGeo(1.15, 0.1), toon(g.hat), group, [0, 0.05, 0], [1, 1.05, 1]);
    for (const s of [-1, 1]) {
      const cup = mesh(cyl(0.5, 0.38), toon(INK), group, [s * 1.12, -0.15, 0], null, [0, 0, PI / 2]);
      mesh(new THREE.TorusGeometry(0.42, 0.1, 10, 28), toon(g.beard), cup, [0, -s * 0.2, 0], null, [PI / 2, 0, 0]);
      mesh(cyl(0.3, 0.02), toon("#2C2C34"), cup, [0, s * 0.2, 0], null, null, false);
    }
    const waves = [-1, 1].flatMap((side) => [0, 1, 2].map((i) => {
      const w = mesh(arcGeo(1, 0.045, 0.9), toon(TEAL), group, [0, -0.15, 0.1], null, [0, side < 0 ? PI : 0, -0.45]);
      return { w, i };
    }));
    return {
      group,
      update: (t) => waves.forEach(({ w, i }) => {
        const q = frac(i / 3 + t * 0.45), R = 2.9 - q * 1.35;
        w.scale.set(R, R, 1);
        w.visible = sin(q * PI) > 0.15;
      }),
    };
  },

  thinking: () => {
    const group = new THREE.Group();
    const white = toon("#FFFFFF");
    const B = [[-0.85, 1.15, 0.62], [0, 1.55, 0.78], [0.9, 1.2, 0.66], [-0.4, 0.75, 0.58], [0.5, 0.75, 0.58], [1.4, 0.8, 0.45], [-1.4, 0.75, 0.42]];
    const blobs = B.map(([x, y, r]) => mesh(S(r), white, group, [x, y, 0.1], [1, 1, 0.55]));
    const bubbles = [[-0.95, -0.25, 0.28], [-1.3, -0.85, 0.19], [-1.5, -1.3, 0.12]].map(([x, y, r]) => mesh(S(r), white, group, [x, y, 0.2]));
    return {
      group,
      update: (t) => {
        blobs.forEach((b, i) => (b.position.y = B[i][1] + sin(t * 1.5 + B[i][0]) * 0.05));
        bubbles.forEach((b, j) => b.scale.setScalar(1 + 0.2 * sin(t * 4 - j * 1.2)));
      },
    };
  },

  orbit: (g) => {
    const group = new THREE.Group();
    const sys = g0(group, [0, 0.2, 0], [0.42, 0, 0.32]);
    const planet = mesh(S(0.82), toon(shade(g.skin, 1.05)), sys);
    for (const [a, b] of [[0.9, 0.22], [1.45, 0.18], [2.0, 0.2]]) mesh(new THREE.SphereGeometry(0.83, 28, 6, 0, TAU, a, b), toon(g.hat), planet, null, null, null, false);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.9, 64), new THREE.MeshToonMaterial({ color: g.beard, side: THREE.DoubleSide, gradientMap: (toon("#fff") as THREE.MeshToonMaterial).gradientMap }));
    ring.rotation.x = -PI / 2;
    sys.add(ring);
    mesh(new THREE.RingGeometry(1.45, 1.52, 64), flat(INK), ring, [0, 0, 0.005], null, null, false);
    const moons = [mesh(S(0.18), toon("#C9C2B0"), group), mesh(S(0.13), toon(GOLD), group)];
    return {
      group,
      update: (t) => {
        planet.rotation.y = t * 0.3;
        moons.forEach((m, i) => { const th = t * (i ? -0.9 : 0.6) + i * 2; m.position.set(cos(th) * (2.1 + i * 0.3), 0.2 + sin(th) * 0.5, sin(th) * 1.1); });
      },
    };
  },

  radar: () => {
    const group = new THREE.Group();
    const face = g0(group, [0, 0.2, 0]);
    mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.12, 64), toon("#12301F"), face, [0, 0, -0.06], null, [PI / 2, 0, 0]);
    mesh(new THREE.TorusGeometry(1.62, 0.09, 10, 64), toon("#3A3A44"), face);
    for (const r of [0.78, 1.55 * 0.999]) mesh(new THREE.TorusGeometry(r, 0.02, 6, 64), flat("#4FB073"), face, [0, 0, 0.01], null, null, false);
    mesh(box(3.1, 0.03, 0.02), flat("#4FB073"), face, [0, 0, 0.01], null, null, false);
    mesh(box(0.03, 3.1, 0.02), flat("#4FB073"), face, [0, 0, 0.01], null, null, false);
    const sweep = mesh(new THREE.CircleGeometry(1.53, 32, 0, 0.9), flat("#7CF2A0"), face, [0, 0, 0.02], null, null, false);
    const B: [number, number][] = [[0.55, 0.6], [-0.7, -0.4], [0.3, -0.9]];
    const blips = B.map(([x, y]) => mesh(S(0.09), flat("#E9FFF0"), face, [x, y, 0.06], null, null, false));
    return {
      group,
      update: (t) => {
        const ang = -t * 1.8;
        sweep.rotation.z = ang;
        blips.forEach((b, i) => {
          const since = frac((ang - Math.atan2(B[i][1], B[i][0])) / -TAU);
          b.scale.setScalar(Math.max(0.001, 1.3 * (1 - since)));
        });
      },
    };
  },

  progress: () => {
    const group = new THREE.Group();
    const glass = g0(group, [0, 0.15, 0], [0, 0.4, 0]);
    const H = 1.1;
    const prof = Array.from({ length: 25 }, (_, i) => { const y = i / 24 * 2 - 1; return new THREE.Vector2(0.09 + 0.78 * pow(abs(y), 1.25), y * H); });
    mesh(new THREE.LatheGeometry(prof, 32), new THREE.MeshBasicMaterial({ color: "#CFE8F0", transparent: true, opacity: 0.35, depthWrite: false }), glass, null, null, null, false);
    for (const s of [-1, 1]) mesh(cyl(1.05, 0.14), toon("#7A5236"), glass, [0, s * (H + 0.08), 0]);
    for (let i = 0; i < 3; i++) { const th = (i / 3) * TAU + 0.5; mesh(cyl(0.05, 2.2, 8), toon("#5C3D27"), glass, [cos(th) * 0.98, 0, sin(th) * 0.98]); }
    const sandMat = toon(GOLD);
    const topProf = Array.from({ length: 12 }, (_, i) => { const y = 0.06 + (i / 11) * 0.84; return new THREE.Vector2((0.09 + 0.78 * pow(y, 1.25)) * 0.9, y * H); });
    topProf.unshift(new THREE.Vector2(0, 0.06 * H));
    topProf.push(new THREE.Vector2(0, 0.9 * H));
    const top = mesh(new THREE.LatheGeometry(topProf, 28), sandMat, glass, null, null, null, false);
    const pile = mesh(new THREE.ConeGeometry(0.75, 1, 28), sandMat, glass, null, null, null, false);
    const stream = mesh(cyl(0.025, 1, 6), sandMat, glass, null, null, null, false);
    return {
      group,
      update: (t) => {
        const q = frac(t / 6), run = clamp01(q / 0.86), flip = smooth((q - 0.88) / 0.12);
        // top sand sinks from its surface: squash toward the neck
        top.scale.set(1, Math.max(0.001, 1 - run), 1);
        top.position.y = 0.06 * H * run;
        const hgt = Math.max(0.001, run * 0.75);
        pile.scale.set(0.5 + run * 0.6, hgt * H, 0.5 + run * 0.6);
        pile.position.y = (-1 + hgt / 2) * H;
        stream.visible = run < 1 && run > 0;
        const len = (1.06 - run * 0.75) * H;
        stream.scale.y = len;
        stream.position.y = 0.06 * H - len / 2;
        glass.rotation.z = flip * PI;
      },
    };
  },

  dictating: () => {
    const group = new THREE.Group();
    const head = mesh(S(0.56), toon("#D3D7DD"), group, [0, 0.95, 0]);
    for (let i = -2; i <= 2; i++) mesh(new THREE.TorusGeometry(0.56 * Math.sqrt(1 - (i * 0.18) ** 2), 0.015, 6, 40), flat("#8B9098"), head, [0, i * 0.18 * 0.56 * 1.8, 0], null, [PI / 2, 0, 0], false);
    mesh(cyl(0.24, 1.25), toon("#2C2C34"), group, [0, -0.17, 0]);
    mesh(arcGeo(0.78, 0.05, PI - 0.5), toon("#3A3A44"), group, [0, 0.95, 0], null, [0, 0, PI + 0.25]);
    mesh(cyl(0.05, 1.2, 8), toon("#3A3A44"), group, [0, -1.4, 0]);
    mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.1, 32), toon("#3A3A44"), group, [0, -2.05, 0], [1, 1, 0.6]);
    const waves = [-1, 1].flatMap((side) => [0, 1, 2].map((i) => ({ w: mesh(arcGeo(0.95 + i * 0.38, 0.045, 1.1), toon(RED), group, [0, 0.95, 0.1], null, [0, side < 0 ? PI : 0, -0.55]), i })));
    return { group, update: (t) => waves.forEach(({ w, i }) => { const on = sin(t * 6 - i * 1.1); w.visible = on > 0; w.scale.setScalar(0.9 + Math.max(0, on) * 0.1); }) };
  },

  sending: () => {
    const group = new THREE.Group();
    const plane = mesh(planeGeo(1.15), paperMat(), group);
    const trail = Array.from({ length: 14 }, () => mesh(S(0.05), flat(TEAL), group, null, null, null, false));
    const path = (tt: number) => new THREE.Vector3(sin(tt * 1.1) * 1.6, 0.4 + sin(tt * 2.2) * 0.6, cos(tt * 1.1) * 0.7);
    return {
      group,
      update: (t) => {
        const pos = path(t), ahead = path(t + 0.05).sub(pos);
        plane.position.copy(pos);
        plane.rotation.set(0, Math.atan2(-ahead.z, ahead.x), Math.atan2(ahead.y, Math.hypot(ahead.x, ahead.z)) * 0.6, "YZX");
        trail.forEach((d, i) => { d.position.copy(path(t - 0.15 - i * 0.1)); d.scale.setScalar(1 - i / 14); });
      },
    };
  },

  receiving: () => {
    const group = new THREE.Group();
    const W = 0.48, L = 0.95, Y0 = -0.3, Y1 = 0.25;
    const mb = g0(group, [0.55, -0.05, 0], [0, -0.75, 0]);
    const blue = toon("#2F5FC4");
    mesh(box(W * 2, Y1 - Y0, L * 2), blue, mb, [0, (Y0 + Y1) / 2, 0]);
    mesh(new THREE.CylinderGeometry(W, W, L * 2, 32, 1, false, -PI / 2, PI), blue, mb, [0, Y1, 0], null, [-PI / 2, 0, 0]); // rounded roof, facing up
    const dShape = (s: number) => {
      const sh = new THREE.Shape();
      sh.moveTo(-W * s, Y0 + (1 - s) * 0.1);
      sh.lineTo(W * s, Y0 + (1 - s) * 0.1);
      sh.lineTo(W * s, Y1);
      sh.absarc(0, Y1, W * s, 0, PI, false);
      sh.lineTo(-W * s, Y0 + (1 - s) * 0.1);
      return new THREE.ShapeGeometry(sh, 24);
    };
    mesh(dShape(1), toon("#4C7BDA"), mb, [0, 0, L + 0.005], null, null, false);
    const slotHole = mesh(dShape(0.72), flat("#141414"), mb, [0, 0, L + 0.01], null, null, false);
    mesh(box(0.2, 1.9, 0.2), toon("#7A5236"), mb, [0, Y0 - 0.95, 0]);
    const flag = g0(mb, [W + 0.05, 0.05, -0.2]);
    mesh(box(0.04, 0.06, 0.75), toon(RED), flag, [0, 0, -0.375]);
    mesh(box(0.04, 0.28, 0.27), toon(RED), flag, [0, 0.08, -0.62]);
    const plane = mesh(planeGeo(0.62), paperMat(), group);
    const trail = Array.from({ length: 10 }, () => mesh(S(0.04), flat(GOLD), group, null, null, null, false));
    const boxM = new THREE.Matrix4().makeRotationY(-0.75).setPosition(0.55, -0.05, 0);
    const mouth = new THREE.Vector3(0, -0.02, L + 0.05).applyMatrix4(boxM);
    const start = new THREE.Vector3(-2.6, 2.3, 1.2), ctrl = new THREE.Vector3(-2.2, -0.4, 1.8);
    const bez = (s: number) => start.clone().multiplyScalar((1 - s) ** 2).add(ctrl.clone().multiplyScalar(2 * s * (1 - s))).add(mouth.clone().multiplyScalar(s * s));
    return {
      group,
      update: (t) => {
        const q = frac(t / 4.6), arrive = 0.55, fly = clamp01(q / arrive);
        const pos = bez(fly), ahead = bez(min(1, fly + 0.02)).sub(bez(max(0, fly - 0.02)));
        plane.position.copy(pos);
        plane.rotation.set(0, Math.atan2(-ahead.z, ahead.x), Math.atan2(ahead.y, Math.hypot(ahead.x, ahead.z)), "YZX");
        plane.visible = q < arrive + 0.03;
        trail.forEach((d, i) => { d.position.copy(bez(max(0, fly - 0.05 - i * 0.03))); d.visible = q < arrive; d.scale.setScalar(1 - i / 10); });
        slotHole.visible = q < arrive + 0.1;
        flag.rotation.x = smooth((q - arrive - 0.04) / 0.12) * (1 - smooth((q - 0.93) / 0.06)) * (PI / 2);
      },
    };
  },

  uploading: (g) => {
    const group = new THREE.Group();
    const white = toon("#FFFFFF");
    for (const [x, y, r] of [[-0.75, 0.55, 0.62], [0.05, 0.95, 0.82], [0.85, 0.6, 0.6], [0, 0.45, 0.7]]) mesh(S(r), white, group, [x, y, 0], [1, 1, 0.5]);
    mesh(box(2.6, 0.3, 0.6), white, group, [0.05, 0.12, 0], null, null, false);
    const arrow = g0(group, [0, 0, 0.55]);
    mesh(box(0.36, 0.95, 0.2), toon(g.hat), arrow, [0, 0.475, 0]);
    mesh(new THREE.ConeGeometry(0.55, 0.62, 4), toon(g.hat), arrow, [0, 1.26, 0], [1, 1, 0.35], [0, PI / 4, 0]);
    const bits = Array.from({ length: 14 }, (_, i) => ({ m: mesh(box(0.08, 0.08, 0.08), flat(TEAL), group, null, null, null, false), x: ((i * 37) % 14) / 14 - 0.5, o: i / 14 }));
    return {
      group,
      update: (t) => {
        arrow.position.y = -1.7 + smooth(frac(t / 2.2)) * 0.5;
        bits.forEach((b) => { const q = frac(b.o + t * 0.45); b.m.position.set(b.x * 1.6, -2 + q * 2.4, 0.45); b.m.scale.setScalar(Math.max(0.001, sin(q * PI))); });
      },
    };
  },

  bouncing: () => {
    const group = new THREE.Group();
    const ball = g0(group);
    const COL = ["#D8402F", "#F5F2EA", "#2F6FD6", "#F2C230", "#F5F2EA", "#3E9B4F"];
    COL.forEach((c, i) => mesh(new THREE.SphereGeometry(0.85, 12, 20, (i / 6) * TAU, TAU / 6), toon(c), ball, null, null, null, false));
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.86, 24, 6, 0, TAU, s < 0 ? 0 : PI - 0.45, 0.45), toon("#F5F2EA"), ball, null, null, null, false);
    const ol = new THREE.Mesh(S(0.85), kit.OUTLINE);
    ol.scale.setScalar(1.05);
    ball.add(ol);
    const shadow = mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }), group, [0, -2.17, 0], null, [-PI / 2, 0, 0], false);
    return {
      group,
      update: (t) => {
        const h = abs(sin(t * 3)), squash = 1 - 0.3 * (1 - h) ** 6;
        ball.position.y = -1.35 + 2.6 * h;
        ball.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
        ball.rotation.set(0.3, 0, -t * 2);
        const sr = 0.45 + 0.6 * (1 - h);
        shadow.scale.set(sr, sr * 0.5, 1);
      },
    };
  },

  alerting: () => {
    const group = new THREE.Group();
    const bell = g0(group, [0, 1.45, 0]);
    const prof = Array.from({ length: 30 }, (_, i) => { const s = i / 29; return new THREE.Vector2(0.22 + 0.42 * pow(s, 0.6) + 0.55 * pow(s, 4), 1.15 - s * 2.15 - 1.45); });
    prof.unshift(new THREE.Vector2(0, 1.15 - 1.45));
    mesh(new THREE.LatheGeometry(prof, 40), new THREE.MeshToonMaterial({ color: GOLD, side: THREE.DoubleSide, gradientMap: (toon("#fff") as THREE.MeshToonMaterial).gradientMap }), bell);
    mesh(new THREE.TorusGeometry(1.17, 0.06, 10, 48), toon(shade(GOLD, 0.8)), bell, [0, -1.0 - 1.45, 0], null, [PI / 2, 0, 0]);
    mesh(new THREE.TorusGeometry(0.16, 0.05, 10, 24), toon(shade(GOLD, 0.8)), bell, [0, -0.13, 0]);
    const clapper = g0(bell);
    mesh(cyl(0.03, 2.4, 6), toon(INK), clapper, [0, -1.4, 0], null, null, false);
    mesh(S(0.2), toon(INK), clapper, [0, -2.65, 0]);
    const lines = [-1, 1].flatMap((side) => [0, 1].map((i) => ({ m: mesh(arcGeo(1.45 + i * 0.35, 0.045, 1.0), toon(RED), group, [0, 0.1, 0.2], null, [0, side < 0 ? PI : 0, -0.5]), side, i })));
    return {
      group,
      update: (t) => {
        const swing = sin(t * 7) * 0.3;
        bell.rotation.z = swing;
        clapper.rotation.z = swing * 0.5;
        lines.forEach(({ m, side, i }) => (m.visible = sin(t * 14 + i) > 0 && side * swing > 0));
      },
    };
  },

  "powering-down": () => {
    const group = new THREE.Group();
    const on = toon(TEAL), off = toon("#5E6552");
    const sym = g0(group, [0, 0.2, 0]);
    const ring = mesh(new THREE.TorusGeometry(1.15, 0.13, 12, 64, TAU - 1.2), on, sym, null, null, [0, 0, PI / 2 + 0.6]);
    const bar = mesh(box(0.24, 1.15, 0.24), on, sym, [0, 0.72, 0]);
    return {
      group,
      update: (t) => {
        const q = frac(t / 5), dim = smooth((q - 0.25) / 0.45);
        const blink = q > 0.75 && q < 0.9 ? sin(t * 40) > 0 : true;
        const mat = dim > 0.5 ? off : on;
        ring.material = bar.material = mat;
        sym.scale.setScalar((1 - dim * 0.12) * (q > 0.9 ? 0.4 : 1));
        sym.visible = blink;
      },
    };
  },
};
