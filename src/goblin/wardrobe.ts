import * as THREE from "three";
import type { Goblin } from "./types";

/**
 * The wardrobe: hair, the top hat, goggles, lashes, blush, a bow, and the tools a goblin carries.
 * Same toon kit as the rest of the goblin; called from buildGoblin.
 */

type V3 = [number, number, number];
type Mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, pos?: V3 | null, scl?: V3 | null, rot?: V3 | null, outline?: boolean) => THREE.Mesh;

export interface WardrobeKit {
  d: Goblin;
  mesh: Mesh;
  toon: (c: string) => THREE.Material;
  flat: (c: string) => THREE.Material;
  sphere: (r: number, w?: number, h?: number) => THREE.SphereGeometry;
  shade: (hex: string, f: number) => string;
  head: THREE.Group;
  root: THREE.Group;
  hands: THREE.Object3D[];
  eyes: { side: number; open: THREE.Group; white: THREE.Object3D }[];
  hx: number; hy: number; hz: number;
  surf: (x: number, y: number) => number;
  capY: number;
  EX: number; EY: number;
}

export interface Wardrobe {
  /** New top of the goblin, if a hat here raised it. */
  top?: number;
  /** What the goblin carries, and where its mitts go while carrying it. */
  tool: THREE.Group | null;
  toolHands: THREE.Vector3[] | null;
  /** The right mitt is a pirate hook: always shown, and tools go in the left hand. */
  hook: boolean;
}

const INK = "#1D2318", BRASS = "#C9952B", STEEL = "#AEB6BF", WOOD = "#7A5236";
const PI = Math.PI;

export function buildWardrobe(k: WardrobeKit): Wardrobe {
  const { d, mesh, toon, flat, sphere: S, head, hx, hy, hz, capY } = k;
  const out: Wardrobe = { tool: null, toolHands: null, hook: d.extras.includes("hook") };
  const hairC = toon(d.hairColor ?? "#5B3B28");

  // ---------- hair (under any hat) ----------
  const hair = d.hair ?? "none";
  if (hair === "bob" || hair === "long") {
    // a helmet of hair open at the face, with bangs across the forehead
    const shell = new THREE.SphereGeometry(1.07, 36, 18, PI / 2 + 0.85, 2 * PI - 1.7, 0, PI * (hair === "long" ? 0.64 : 0.6));
    mesh(shell, hairC, head, [0, 0.02, -0.02], [hx, hy, hz]);
    mesh(S(0.5), hairC, head, [0, hy * 0.66, hz * 0.62], [hx * 1.25, 0.32, 0.45]);
    for (const s of [-1, 1]) mesh(S(0.3), hairC, head, [s * hx * 0.88, -0.05, hz * 0.2], [0.45, 1.05, 0.7]);
    if (hair === "long") {
      mesh(S(0.8), hairC, head, [0, -0.65, -hz * 0.55], [hx * 1.05, 1.15, 0.45]);
      for (const s of [-1, 1]) mesh(S(0.3), hairC, head, [s * hx * 0.92, -0.75, -0.05], [0.5, 1.6, 0.7]);
    }
  } else if (hair === "ponytail") {
    mesh(S(0.16), toon(d.hatColor), head, [0, hy * 0.62, -hz * 0.92]);
    [[0.32, 0.55, -1.15], [0.28, 0.25, -1.32], [0.22, -0.05, -1.38], [0.16, -0.32, -1.36]].forEach(([r, y, z]) => mesh(S(r), hairC, head, [0, y * hy, z * hz]));
    mesh(new THREE.SphereGeometry(1.04, 32, 12, 0, 2 * PI, 0, PI * 0.36), hairC, head, [0, 0.03, 0], [hx, hy, hz]);
  } else if (hair === "pigtails") {
    mesh(new THREE.SphereGeometry(1.04, 32, 12, 0, 2 * PI, 0, PI * 0.36), hairC, head, [0, 0.03, 0], [hx, hy, hz]);
    for (const s of [-1, 1]) {
      mesh(S(0.12), toon("#E35D9C"), head, [s * hx * 0.82, hy * 0.45, -0.25]);
      mesh(S(0.3), hairC, head, [s * (hx + 0.25), hy * 0.2, -0.3], [0.85, 1.3, 0.85], [0, 0, s * 0.5]);
      mesh(S(0.2), hairC, head, [s * (hx + 0.42), -hy * 0.2, -0.3], [0.85, 1.2, 0.85], [0, 0, s * 0.3]);
    }
  } else if (hair === "bun") {
    mesh(new THREE.SphereGeometry(1.04, 32, 12, 0, 2 * PI, 0, PI * 0.36), hairC, head, [0, 0.03, 0], [hx, hy, hz]);
    mesh(S(0.34), hairC, head, [0, hy + 0.12, -0.25]);
    mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 20), toon("#E35D9C"), head, [0, hy - 0.08, -0.2], null, [PI / 2 - 0.3, 0, 0]);
  }

  // ---------- top hat (steampunk) ----------
  if (d.hat === "tophat") {
    const hc = toon(d.hatColor), band = toon(k.shade(d.hatColor, 1.6));
    const g = new THREE.Group();
    g.position.set(0, capY - 0.02, -0.05);
    g.rotation.set(-0.08, 0, 0.06);
    head.add(g);
    mesh(new THREE.CylinderGeometry(hx * 1.3, hx * 1.3, 0.08, 40), hc, g, [0, 0.04, 0], [1, 1, hz / hx]);
    mesh(new THREE.CylinderGeometry(hx * 0.72, hx * 0.78, 1.15, 36), hc, g, [0, 0.62, 0], [1, 1, hz / hx]);
    mesh(new THREE.CylinderGeometry(hx * 0.79, hx * 0.79, 0.2, 36), band, g, [0, 0.2, 0], [1, 1, hz / hx], null, false);
    // a brass cog pinned to the band
    const cog = new THREE.Group();
    cog.position.set(hx * 0.42, 0.2, hz * 0.68);
    cog.rotation.y = 0.5;
    g.add(cog);
    mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 16), toon(BRASS), cog, null, null, [PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) mesh(new THREE.BoxGeometry(0.06, 0.06, 0.05), toon(BRASS), cog, [Math.cos((i / 8) * 2 * PI) * 0.15, Math.sin((i / 8) * 2 * PI) * 0.15, 0], null, [0, 0, (i / 8) * 2 * PI], false);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 10), flat(INK), cog, null, null, [PI / 2, 0, 0], false);
    out.top = capY + 1.3;
  }

  // ---------- pirate tricorn, hard hat, chef's toque, crown ----------
  if (d.hat === "pirate") {
    const hc = toon(d.hatColor), g = new THREE.Group();
    g.position.set(0, capY - 0.05, -0.02);
    g.rotation.set(-0.12, 0, 0.08);
    head.add(g);
    mesh(new THREE.SphereGeometry(1.0, 32, 14, 0, 2 * PI, 0, PI / 2), hc, g, [0, 0, 0], [hx * 1.02, 0.62, hz * 1.02]);
    // three upturned brim panels make the tricorn
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * 2 * PI + PI / 2;
      const panel = mesh(new THREE.CylinderGeometry(hx * 1.45, hx * 1.25, 0.42, 24, 1, true, a - 1.0, 2.0), (() => { const m = (hc as THREE.MeshToonMaterial).clone(); m.side = THREE.DoubleSide; return m; })(), g, [0, 0.12, 0], [1, 1, hz / hx], null, false);
      panel.rotation.y = 0;
    }
    mesh(new THREE.TorusGeometry(hx * 1.36, 0.035, 6, 48), toon("#E0A92B"), g, [0, 0.32, 0], [1, hz / hx, 1], [PI / 2, 0, 0], false);
    // skull and crossbones on the front
    const skull = new THREE.Group();
    skull.position.set(0, 0.32, hz * 1.32);
    g.add(skull);
    mesh(S(0.13), toon("#F4EFE2"), skull, [0, 0.03, 0], [1, 1, 0.5]);
    for (const s of [-1, 1]) {
      mesh(S(0.035, 8, 6), flat(INK), skull, [s * 0.05, 0.05, 0.06], null, null, false);
      mesh(new THREE.BoxGeometry(0.34, 0.05, 0.03), toon("#F4EFE2"), skull, [0, -0.08, -0.02], null, [0, 0, s * 0.6], false);
    }
    out.top = capY + 0.6;
  } else if (d.hat === "hardhat") {
    const hc = toon(d.hatColor), g = new THREE.Group();
    g.position.set(0, capY - 0.12, 0);
    head.add(g);
    mesh(new THREE.SphereGeometry(1.08, 32, 14, 0, 2 * PI, 0, PI / 2), hc, g, [0, 0, 0], [hx, 0.92, hz]);
    mesh(new THREE.CylinderGeometry(hx * 1.22, hx * 1.22, 0.07, 40), hc, g, [0, 0.02, 0.1], [1, 1, (hz / hx) * 1.12]);
    mesh(new THREE.BoxGeometry(0.16, 0.12, hz * 2.0), hc, g, [0, 0.98, 0], null, [0, 0, 0], false);
    mesh(new THREE.BoxGeometry(0.16, 0.12, hz * 2.0), hc, g, [0, 0.95, 0], [1, 1, 1], [0, PI / 2, 0], false);
    // a little headlamp
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16), toon("#3A3A44"), g, [0, 0.45, hz * 0.98], null, [PI / 2 - 0.4, 0, 0]);
    mesh(new THREE.CircleGeometry(0.08, 16), flat("#FFF4C2"), g, [0, 0.47, hz * 1.03], null, [-0.4, 0, 0], false);
    out.top = capY + 0.9;
  } else if (d.hat === "chef") {
    const white = toon(d.hatColor), g = new THREE.Group();
    g.position.set(0, capY - 0.05, -0.02);
    g.rotation.set(-0.06, 0, 0.04);
    head.add(g);
    mesh(new THREE.CylinderGeometry(hx * 0.92, hx * 0.95, 0.45, 32), white, g, [0, 0.2, 0], [1, 1, hz / hx]);
    for (const [x, y, z, r] of [[0, 0.95, 0, 0.62], [-0.45, 0.72, 0.1, 0.45], [0.45, 0.72, 0.1, 0.45], [0, 0.7, 0.4, 0.42], [-0.2, 0.75, -0.35, 0.45], [0.25, 0.75, -0.3, 0.42]]) mesh(S(r), white, g, [x * hx, y, z * hz], [1, 0.85, 1]);
    for (let i = 0; i < 6; i++) mesh(new THREE.BoxGeometry(0.02, 0.4, 0.02), flat("#D9D3C4"), g, [Math.cos((i / 6) * PI + 0.25) * hx * 0.93, 0.22, Math.sin((i / 6) * PI + 0.25) * hz * 0.93], null, null, false);
    out.top = capY + 1.5;
  } else if (d.hat === "crown") {
    const gold = toon("#F2B630"), g = new THREE.Group();
    g.position.set(0, capY + 0.05, 0);
    g.rotation.set(-0.1, 0, 0.1);
    head.add(g);
    mesh(new THREE.CylinderGeometry(hx * 0.62, hx * 0.62, 0.22, 32, 1, true), (() => { const m = (gold as THREE.MeshToonMaterial).clone(); m.side = THREE.DoubleSide; return m; })(), g, [0, 0.11, 0], [1, 1, hz / hx]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 2 * PI;
      mesh(new THREE.ConeGeometry(0.09, 0.26, 8), gold, g, [Math.sin(a) * hx * 0.62, 0.34, Math.cos(a) * hz * 0.62]);
      mesh(S(0.04, 8, 6), toon(i % 2 ? "#2F6FD6" : "#D8402F"), g, [Math.sin(a) * hx * 0.66, 0.1, Math.cos(a) * hz * 0.66], null, null, false);
    }
    out.top = capY + 0.55;
  }

  if (d.hat === "astronaut") {
    // a glass bubble over the whole head, sitting in a white collar
    const R = Math.max(hx, hy) * 1.42;
    const glass = mesh(S(R, 40, 28), new THREE.MeshBasicMaterial({ color: "#CFE8FF", transparent: true, opacity: 0.22, depthWrite: false }), head, [0, 0.12, 0.05], null, null, false);
    glass.renderOrder = 4;
    const rim = new THREE.Mesh(S(R * 1.02, 40, 28), new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, transparent: true, opacity: 0.1, depthWrite: false }));
    rim.position.copy(glass.position);
    head.add(rim);
    mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 20, Math.PI * 0.5), flat("#FFFFFF"), head, [-R * 0.42, R * 0.55, R * 0.62], [1.6, 1.6, 1], [0, 0, Math.PI * 0.45], false);
    mesh(new THREE.TorusGeometry(R * 0.72, 0.17, 12, 40), toon("#F4F2EC"), head, [0, -R * 0.72, 0], [1, 1, 0.9], [Math.PI / 2, 0, 0]);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), toon("#AEB6BF"), head, [R * 0.35, R * 1.05, 0], null, [0, 0, -0.3]);
    mesh(S(0.07), flat("#D8402F"), head, [R * 0.43, R * 1.25, 0], null, null, false);
    out.top = R * 1.3;
  } else if (d.hat === "straw") {
    const straw = toon(d.hatColor), g = new THREE.Group();
    g.position.set(0, capY - 0.08, -0.02);
    g.rotation.set(-0.15, 0, 0.1);
    head.add(g);
    mesh(new THREE.CylinderGeometry(hx * 1.85, hx * 1.9, 0.06, 48), straw, g, [0, 0.03, 0], [1, 1, hz / hx]);
    mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), straw, g, [0, 0.05, 0], [hx * 0.85, 0.55, hz * 0.85]);
    mesh(new THREE.CylinderGeometry(hx * 0.86, hx * 0.86, 0.12, 36), toon("#D8402F"), g, [0, 0.12, 0], [1, 1, hz / hx], null, false);
    for (let i = 0; i < 5; i++) mesh(new THREE.TorusGeometry(hx * (1.05 + i * 0.17), 0.008, 4, 48), flat("#C9A24A"), g, [0, 0.065, 0], [1, hz / hx, 1], [Math.PI / 2, 0, 0], false);
    out.top = capY + 0.55;
  }

  // ---------- aprons: tied on below the chin ----------
  const outfit = d.outfit ?? "none";
  if (outfit !== "none") {
    const barista = outfit === "barista";
    const g = new THREE.Group();
    g.position.set(0, -1.05 * hy, 0.62);
    g.rotation.x = 0.12;
    head.add(g);
    const body = toon(barista ? "#2E5E4E" : "#F1EBDD");
    const sh = new THREE.Shape();
    sh.moveTo(-0.3, 0.1); sh.lineTo(0.3, 0.1); sh.lineTo(0.38, -0.25); sh.quadraticCurveTo(0.5, -1.0, 0.42, -1.05); sh.lineTo(-0.42, -1.05); sh.quadraticCurveTo(-0.5, -1.0, -0.38, -0.25); sh.closePath();
    mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false, curveSegments: 12 }), body, g, [0, 0, -0.025]);
    mesh(new THREE.TorusGeometry(0.42, 0.025, 6, 30, Math.PI), toon(barista ? "#1F4236" : "#C9B99A"), g, [0, 0.1, -0.35], [hx, 1.2, 1], [-1.2, 0, 0], false);
    if (barista) {
      mesh(new THREE.BoxGeometry(0.5, 0.26, 0.02), toon("#24493C"), g, [0, -0.62, 0.04], null, null, false);
      mesh(new THREE.BoxGeometry(0.01, 0.26, 0.025), flat("#1F4236"), g, [0, -0.62, 0.05], null, null, false);
      const cup = new THREE.Group();
      cup.position.set(0, -0.27, 0.035);
      g.add(cup);
      mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.1, 12), flat("#F4EEDC"), cup, null, [1, 1, 0.2], null, false);
      mesh(new THREE.TorusGeometry(0.03, 0.01, 4, 10, Math.PI), flat("#F4EEDC"), cup, [0.075, 0, 0], null, [0, 0, -Math.PI / 2], false);
    } else {
      // splatters
      [["#D8402F", -0.2, -0.3, 0.07], ["#2F6FD6", 0.18, -0.45, 0.06], ["#F2B630", -0.05, -0.7, 0.08], ["#3E9B4F", 0.25, -0.85, 0.05], ["#E35D9C", -0.28, -0.88, 0.06], ["#D8402F", 0.1, -0.15, 0.04], ["#2F6FD6", -0.32, -0.55, 0.035], ["#F2B630", 0.3, -0.25, 0.035]].forEach(([c, x, y, r]) => {
        mesh(new THREE.CircleGeometry(r as number, 14), flat(c as string), g, [x as number, y as number, 0.03], [1, 0.85, 1], null, false);
        mesh(new THREE.CircleGeometry((r as number) * 0.35, 8), flat(c as string), g, [(x as number) + (r as number) * 1.3, (y as number) - (r as number) * 0.7, 0.03], null, null, false);
      });
      mesh(new THREE.BoxGeometry(0.42, 0.22, 0.02), toon("#E6DDC9"), g, [0, -0.6, 0.04], null, null, false);
    }
  }

  // ---------- stethoscope, eyepatch ----------
  if (d.extras.includes("stethoscope")) {
    const tube = toon("#3A3A44");
    mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 32, PI), tube, k.root, [0, -0.98, 0.2], [hx, 1, 1], [PI - 0.35, 0, 0], false);
    const drop = new THREE.CatmullRomCurve3([new THREE.Vector3(0.55 * hx, -1.05, 0.65), new THREE.Vector3(0.45, -1.45, 0.92), new THREE.Vector3(0.18, -1.7, 1.0)]);
    mesh(new THREE.TubeGeometry(drop, 16, 0.035, 6, false), tube, k.root, null, null, null, false);
    const chest = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 20), toon(STEEL), k.root, [0.15, -1.75, 1.02], null, [PI / 2 - 0.2, 0, 0]);
    mesh(new THREE.CircleGeometry(0.08, 16), flat("#DDE3EA"), chest, [0, 0.032, 0], null, [-PI / 2, 0, 0], false);
  }
  if (d.extras.includes("eyepatch")) {
    const e = k.eyes[0];
    const patch = mesh(S(0.27, 20, 12), toon("#151515"), e.open.parent!, [0, 0, 0.13], [1, 1.05, 0.25], null, false);
    patch.renderOrder = 3;
    mesh(new THREE.TorusGeometry(Math.max(hx, hz) * 1.0, 0.025, 6, 48), toon("#151515"), head, [0, 0.35, 0], [hx / Math.max(hx, hz), 1, hz / Math.max(hx, hz)], [PI / 2 - 0.1, -0.05, 0.55], false);
    e.open.visible = false;
    e.open.userData.patched = true;
  }

  // ---------- goggles (brass, pushed up on the forehead or hat band) ----------
  if (d.extras.includes("goggles")) {
    const y = d.hat === "tophat" ? capY + 0.2 : capY + 0.04;
    const strapR = d.hat === "tophat" ? hx * 0.8 : hx * 1.0;
    mesh(new THREE.TorusGeometry(strapR, 0.06, 8, 40), toon("#3B2A20"), head, [0, y, -0.05], [1, hz / hx, 1], [PI / 2 - 0.08, 0, 0], false);
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 0.27 * (strapR / hx), y + 0.06, (d.hat === "tophat" ? hz * 0.8 : k.surf(0.27, Math.min(y, hy * 0.9))) + 0.04);
      g.rotation.set(-0.35, s * 0.25, 0);
      head.add(g);
      mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 24), toon(BRASS), g, null, null, [PI / 2, 0, 0]);
      mesh(new THREE.CircleGeometry(0.12, 24), flat("#7CC8C0"), g, [0, 0, 0.065], null, null, false);
      mesh(new THREE.CircleGeometry(0.04, 12), flat("#E9FFF8"), g, [0.04, 0.04, 0.07], null, null, false);
    }
    mesh(new THREE.BoxGeometry(0.12, 0.05, 0.05), toon(BRASS), head, [0, y + 0.06, (d.hat === "tophat" ? hz * 0.8 : k.surf(0, Math.min(y, hy * 0.9))) + 0.06], null, null, false);
  }

  // ---------- lashes, blush, bow ----------
  if (d.extras.includes("lashes") && d.eyes !== "visor" && d.eyes !== "beady") {
    for (const e of k.eyes) {
      const w = e.white as THREE.Mesh;
      const rx = 0.22 * w.scale.x * (w.geometry.type === "BoxGeometry" ? 1.1 : 1), ry = 0.22 * w.scale.y * (w.geometry.type === "BoxGeometry" ? 0.75 : 1);
      [0.45, 0.85, 1.25].forEach((a, i) => {
        const len = 0.11 + i * 0.02;
        const x = e.side * Math.cos(a) * rx * 1.08, y = Math.sin(a) * ry * 1.08;
        const lash = mesh(new THREE.BoxGeometry(0.028, len, 0.02), flat(INK), e.open, [x + e.side * Math.cos(a) * len * 0.45, y + Math.sin(a) * len * 0.45, 0.06], null, [0, 0, e.side * (a - PI / 2)], false);
        lash.renderOrder = 2;
      });
    }
  }
  if (d.extras.includes("blush")) for (const s of [-1, 1]) {
    const x = s * hx * 0.55, y = -0.17;
    const b = mesh(new THREE.CircleGeometry(0.13, 20), flat("#F28BA8"), head, [x, y, k.surf(x, y) + 0.012], [1.3, 0.75, 1], null, false);
    b.lookAt(new THREE.Vector3(x * 2.2, y, k.surf(x, y) * 2 + 0.5));
  }
  if (d.extras.includes("bow")) {
    const g = new THREE.Group();
    g.position.set(hx * 0.72, hy * 0.62, hz * 0.35);
    g.rotation.set(0, 0.6, -0.35);
    head.add(g);
    const pink = toon("#E35D9C");
    for (const s of [-1, 1]) mesh(new THREE.ConeGeometry(0.17, 0.32, 16), pink, g, [s * 0.15, 0, 0], [1, 1, 0.5], [0, 0, s * (PI / 2)]);
    mesh(S(0.08), pink, g);
  }

  // ---------- pirate hook: the right mitt becomes a cuff and a steel hook ----------
  if (out.hook) {
    const mitt = k.hands[1] as THREE.Mesh;
    mitt.material = new THREE.MeshBasicMaterial({ visible: false });
    mitt.children.forEach((c) => (c.visible = false)); // its ink outline
    const hook = new THREE.Group();
    hook.name = "hook";
    hook.scale.set(1 / mitt.scale.x, 1 / mitt.scale.y, 1 / mitt.scale.z);
    mitt.add(hook);
    mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.22, 20), toon("#5C3D27"), hook, [0, -0.05, 0]);
    mesh(new THREE.TorusGeometry(0.21, 0.03, 6, 20), toon(BRASS), hook, [0, 0.06, 0], null, [PI / 2, 0, 0], false);
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.25, 8), toon(STEEL), hook, [0, 0.18, 0]);
    mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 24, PI * 1.25), toon(STEEL), hook, [-0.15, 0.3, 0], null, [0, 0, -PI * 0.1]);
    mesh(new THREE.ConeGeometry(0.04, 0.1, 8), toon(STEEL), hook, [-0.29, 0.2, 0], null, [0, 0, PI * 0.85], false);
  }

  // ---------- tools: carried in the mitts while the hands are free ----------
  const tool = d.tool ?? "none";
  if (tool !== "none") {
    const g = new THREE.Group();
    g.name = `tool-${tool}`;
    const right = new THREE.Vector3(hx + 0.12, -0.95, 0.6), left = k.root.children.length ? new THREE.Vector3(-(hx + 0.2), -1.2, 0.35) : new THREE.Vector3();
    let parent: THREE.Object3D = k.hands[1];
    let hands: THREE.Vector3[] = [left, right];
    switch (tool) {
      case "wrench": {
        // a flat steel wrench: open jaw at the top, ring at the bottom
        g.rotation.set(0.15, 0, 0.35);
        const steel = toon(STEEL);
        const jaw = new THREE.Shape();
        const r = 0.2, nx = 0.075, ny = Math.sqrt(r * r - nx * nx);
        jaw.moveTo(nx, ny);
        jaw.absarc(0, 0, r, Math.atan2(ny, nx), Math.PI - Math.atan2(ny, nx) - Math.PI * 2, true);
        jaw.lineTo(-nx, 0.0);
        jaw.lineTo(nx, 0.0);
        jaw.lineTo(nx, ny);
        const ring = new THREE.Shape();
        ring.absarc(0, 0, 0.14, 0, Math.PI * 2, false);
        const hole = new THREE.Path();
        hole.absarc(0, 0, 0.075, 0, Math.PI * 2, true);
        ring.holes.push(hole);
        const flat3 = { depth: 0.06, bevelEnabled: false, curveSegments: 20 };
        mesh(new THREE.ExtrudeGeometry(jaw, flat3), steel, g, [0, 1.0, -0.03], null, [0, 0, -0.35]);
        mesh(new THREE.ExtrudeGeometry(ring, flat3), steel, g, [0, -0.08, -0.03]);
        mesh(new THREE.BoxGeometry(0.13, 0.82, 0.06), steel, g, [0, 0.45, 0]);
        mesh(new THREE.BoxGeometry(0.05, 0.5, 0.065), flat("#8A929C"), g, [0, 0.45, 0], null, null, false);
        break;
      }
      case "hammer": {
        g.rotation.set(0.15, 0, 0.3);
        mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.0, 10), toon(WOOD), g, [0, 0.45, 0]);
        mesh(new THREE.BoxGeometry(0.5, 0.22, 0.22), toon("#6C7480"), g, [0.05, 0.98, 0]);
        mesh(new THREE.BoxGeometry(0.1, 0.24, 0.24), toon("#8A929C"), g, [0.3, 0.98, 0], null, null, false);
        break;
      }
      case "sword": {
        g.rotation.set(0.15, 0, 0.2);
        mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 10), toon("#5C3D27"), g, [0, 0.05, 0]);
        mesh(S(0.07), toon(BRASS), g, [0, -0.12, 0]);
        mesh(new THREE.BoxGeometry(0.55, 0.07, 0.1), toon(BRASS), g, [0, 0.22, 0]);
        mesh(new THREE.BoxGeometry(0.13, 1.35, 0.04), toon("#DDE3EA"), g, [0, 0.92, 0]);
        mesh(new THREE.ConeGeometry(0.092, 0.2, 4), toon("#DDE3EA"), g, [0, 1.69, 0], [1, 1, 0.3], [0, PI / 4, 0]);
        break;
      }
      case "wand": {
        g.rotation.set(0.2, 0, 0.45);
        mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.9, 8), toon("#3B2A20"), g, [0, 0.42, 0]);
        const star = new THREE.OctahedronGeometry(0.16);
        star.scale(1, 1, 0.4);
        mesh(star, toon("#F2B630"), g, [0, 0.95, 0]);
        mesh(new THREE.OctahedronGeometry(0.05), flat("#FFF4C2"), g, [0.18, 1.12, 0.05], null, null, false);
        break;
      }
      case "gameboy": {
        // a handheld console held up to its face, so we see the back: dark slab, red and blue grips
        parent = k.root;
        g.position.set(0, -0.82, 1.08);
        g.rotation.set(0.35, 0, 0);
        mesh(new THREE.BoxGeometry(0.9, 0.46, 0.1), toon("#2C2C34"), g);
        mesh(new THREE.BoxGeometry(0.3, 0.5, 0.14), toon("#00A2E8"), g, [-0.6, 0, 0]);
        mesh(new THREE.BoxGeometry(0.3, 0.5, 0.14), toon("#E60012"), g, [0.6, 0, 0]);
        for (const x of [-0.6, 0.6]) mesh(new THREE.BoxGeometry(0.24, 0.05, 0.1), toon("#1D1D22"), g, [x, 0.27, -0.01], null, null, false);
        mesh(new THREE.BoxGeometry(0.3, 0.04, 0.012), flat("#45454F"), g, [0, -0.12, 0.056], null, null, false);
        for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.02, 0.12, 0.012), flat("#45454F"), g, [-0.18 + i * 0.12, 0.08, 0.056], null, null, false);
        hands = [new THREE.Vector3(-0.72, -1.05, 1.0), new THREE.Vector3(0.72, -1.05, 1.0)];
        break;
      }
      case "basketball": {
        g.position.set(0.08, 0.25, 0.1);
        const ball = mesh(S(0.34), toon("#E07A2E"), g);
        for (const [rx, ry] of [[0, 0], [PI / 2, 0], [0, PI / 2]]) mesh(new THREE.TorusGeometry(0.342, 0.012, 6, 32), flat(INK), ball, null, null, [rx, ry, 0], false);
        right.set(hx + 0.2, -1.05, 0.55);
        break;
      }
      case "lantern": {
        g.position.set(0, -0.15, 0);
        mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 16, PI), toon("#3A3A44"), g, [0, 0.12, 0]);
        mesh(new THREE.ConeGeometry(0.2, 0.14, 6), toon("#3A3A44"), g, [0, -0.02, 0]);
        mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.32, 6), flat("#FFD35C"), g, [0, -0.25, 0]);
        mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 6), toon("#3A3A44"), g, [0, -0.43, 0]);
        right.set(hx + 0.25, -0.7, 0.55);
        break;
      }
      case "mug": {
        g.position.set(-0.1, 0.18, 0.12);
        mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.32, 20), toon("#ECE6D6"), g);
        mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 14), toon("#ECE6D6"), g, [0.19, 0, 0]);
        mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 20), flat("#6B4226"), g, [0, 0.155, 0], null, null, false);
        mesh(new THREE.BoxGeometry(0.34, 0.06, 0.02), toon(d.hatColor), g, [0, 0.02, 0.16], null, null, false);
        right.set(hx - 0.05, -0.9, 0.85);
        break;
      }
      case "testtube": {
        g.position.set(0, 0.15, 0.1);
        g.rotation.set(0, 0, 0.15);
        mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.7, 16, 1, true), new THREE.MeshBasicMaterial({ color: "#DDF2F7", transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }), g, [0, 0.3, 0], null, null, false);
        mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 20), toon("#DDF2F7"), g, [0, 0.65, 0], null, [PI / 2, 0, 0], false);
        mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.4, 16), flat("#7CF2C8"), g, [0, 0.13, 0], null, null, false);
        mesh(S(0.095, 16, 8), flat("#7CF2C8"), g, [0, -0.07, 0], null, null, false);
        for (const [x, y, r] of [[0.02, 0.4, 0.035], [-0.03, 0.52, 0.025], [0.03, 0.62, 0.02]]) mesh(S(r, 8, 6), flat("#E9FFF8"), g, [x, y, 0.06], null, null, false);
        break;
      }
      case "spatula": {
        g.rotation.set(0.15, 0, 0.3);
        mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.7, 10), toon("#3A3A44"), g, [0, 0.3, 0]);
        mesh(new THREE.BoxGeometry(0.06, 0.25, 0.03), toon(STEEL), g, [0, 0.75, 0]);
        mesh(new THREE.BoxGeometry(0.34, 0.36, 0.03), toon(STEEL), g, [0, 1.02, 0]);
        for (let i = -1; i <= 1; i++) mesh(new THREE.BoxGeometry(0.04, 0.22, 0.035), flat("#6C7480"), g, [i * 0.09, 1.04, 0], null, null, false);
        break;
      }
      case "paintbrush": {
        g.rotation.set(0.15, 0, 0.35);
        mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.75, 10), toon("#C9652B"), g, [0, 0.3, 0]);
        mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.16, 10), toon(STEEL), g, [0, 0.74, 0]);
        mesh(new THREE.ConeGeometry(0.07, 0.24, 10), toon(d.hatColor), g, [0, 0.93, 0]);
        break;
      }
      case "pickaxe": {
        g.rotation.set(0.15, 0, 0.3);
        mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 10), toon(WOOD), g, [0, 0.5, 0]);
        mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 24, PI * 0.7), toon("#6C7480"), g, [0, 0.65, 0], [1, 0.6, 1], [0, 0, PI * 0.15]);
        break;
      }
      case "spyglass": {
        // eyepiece in the hand, the wide brass objective out front
        g.rotation.set(0.1, 0, 0.55);
        mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.3, 16), toon(BRASS), g, [0, 0.1, 0]);
        mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.4, 16), toon("#7A5236"), g, [0, 0.43, 0]);
        mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.5, 16), toon(BRASS), g, [0, 0.85, 0]);
        mesh(new THREE.TorusGeometry(0.11, 0.02, 6, 20), toon("#8A6A1E"), g, [0, 1.1, 0], null, [Math.PI / 2, 0, 0], false);
        mesh(new THREE.CircleGeometry(0.095, 16), flat("#9FD3E6"), g, [0, 1.105, 0], null, [-Math.PI / 2, 0, 0], false);
        break;
      }
      case "flower": {
        g.rotation.set(0.1, 0, 0.2);
        mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.8, 8), toon("#2E6B46"), g, [0, 0.35, 0], null, null, false);
        mesh(S(0.12), toon("#6FA35A"), g, [0.1, 0.35, 0], [1, 0.4, 0.6], [0, 0, 0.6]);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * 2 * PI; mesh(S(0.12), toon("#E35D9C"), g, [Math.cos(a) * 0.13, 0.82 + Math.sin(a) * 0.13, 0], [1, 1, 0.4]); }
        mesh(S(0.09), toon("#F2B630"), g, [0, 0.82, 0.03], null, null, false);
        break;
      }
      case "milkpitcher": {
        g.position.set(-0.05, 0.2, 0.12);
        g.rotation.set(0, -0.5, 0);
        mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.42, 24, 1, true), (() => { const m = (toon(STEEL) as THREE.MeshToonMaterial).clone(); m.side = THREE.DoubleSide; return m; })(), g, null, null, null, false);
        mesh(new THREE.CircleGeometry(0.19, 24), toon(STEEL), g, [0, -0.21, 0], null, [Math.PI / 2, 0, 0], false);
        mesh(new THREE.TorusGeometry(0.15, 0.02, 6, 24), toon("#8A929C"), g, [0, 0.21, 0], null, [Math.PI / 2, 0, 0], false);
        mesh(new THREE.ConeGeometry(0.06, 0.14, 12, 1, true), toon(STEEL), g, [0, 0.19, 0.17], [1, 1, 0.6], [-1.1, 0, 0], false);
        mesh(new THREE.TorusGeometry(0.1, 0.028, 6, 16, Math.PI), toon(STEEL), g, [0, 0.02, -0.18], null, [0, Math.PI / 2, -Math.PI / 2], false);
        mesh(new THREE.CircleGeometry(0.14, 20), flat("#F4EEDC"), g, [0, 0.16, 0], null, [-Math.PI / 2, 0, 0], false);
        break;
      }
      case "palette": {
        // a wooden palette with blobs of paint and a brush poked through the thumb hole
        g.position.set(-0.1, 0.25, 0.15);
        g.rotation.set(-0.6, 0.3, 0.25);
        const sh = new THREE.Shape();
        sh.moveTo(0, 0.42);
        sh.bezierCurveTo(0.5, 0.45, 0.6, -0.1, 0.35, -0.35);
        sh.bezierCurveTo(0.1, -0.55, -0.45, -0.45, -0.5, -0.05);
        sh.bezierCurveTo(-0.55, 0.3, -0.35, 0.4, -0.12, 0.3);
        sh.bezierCurveTo(-0.05, 0.22, -0.18, 0.05, -0.05, 0.05);
        sh.bezierCurveTo(0.1, 0.05, 0.05, 0.25, 0, 0.42);
        const thumb = new THREE.Path();
        thumb.absarc(-0.22, 0.08, 0.07, 0, Math.PI * 2, true);
        sh.holes.push(thumb);
        mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false, curveSegments: 16 }), toon("#C99A62"), g);
        [["#D8402F", 0.25, 0.22], ["#F2B630", 0.38, -0.05], ["#2F6FD6", 0.18, -0.3], ["#3E9B4F", -0.12, -0.32], ["#FFFFFF", -0.35, -0.12]].forEach(([c, x, y]) => mesh(S(0.07, 12, 8), flat(c as string), g, [x as number, y as number, 0.05], [1, 1, 0.35], null, false));
        const brush = new THREE.Group();
        brush.position.set(-0.22, 0.08, 0.02);
        brush.rotation.set(0.9, 0, 0.5);
        g.add(brush);
        mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.7, 8), toon("#C9652B"), brush, [0, 0.1, 0], null, null, false);
        mesh(new THREE.ConeGeometry(0.04, 0.12, 8), toon("#D8402F"), brush, [0, 0.5, 0], null, null, false);
        break;
      }
      case "briefcase": {
        g.position.set(0, -0.42, 0);
        mesh(new THREE.BoxGeometry(0.75, 0.52, 0.18), toon("#6B4226"), g);
        mesh(new THREE.TorusGeometry(0.11, 0.035, 6, 16, Math.PI), toon("#3B2A20"), g, [0, 0.26, 0]);
        for (const x of [-0.22, 0.22]) mesh(new THREE.BoxGeometry(0.09, 0.07, 0.04), toon(BRASS), g, [x, 0.18, 0.1], null, null, false);
        mesh(new THREE.BoxGeometry(0.75, 0.03, 0.19), flat("#4A2E1A"), g, [0, 0.1, 0], null, null, false);
        right.set(hx + 0.15, -0.75, 0.45);
        break;
      }
      case "book": {
        g.position.set(0.05, 0.2, 0);
        g.rotation.set(0, -0.5, 0.15);
        mesh(new THREE.BoxGeometry(0.55, 0.75, 0.16), toon(d.hatColor === "#25221F" ? "#7A2E2E" : d.hatColor), g);
        mesh(new THREE.BoxGeometry(0.5, 0.7, 0.13), toon("#F4EEDC"), g, [0.04, 0, 0], null, null, false);
        mesh(new THREE.BoxGeometry(0.06, 0.6, 0.17), toon(BRASS), g, [-0.26, 0, 0], null, null, false);
        break;
      }
    }
    if (out.hook && parent === k.hands[1]) {
      // the hook can't hold anything: carry it in the left mitt, mirrored
      parent = k.hands[0];
      g.position.x *= -1;
      g.rotation.z *= -1;
      g.rotation.y *= -1;
      const [l, r] = hands;
      hands = [new THREE.Vector3(-r.x, r.y, r.z), new THREE.Vector3(-l.x, l.y, l.z)];
    }
    parent.add(g);
    out.tool = g;
    out.toolHands = hands;
  }
  return out;
}
