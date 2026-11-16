import * as THREE from "three";
import type { ActKind } from "./poses";
import { rubikApply, rubikFrame } from "./rubik";

/**
 * Activity props: the spells acted out by a goblin that stays a goblin (a quill and notepad,
 * equations orbiting its head, a hand bell…). Built in the same toon kit as the goblin.
 */

type V3 = [number, number, number];
type Mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, pos?: V3 | null, scl?: V3 | null, rot?: V3 | null, outline?: boolean) => THREE.Mesh;

export interface ActKit {
  mesh: Mesh;
  toon: (c: string) => THREE.Material;
  flat: (c: string) => THREE.Material;
  sphere: (r: number, w?: number, h?: number) => THREE.SphereGeometry;
  prop: (k: ActKind, parent: THREE.Object3D, pos?: V3) => THREE.Group;
  root: THREE.Group;
  head: THREE.Group;
  hands: THREE.Object3D[];
  hat: string;
  skin: string;
  hx: number;
  hy: number;
  top: number;
}

/** What a motion function may set; mirrors expressions.ts's frame output. */
export interface ActOut {
  pos: THREE.Vector3;
  rot: THREE.Vector3;
  look: THREE.Vector2 | null;
  hands: THREE.Vector3[];
  mouth: number;
  squash: number;
}
export interface ActRig { props: Record<string, THREE.Group>; hands: THREE.Object3D[]; top: number }

const INK = "#1D2318", PAPER = "#F7F4EC", GOLD = "#F2B630", TEAL = "#7CF2C8", RED = "#E2443A";
const TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, abs, floor, min, max } = Math;
const frac = (x: number) => x - floor(x);
const smooth = (x: number) => { x = min(1, max(0, x)); return x * x * (3 - 2 * x); };

/** A floating equation, drawn once to a canvas. Empty outside a browser. */
function equation(text: string, color = INK): THREE.Object3D {
  if (typeof document === "undefined") return new THREE.Group();
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const x = c.getContext("2d")!;
  x.font = "italic 600 76px Georgia, 'Times New Roman', serif";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.lineJoin = "round"; x.lineWidth = 14; x.strokeStyle = "#FFFFFF";
  x.strokeText(text, 256, 66);
  x.fillStyle = color;
  x.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(2.3, 0.575, 1);
  return s;
}

function arrow(k: ActKit, parent: THREE.Object3D, color: string, len: number, pos: V3, rot: V3) {
  const g = new THREE.Group();
  g.position.set(...pos); g.rotation.set(...rot);
  parent.add(g);
  k.mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), k.toon(color), g, [0, len / 2, 0]);
  k.mesh(new THREE.ConeGeometry(0.1, 0.22, 12), k.toon(color), g, [0, len + 0.08, 0]);
  return g;
}

function paperPlane(scale: number) {
  const N = [1, 0, 0], BC = [-0.8, 0, 0], L = [-0.8, 0.06, 0.85], R = [-0.8, 0.06, -0.85], K = [-0.8, -0.38, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...N, ...L, ...BC, ...N, ...BC, ...R, ...N, ...K, ...BC].map((v) => v * scale), 3));
  g.computeVertexNormals();
  return g;
}

export function buildActs(k: ActKit) {
  const { mesh, toon, flat, sphere, prop, hands, hx, hy } = k;
  const doubleToon = (c: string) => { const m = (toon(c) as THREE.MeshToonMaterial).clone(); m.side = THREE.DoubleSide; return m; };

  // calculating: a chunky calculator, tapped with one finger; digits and symbols pop out, a receipt prints
  {
    // held up to its face: the keys face the goblin, we see the back and the receipt curling out
    const calc = prop("calculating", hands[0], [0.3, 0.3, 0.2]);
    calc.rotation.set(0.45, Math.PI - 0.25, -0.1);
    mesh(new THREE.BoxGeometry(0.62, 0.86, 0.12), toon("#3A3A44"), calc);
    mesh(new THREE.BoxGeometry(0.4, 0.3, 0.012), flat("#2C2C34"), calc, [0, -0.2, -0.066], null, null, false);
    mesh(new THREE.BoxGeometry(0.36, 0.02, 0.014), flat("#55555F"), calc, [0, -0.08, -0.068], null, null, false);
    for (const [x, y] of [[-0.25, 0.36], [0.25, 0.36], [-0.25, -0.38], [0.25, -0.38]]) mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 10), flat("#8A929C"), calc, [x, y, -0.064], null, [Math.PI / 2, 0, 0], false);
    mesh(new THREE.BoxGeometry(0.5, 0.2, 0.02), flat("#9BBC0F"), calc, [0, 0.27, 0.065], null, null, false);
    const keys = ["#ECE6D6", "#ECE6D6", "#ECE6D6", "#F2B630"];
    for (let r2 = 0; r2 < 4; r2++) for (let c = 0; c < 4; c++) mesh(new THREE.BoxGeometry(0.09, 0.07, 0.03), toon(c === 3 ? keys[3] : r2 === 3 && c === 0 ? RED : keys[0]), calc, [-0.18 + c * 0.12, 0.08 - r2 * 0.11, 0.07], null, null, false);
    const tape = new THREE.Group();
    tape.name = "tape";
    tape.position.set(0, 0.43, 0.02);
    calc.add(tape);
    const strip = new THREE.BoxGeometry(0.34, 1, 0.01);
    strip.translate(0, 0.5, 0);
    mesh(strip, toon(PAPER), tape, null, null, null, false).name = "strip";
    const pop = new THREE.Group();
    pop.name = "pop";
    k.root.add(pop);
    calc.userData.pop = pop;
    pop.userData.owner = calc; // hidden with the calculator when the expression changes
    ["7", "+", "3", "×", "=", "42", "π", "√"].forEach((t, i) => { const e = equation(t, i % 3 === 1 ? "#2F4AA8" : INK); e.scale.set(1.1, 0.275, 1); e.userData.i = i; pop.add(e); });
    pop.visible = false;
  }

  // solving: a little Rubik's cube in both mitts, scrambled and solved for real, tossed between turns
  {
    const g = prop("puzzling", k.root, [0, -0.62, 1.15]);
    const cube = new THREE.Group();
    cube.name = "cube";
    g.add(cube);
    const COL = ["#D8402F", "#E8772E", "#F5F2EA", "#F2C230", "#3E9B4F", "#2F6FD6"];
    const D = 0.17;
    const cubies: { obj: THREE.Group; home: THREE.Vector3 }[] = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const c = new THREE.Group();
      c.position.set(x * D, y * D, z * D);
      cube.add(c);
      mesh(new THREE.BoxGeometry(0.165, 0.165, 0.165), toon("#151515"), c, null, null, null, false);
      const st = (n: V3, col: string) => mesh(new THREE.BoxGeometry(n[0] ? 0.01 : 0.135, n[1] ? 0.01 : 0.135, n[2] ? 0.01 : 0.135), toon(col), c, [n[0] * 0.085, n[1] * 0.085, n[2] * 0.085], null, null, false);
      if (x === 1) st([1, 0, 0], COL[0]); if (x === -1) st([-1, 0, 0], COL[1]);
      if (y === 1) st([0, 1, 0], COL[2]); if (y === -1) st([0, -1, 0], COL[3]);
      if (z === 1) st([0, 0, 1], COL[4]); if (z === -1) st([0, 0, -1], COL[5]);
      cubies.push({ obj: c, home: c.position.clone() });
    }
    const ol = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.53, 0.53), new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
    cube.add(ol);
    cube.userData.cubies = cubies;
    cube.userData.unit = D;
  }

  // jotting: a notepad in the left mitt, a quill in the right
  {
    // the pad faces the writer: we see its cardboard back, and the quill bobbing over the top
    const pad = prop("jotting", hands[0], [0.35, 0.3, 0.15]);
    pad.rotation.set(0.25, Math.PI + 0.25, -0.1);
    mesh(new THREE.BoxGeometry(0.8, 1.0, 0.05), toon(PAPER), pad);
    mesh(new THREE.BoxGeometry(0.8, 1.0, 0.02), toon("#B98B5E"), pad, [0, 0, -0.035], null, null, false);
    mesh(new THREE.BoxGeometry(0.8, 0.1, 0.07), toon(k.hat), pad, [0, 0.5, 0]);
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.BoxGeometry(0.55, 0.035, 0.02);
      geo.translate(0.275, 0, 0);
      const l = mesh(geo, flat(INK), pad, [-0.3, 0.3 - i * 0.15, 0.035], null, null, false);
      l.name = `line${i}`;
    }
    const quill = new THREE.Group();
    quill.name = "quill";
    pad.add(quill);
    mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 6), toon("#EDE6D0"), quill, [0, 0.45, 0]);
    mesh(sphere(0.3), toon(k.hat), quill, [0.02, 0.62, 0], [0.4, 1.3, 0.08]);
  }

  // drawing: a sketch pad held up toward its face, so we see the cardboard back; a pencil works behind it
  {
    const pad = prop("drawing", hands[0], [0.45, 0.4, 0.2]);
    pad.rotation.set(-0.2, 0.35, 0.05);
    mesh(new THREE.BoxGeometry(1.1, 1.1, 0.06), toon("#B98B5E"), pad);
    mesh(new THREE.BoxGeometry(1.08, 0.08, 0.08), toon("#3A3A44"), pad, [0, 0.55, 0], null, null, false);
    for (let i = 0; i < 7; i++) mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12), toon("#AEB6BF"), pad, [-0.45 + i * 0.15, 0.58, 0], null, [0, PI / 2, 0], false);
    mesh(new THREE.BoxGeometry(0.4, 0.14, 0.01), toon(PAPER), pad, [0.2, -0.38, 0.035], null, null, false);
    const pencil = new THREE.Group();
    pencil.name = "pencil";
    pad.add(pencil);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), toon(k.hat), pencil, [0, 0.4, 0]);
    mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.1, 6), toon("#E78FA8"), pencil, [0, 0.82, 0]);
  }

  // hearing: sound waves rolling into a cupped ear
  {
    const g = prop("hearing", k.root, [hx + 0.2, 0.15, 0.3]);
    for (let i = 0; i < 3; i++) mesh(new THREE.TorusGeometry(1, 0.04, 8, 30, 1.1), toon(TEAL), g, null, null, [0, 0, -0.55], false).name = `wave${i}`;
  }

  // announcing: a microphone in the right mitt, with rings rolling out
  {
    const g = prop("announcing", hands[1], [-0.05, 0.15, 0.1]);
    g.rotation.set(0.5, 0, 0.5);
    mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 12), toon("#2C2C34"), g, [0, -0.15, 0]);
    const head = mesh(sphere(0.18), toon("#D3D7DD"), g, [0, 0.22, 0]);
    for (let i = -1; i <= 1; i++) mesh(new THREE.TorusGeometry(0.18 * Math.sqrt(1 - (i * 0.45) ** 2), 0.008, 4, 24), flat("#8B9098"), head, [0, i * 0.08, 0], null, [PI / 2, 0, 0], false);
    const rings = new THREE.Group();
    rings.name = "rings";
    k.root.add(rings);
    rings.visible = false;
    g.userData.rings = rings;
    rings.userData.owner = g;
    for (let i = 0; i < 3; i++) mesh(new THREE.TorusGeometry(1, 0.035, 8, 30, 1.2), toon(RED), rings, null, null, null, false);
  }

  // posting: a paper plane thrown again and again
  {
    const g = prop("posting", k.root);
    const plane = mesh(paperPlane(0.45), doubleToon(PAPER), g);
    plane.name = "plane";
    for (let i = 0; i < 8; i++) mesh(sphere(0.035, 8, 6), flat(TEAL), g, null, null, null, false).name = `trail${i}`;
  }

  // catching: an envelope flies into its hands
  {
    const g = prop("catching", k.root);
    const env = new THREE.Group();
    env.name = "envelope";
    g.add(env);
    mesh(new THREE.BoxGeometry(0.75, 0.5, 0.05), toon(PAPER), env);
    const flap = new THREE.Shape();
    flap.moveTo(-0.375, 0.25); flap.lineTo(0, -0.05); flap.lineTo(0.375, 0.25);
    mesh(new THREE.ShapeGeometry(flap), flat(INK), env, [0, 0, 0.03], null, null, false);
    mesh(new THREE.CircleGeometry(0.06, 16), flat(RED), env, [0, -0.04, 0.035], null, null, false);
  }

  // syncing: a cloud overhead swapping arrows
  {
    const g = prop("syncing", k.root, [0, k.top + 0.55, 0]);
    for (const [x, y, r] of [[-0.35, 0, 0.32], [0.05, 0.15, 0.42], [0.42, 0, 0.3], [0, -0.05, 0.34]] as V3[]) mesh(sphere(r), toon("#FFFFFF"), g, [x, y, 0], [1, 1, 0.55]);
    arrow(k, g, TEAL, 0.35, [-0.22, -0.85, 0.25], [0, 0, 0]).name = "up";
    arrow(k, g, GOLD, 0.35, [0.22, -0.05, 0.25], [PI, 0, 0]).name = "down";
  }

  // waiting: an hourglass that keeps flipping
  {
    const g = prop("waiting", k.root, [hx + 0.75, -0.9, 0.4]);
    const glass = new THREE.Group();
    glass.name = "glass";
    g.add(glass);
    for (const s of [-1, 1]) {
      mesh(new THREE.ConeGeometry(0.32, 0.5, 20, 1, true), new THREE.MeshBasicMaterial({ color: "#CFE8F0", transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }), glass, [0, s * 0.25, 0], null, [s > 0 ? PI : 0, 0, 0], false);
      mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.07, 20), toon("#7A5236"), glass, [0, s * 0.53, 0]);
    }
    const top = mesh(new THREE.ConeGeometry(0.27, 0.4, 16), toon(GOLD), glass, [0, 0.27, 0], null, [PI, 0, 0], false);
    top.name = "top";
    const pile = mesh(new THREE.ConeGeometry(0.27, 0.4, 16), toon(GOLD), glass, [0, -0.3, 0], null, null, false);
    pile.name = "pile";
  }

  // ringing: a hand bell held up
  {
    const g = prop("ringing", hands[1], [0, 0.25, 0.05]);
    const bell = new THREE.Group();
    bell.name = "bell";
    g.add(bell);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8), toon("#7A5236"), bell, [0, -0.05, 0]);
    const prof = Array.from({ length: 12 }, (_, i) => { const s = i / 11; return new THREE.Vector2(0.06 + 0.2 * s ** 0.6 + 0.12 * s ** 4, 0.55 - s * 0.45); });
    const lathe = new THREE.LatheGeometry(prof, 24);
    // open bell: no back-face outline (it would show through the mouth); an ink lip instead
    mesh(lathe, (() => { const m = (toon(GOLD) as THREE.MeshToonMaterial).clone(); m.side = THREE.DoubleSide; return m; })(), bell, null, null, null, false);
    mesh(new THREE.TorusGeometry(0.375, 0.025, 6, 28), flat(INK), bell, [0, 0.1, 0], null, [PI / 2, 0, 0], false);
    mesh(sphere(0.06), toon(INK), bell, [0, 0.05, 0]);
    for (let i = 0; i < 2; i++) for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.5 + i * 0.18, 0.025, 6, 20, 0.9), toon(RED), g, [0, 0.35, 0], null, [0, s < 0 ? PI : 0, -0.45], false).name = `ring${i}${s}`;
  }

  // low battery: an empty battery blinking overhead
  {
    const g = prop("low-battery", k.root, [0, k.top + 0.5, 0.2]);
    mesh(new THREE.BoxGeometry(0.9, 0.42, 0.1), toon("#2C2C34"), g);
    mesh(new THREE.BoxGeometry(0.8, 0.32, 0.12), toon(PAPER), g, null, null, null, false);
    mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), toon("#2C2C34"), g, [0.5, 0, 0]);
    const cell = mesh(new THREE.BoxGeometry(0.16, 0.26, 0.14), toon(RED), g, [-0.3, 0, 0], null, null, false);
    cell.name = "cell";
  }

  // scanning: an antenna off the right ear sends out pulses
  {
    const g = prop("scanning", k.head, [hx * 0.98, 0.3, 0]);
    g.rotation.z = -0.35;
    mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 8), toon("#3A3A44"), g, [0, 0.4, 0]);
    mesh(sphere(0.09), flat(RED), g, [0, 0.85, 0]);
    for (let i = 0; i < 3; i++) mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 24), toon(TEAL), g, [0, 0.85, 0], null, null, false).name = `pulse${i}`;
  }

  // orbiting: a little planet and stars circle the head
  {
    const g = prop("orbiting", k.root, [0, hy * 0.75 + 0.3, 0]);
    const planet = new THREE.Group();
    planet.name = "planet";
    g.add(planet);
    mesh(sphere(0.2), toon(k.hat), planet);
    mesh(new THREE.RingGeometry(0.28, 0.4, 24), doubleToon(GOLD), planet, null, null, [-1.2, 0, 0], false);
    for (let i = 0; i < 3; i++) {
      const st = new THREE.OctahedronGeometry(0.1);
      st.scale(0.5, 1.4, 0.4);
      const s = mesh(st, flat(GOLD), g, null, null, null, false);
      s.name = `star${i}`;
    }
  }

  // juggling: three balls
  {
    const g = prop("juggling", k.root);
    [RED, GOLD, "#2F6FD6"].forEach((c, i) => (mesh(sphere(0.17), toon(c), g).name = `ball${i}`));
  }
}

/** Per-frame motion for each activity: moves the head and hands and animates the prop. */
export const ACT_MOTION: Record<ActKind, (t: number, o: ActOut, r: ActRig) => void> = {
  calculating: (t, o, r) => {
    // recall (hand on head, eyes up), bring out the calculator, then tap away as numbers pop out
    const calc = r.props.calculating;
    const pop = calc.userData.pop as THREE.Group;
    const q = frac(t / 9), sec = q * 9;
    const out = smooth((sec - 2.4) / 0.9);
    calc.scale.setScalar(max(0.001, out));
    if (sec < 2.4) {
      o.look = new THREE.Vector2(-0.5 + sin(t * 1.5) * 0.15, 0.8);
      o.rot.z = -0.1;
      o.rot.x = -0.12;
      o.hands[1].set(0.85, 0.75 + abs(sin(t * 7)) * 0.05, 0.35);
      o.mouth = 1;
    } else {
      o.look = new THREE.Vector2(-0.3, -0.35);
      o.rot.x = 0.08;
      o.hands[0].set(-0.5 - (1 - out) * 0.5, -1.0 - (1 - out) * 0.2, 1.0 - (1 - out) * 0.6);
      const tap = floor(t * 3.2), key = (tap * 7) % 16, dip = abs(sin(t * 3.2 * PI));
      const ready = out > 0.95;
      o.hands[1].set(ready ? -0.3 + (key % 4) * 0.06 : 0.6, ready ? -0.72 - floor(key / 4) * 0.04 + dip * 0.1 : -0.9, ready ? 0.85 : 0.7);
    }
    const tapping = sec > 3.3;
    calc.getObjectByName("strip")!.scale.y = 0.05 + (tapping ? ((sec - 3.3) / 5.7) * 0.9 : 0);
    pop.visible = calc.visible && tapping;
    pop.children.forEach((c) => {
      const p = frac(t * 0.45 + c.userData.i / 8);
      c.position.set(-0.6 + sin(c.userData.i * 2.3) * 0.9, -0.4 + p * 2.6, 1.2 - p * 0.4);
      const s2 = sin(p * PI);
      c.scale.set(1.1 * s2, 0.275 * s2, 1);
    });
  },
  puzzling: (t, o, r) => {
    const cube = r.props.puzzling.getObjectByName("cube")!;
    const f = rubikFrame(t);
    const unit = cube.userData.unit as number;
    for (const c of cube.userData.cubies as { obj: THREE.Group; home: THREE.Vector3 }[]) {
      c.obj.position.copy(c.home);
      c.obj.quaternion.identity();
      rubikApply(f, c.obj.position, c.home.clone(), unit, c.obj.quaternion);
    }
    // each turn is a little toss; solved, a big one
    const lift = f.toss * (f.solved ? 1.2 : 0.7);
    cube.position.y = lift;
    cube.rotation.set(0.5, 0.7 + f.spin, 0);
    o.look = new THREE.Vector2(0, -0.45 + lift * 0.6);
    o.hands[0].set(-0.32, -0.8 + lift * 0.35, 1.1);
    o.hands[1].set(0.32, -0.8 + lift * 0.35 + (f.solved ? 0 : sin(t * 8) * 0.03), 1.1);
    o.pos.y = f.solved ? abs(sin(t * 6)) * 0.08 : 0;
  },
  jotting: (t, o, r) => {
    o.look = new THREE.Vector2(-0.2, -0.7);
    o.rot.x = 0.12;
    o.hands[0].set(-0.45, -1.05, 1.0);
    const pad = r.props.jotting;
    const prog = frac(t / 5), line = floor(prog * 5), lu = frac(prog * 5);
    pad.children.forEach((c) => {
      const m = /^line(\d)$/.exec(c.name);
      if (m) { const i = +m[1]; c.scale.x = max(0.001, i < line ? 1 : i === line ? lu : 0); }
    });
    const quill = pad.getObjectByName("quill")!;
    quill.position.set(-0.3 + lu * 0.55 + sin(t * 30) * 0.015, 0.3 - line * 0.15, 0.06);
    quill.rotation.z = -0.4;
    // the pad is turned toward the writer, so the writing hand works behind it, mirrored
    o.hands[1].set(-0.1 - (-0.3 + lu * 0.55) * 0.85, -1.05 + 0.35 - line * 0.13, 0.85);
  },
  drawing: (t, o, r) => {
    o.look = new THREE.Vector2(-0.15, -0.35);
    o.rot.x = 0.06;
    o.hands[0].set(-0.55, -0.85, 1.0);
    // the pencil works the far side; only its top shows over the pad as it moves
    const pencil = r.props.drawing.getObjectByName("pencil")!;
    const a = t * 2.6, x = cos(a) * 0.28 + sin(a * 2.2) * 0.06, y = sin(a) * 0.12;
    pencil.position.set(x, 0.2 + y, -0.12);
    pencil.rotation.set(-0.3, 0, -0.35 + sin(t * 9) * 0.06);
    o.hands[1].set(-0.55 + 0.45 + x + 0.25, -0.85 + 0.4 + y + 0.15, 0.9);
  },
  hearing: (t, o, r) => {
    o.look = new THREE.Vector2(0.8, 0);
    o.rot.z = -0.14;
    o.rot.y = 0.15;
    o.hands[1].set(r.props.hearing.position.x + 0.1, 0.15, 0.45);
    r.props.hearing.children.forEach((w, i) => {
      const q = frac(i / 3 + t * 0.5), R = 1.6 - q * 1.2;
      w.scale.set(R, R, 1);
      w.position.x = 0.25;
      w.visible = sin(q * PI) > 0.2;
    });
  },
  announcing: (t, o, r) => {
    o.mouth = 0.5 + abs(sin(t * 8) * sin(t * 2.7)) * 1.0;
    o.rot.z = sin(t * 1.6) * 0.05;
    o.hands[1].set(0.38, -0.62 + sin(t * 2) * 0.03, 1.05);
    o.hands[0].set(-1.15, -0.8 + sin(t * 3) * 0.2, 0.7);
    const rings = r.props.announcing.userData.rings as THREE.Group;
    rings.visible = r.props.announcing.visible;
    rings.position.set(0.55, -0.5, 1.0);
    rings.children.forEach((c, i) => {
      const q = frac(i / 3 + t * 0.7), R = 0.35 + q * 1.1;
      c.scale.set(R, R, 1);
      c.rotation.set(0, -0.6, -0.6);
      c.visible = q < 0.85;
    });
  },
  posting: (t, o, r) => {
    const g = r.props.posting;
    const q = frac(t / 2.6);
    const wind = smooth(q / 0.3), fling = smooth((q - 0.3) / 0.12);
    o.hands[1].set(1.1 + wind * 0.25 - fling * 0.9, -0.6 + wind * 0.7 - fling * 0.3, 0.45 + fling * 0.6);
    o.rot.y = -0.15 * wind + 0.25 * fling;
    o.look = new THREE.Vector2(-0.6, 0.5);
    const plane = g.getObjectByName("plane")!;
    const hand = r.hands[1].position;
    const path = (s: number) => new THREE.Vector3(hand.x - s * 4.2, hand.y + 0.2 + sin(s * PI * 0.8) * 1.8, hand.z + 0.2 - s * 1.5);
    const flyS = clamp01((q - 0.36) / 0.6);
    if (q < 0.36) { plane.position.set(hand.x, hand.y + 0.18, hand.z + 0.1); plane.rotation.set(0, PI, 0.3); plane.scale.setScalar(1); }
    else {
      const p = path(flyS), ahead = path(min(1, flyS + 0.02)).sub(p);
      plane.position.copy(p);
      plane.rotation.set(0, Math.atan2(-ahead.z, ahead.x), Math.atan2(ahead.y, Math.hypot(ahead.x, ahead.z)), "YZX");
      plane.scale.setScalar(1 - flyS * 0.6);
    }
    g.children.forEach((c) => {
      const m = /^trail(\d)$/.exec(c.name);
      if (!m) return;
      const back = max(0, flyS - 0.04 - +m[1] * 0.035);
      c.position.copy(path(back));
      c.visible = q >= 0.38 && back > 0;
    });
  },
  catching: (t, o, r) => {
    const env = r.props.catching.getObjectByName("envelope")!;
    const q = frac(t / 3.2), fly = smooth(q / 0.45);
    const from = new THREE.Vector3(2.6, 2.2, 0.4), to = new THREE.Vector3(0, -0.78, 1.25);
    env.position.lerpVectors(from, to, fly);
    env.position.y += sin(fly * PI) * 0.5;
    env.rotation.set(0.2, 0, (1 - fly) * 2.5);
    env.scale.setScalar(q > 0.9 ? max(0.001, (1 - q) * 10) : 1);
    const caught = q > 0.45;
    o.hands[0].set(-0.38, -0.95 + (caught ? 0.06 : 0), 1.05);
    o.hands[1].set(0.38, -0.95 + (caught ? 0.06 : 0), 1.05);
    o.pos.y = caught ? abs(sin(t * 6)) * 0.05 : 0;
    o.look = new THREE.Vector2(THREE.MathUtils.clamp(env.position.x / 2, -1, 1), THREE.MathUtils.clamp((env.position.y + 0.3) / 2, -1, 1));
  },
  syncing: (t, o, r) => {
    o.look = new THREE.Vector2(0, 0.85);
    o.rot.x = -0.12;
    const g = r.props.syncing;
    g.position.y = r.top + 0.55 + sin(t * 1.5) * 0.06;
    const up = g.getObjectByName("up")!, down = g.getObjectByName("down")!;
    const q = frac(t / 1.4);
    up.position.y = -0.95 + q * 0.6; up.visible = q < 0.85;
    const q2 = frac(t / 1.4 + 0.5);
    down.position.y = -0.05 - q2 * 0.6; down.visible = q2 < 0.85;
  },
  waiting: (t, o, r) => {
    o.rot.z = sin(t * 0.6) * 0.1;
    o.squash = 1 - abs(sin(t * 0.35)) * 0.03;
    o.look = new THREE.Vector2(0.7, -0.2);
    const glass = r.props.waiting.getObjectByName("glass")!;
    const q = frac(t / 4), run = clamp01(q / 0.85), flip = smooth((q - 0.87) / 0.13);
    const top = glass.getObjectByName("top")!, pile = glass.getObjectByName("pile")!;
    top.scale.set(1 - run * 0.7, max(0.001, 1 - run), 1 - run * 0.7);
    top.position.y = 0.27 - run * 0.15;
    pile.scale.set(0.3 + run * 0.7, max(0.001, run), 0.3 + run * 0.7);
    pile.position.y = -0.48 + run * 0.18;
    glass.rotation.z = flip * PI;
    r.props.waiting.position.y = -0.9 + sin(t * 1.2) * 0.05;
  },
  ringing: (t, o, r) => {
    const swing = sin(t * 12);
    o.hands[1].set(1.3 + swing * 0.08, 0.25 + abs(swing) * 0.05, 0.8);
    o.look = new THREE.Vector2(0.6, 0.7);
    o.pos.y = abs(sin(t * 6)) * 0.05;
    const g = r.props.ringing;
    g.getObjectByName("bell")!.rotation.z = swing * 0.45;
    g.children.forEach((c) => { if (c.name.startsWith("ring")) c.visible = sin(t * 24 + (c.name.endsWith("-1") ? 1.5 : 0)) > 0; });
  },
  "low-battery": (t, o, r) => {
    o.rot.x = 0.18;
    o.rot.z = sin(t * 0.5) * 0.08;
    o.pos.y = -0.12 + sin(t * 0.8) * 0.03;
    o.squash = 0.96;
    o.look = new THREE.Vector2(0, -0.3);
    const cell = r.props["low-battery"].getObjectByName("cell")!;
    cell.visible = sin(t * 5) > -0.2;
    r.props["low-battery"].position.y = r.top + 0.5 + sin(t * 1.1) * 0.05;
  },
  scanning: (t, o, r) => {
    const step = Math.round(sin(t * 2.2) * 2) / 2;
    o.look = new THREE.Vector2(step, 0.1);
    o.rot.y = step * 0.2;
    r.props.scanning.children.forEach((c) => {
      const m = /^pulse(\d)$/.exec(c.name);
      if (!m) return;
      const q = frac(+m[1] / 3 + t * 0.8);
      c.scale.setScalar(0.3 + q * 3);
      c.visible = q < 0.9;
    });
  },
  orbiting: (t, o, r) => {
    o.rot.x = sin(t * 3) * 0.08;
    o.rot.z = cos(t * 3) * 0.1;
    o.look = new THREE.Vector2(cos(t * 3) * 0.6, sin(t * 3) * 0.6);
    const g = r.props.orbiting;
    const at = (a: number) => new THREE.Vector3(cos(a) * 1.35, sin(a * 2) * 0.12, sin(a) * 0.75);
    g.getObjectByName("planet")!.position.copy(at(t * 1.8));
    for (let i = 0; i < 3; i++) {
      const s = g.getObjectByName(`star${i}`)!;
      s.position.copy(at(t * 1.8 + (i + 1) * (TAU / 4)));
      s.rotation.z = t * 4 + i;
    }
  },
  juggling: (t, o, r) => {
    // a three-ball cascade: each ball crosses from one hand to the other
    const T = 1.8, hands0 = new THREE.Vector3(-0.65, -1.1, 0.8), hands1 = new THREE.Vector3(0.65, -1.1, 0.8);
    let highest = -9, hx = 0;
    for (let i = 0; i < 3; i++) {
      const b = r.props.juggling.getObjectByName(`ball${i}`)!;
      const ph = frac(t / T + i / 3) * 2, leg = floor(ph), q = ph - leg;
      const from = leg ? hands1 : hands0, to = leg ? hands0 : hands1;
      b.position.lerpVectors(from, to, q);
      b.position.y += sin(q * PI) * (r.top + 0.85) + 0.25;
      b.position.x *= 1 + sin(q * PI) * 1.3; // wide arcs, around the head rather than through it
      b.position.z += sin(q * PI) * 0.4;
      if (b.position.y > highest) { highest = b.position.y; hx = b.position.x; }
    }
    o.hands[0].set(-0.65, -1.15 + abs(sin(t * (TAU / T) * 1.5)) * 0.15, 0.8);
    o.hands[1].set(0.65, -1.15 + abs(cos(t * (TAU / T) * 1.5)) * 0.15, 0.8);
    o.look = new THREE.Vector2(THREE.MathUtils.clamp(hx / 1.2, -1, 1), THREE.MathUtils.clamp(highest / 2, -0.2, 1));
  },
};

function clamp01(x: number) { return min(1, max(0, x)); }
