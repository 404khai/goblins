import * as THREE from "three";
import { kit, type Rig } from "./build";
import { SOLIDS, type Solid } from "./solids";
import type { Goblin } from "./types";

/**
 * Spells: a goblin dissolves into fine dots of its own colors and reforms as an object that
 * shows what it is doing: a quill on a scroll, a Rubik's cube, headphones, a mailbox…
 * Dots are depth-shaded so each object reads as solid. An optional rune circle glows underneath.
 */

export type MorphId =
  | "writing" | "sketching" | "solving" | "listening" | "thinking" | "orbit" | "radar" | "progress" | "dictating"
  | "sending" | "receiving" | "uploading" | "bouncing" | "alerting" | "powering-down";

interface Particle {
  k: number; // 0..1, this dot's slot in the target object
  r: number[]; // stable randoms
  out: THREE.Vector3;
  s: number; // dot size multiplier (0 hides it)
  c: string | null; // target color, null keeps the goblin's own
}
interface Palette { skin: string; hat: string; beard: string; scarf: string }
interface MorphDef { label: string; blurb: string; accent: string; shape: (p: Particle, t: number, g: Palette) => void }

const INK = "#1D2318", PAPER = "#F4EEDC", GOLD = "#F2B630", TEAL = "#7CF2C8", RED = "#E2443A";
const TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, abs, floor, min, max, sqrt, pow } = Math;
const frac = (x: number) => x - floor(x);
const clamp01 = (x: number) => min(1, max(0, x));
const smooth = (x: number) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const shadeHex = (hex: string, f = 0.75) => "#" + new THREE.Color(hex).multiplyScalar(f).getHexString();
const Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);

/** Point on a sphere (or ellipsoid via sz) surface from two randoms. */
const onSphere = (v: THREE.Vector3, a: number, b: number, r: number, sz = 1) => {
  const th = a * TAU, z = b * 2 - 1, q = sqrt(1 - z * z);
  return v.set(q * cos(th) * r, z * r, q * sin(th) * r * sz);
};
/** Picks a slot within [lo, hi) of k and returns its 0..1 position, or -1. */
const slot = (k: number, lo: number, hi: number) => (k >= lo && k < hi ? (k - lo) / (hi - lo) : -1);

export const MORPHS: Record<MorphId, MorphDef> = {
  writing: {
    label: "Writing", blurb: "A quill writes lines across an unrolled scroll.", accent: GOLD,
    shape: (p, t, g) => {
      const [a, b, c] = p.r;
      const prog = frac(t / 7);
      const line = min(3, floor(prog * 4)), lu = frac(prog * 4);
      const nib = new THREE.Vector3(-1.2 + 2.4 * lu, -0.5 - line * 0.36 + 0.05 * sin(lu * 40 + line), 0.42);
      let u: number;
      if ((u = slot(p.k, 0, 0.42)) >= 0) {
        p.out.set(-1.45 + 2.9 * a, -1.95 + 1.85 * b, 0.28 + 0.06 * sin(a * TAU));
        p.c = PAPER;
      } else if ((u = slot(p.k, 0.42, 0.56)) >= 0) {
        // rolled ends
        const side = u < 0.5 ? -1 : 1, th = b * TAU;
        p.out.set(side * 1.55 + 0.16 * cos(th), -2.05 + 2.05 * c, 0.3 + 0.16 * sin(th));
        p.c = "#D8C394";
      } else if ((u = slot(p.k, 0.56, 0.72)) >= 0) {
        const j = u * 4, ln = floor(j), lx = frac(j);
        const written = (ln + lx) / 4 < prog;
        p.out.set(-1.2 + 2.4 * lx, -0.5 - ln * 0.36 + 0.05 * sin(lx * 40 + ln) + (b - 0.5) * 0.03, 0.36);
        if (!written) p.out.copy(nib);
        p.s = written ? 0.85 : 0;
        p.c = INK;
      } else {
        // quill: shaft plus angled barbs, nib riding the line
        const q = slot(p.k, 0.72, 1);
        const wob = sin(t * 18) * 0.03;
        const spine = (s: number) => new THREE.Vector3(nib.x + 0.25 * s + 0.4 * s * s + wob, nib.y + 2.2 * s, nib.z + 0.25 * s);
        if (q < 0.18) { p.out.copy(spine(q / 0.18 * 0.25)); p.c = q < 0.05 ? INK : "#EDE6D0"; p.s = 1.1; return; }
        const s = 0.2 + a * 0.8, side = b < 0.5 ? -1 : 1, len = sin(PI * pow((s - 0.2) / 0.8, 0.7)) * 0.42 * c;
        const base = spine(s);
        p.out.set(base.x + side * len * 0.9, base.y - len * 0.45, base.z + side * len * 0.15);
        p.c = len < 0.02 ? "#EDE6D0" : side > 0 ? g.hat : shadeHex(g.hat, 0.8);
      }
    },
  },

  sketching: {
    label: "Sketching", blurb: "A pencil draws a star on an easel.", accent: GOLD,
    shape: (p, t, g) => {
      const [a, b, c] = p.r;
      const prog = min(1, frac(t / 6) * 1.2);
      const curve = (u: number) => {
        const th = u * TAU + PI / 2, r = 0.6 + 0.3 * cos(5 * (th - PI / 2));
        return new THREE.Vector3(cos(th) * r, 0.5 + sin(th) * r, 0.36);
      };
      let u: number;
      if ((u = slot(p.k, 0, 0.36)) >= 0) { p.out.set((a - 0.5) * 2.6, -0.85 + b * 2.7, 0.28); p.c = PAPER; }
      else if ((u = slot(p.k, 0.36, 0.48)) >= 0) {
        // easel: two legs and a ledge
        if (a < 0.7) { const side = b < 0.5 ? -1 : 1; p.out.set(side * (0.75 + c * 0.45), 1.6 - c * 3.8, 0.15); }
        else p.out.set((b - 0.5) * 2.9, -0.95, 0.3 + (c - 0.5) * 0.2);
        p.c = "#7A5236";
      } else if ((u = slot(p.k, 0.48, 0.72)) >= 0) {
        const drawn = u <= prog;
        p.out.copy(curve(drawn ? u : prog));
        p.s = drawn ? 0.9 : 0;
        p.c = INK;
      } else {
        const q = slot(p.k, 0.72, 1);
        const nib = curve(prog), ang = 0.8 + sin(t * 9) * 0.05, along = q * 1.9;
        const rad = q < 0.1 ? (q / 0.1) * 0.13 : 0.13, th = a * TAU;
        p.out.set(nib.x + cos(ang) * along - sin(ang) * cos(th) * rad, nib.y + sin(ang) * along + cos(ang) * cos(th) * rad, nib.z + 0.25 + sin(th) * rad);
        p.c = q < 0.04 ? INK : q < 0.1 ? "#E9C9A0" : q > 0.92 ? "#E78FA8" : q > 0.87 ? "#C9C2B0" : g.hat;
      }
    },
  },

  solving: {
    label: "Solving", blurb: "A Rubik's cube scrambles a layer, then solves it.", accent: TEAL,
    shape: (p, t) => {
      const [a, b] = p.r;
      const S = 0.9, face = floor(p.k * 6);
      const u = (a * 2 - 1) * S, w = (b * 2 - 1) * S;
      const v = [new THREE.Vector3(S, u, w), new THREE.Vector3(-S, u, w), new THREE.Vector3(u, S, w), new THREE.Vector3(u, -S, w), new THREE.Vector3(u, w, S), new THREE.Vector3(u, w, -S)][face];
      const gap = (x: number) => { const f = frac((x / S + 1) * 1.5); return f < 0.07 || f > 0.93; };
      p.s = 1.6;
      p.c = gap(u) || gap(w) ? "#151515" : ["#D8402F", "#E8772E", "#F5F2EA", "#F2C230", "#3E9B4F", "#2F6FD6"][face];
      const step = floor(t / 1.8), q = frac(t / 1.8);
      const ang = (smooth(q / 0.35) - smooth((q - 0.5) / 0.35)) * (PI / 2) * (step % 2 ? 1 : -1);
      const axis = (["y", "x", "y", "z"] as const)[step % 4];
      const layer = [1, -1, 0, 1, -1][step % 5];
      const coord = v[axis];
      if ((coord < -S / 3 ? -1 : coord > S / 3 ? 1 : 0) === layer) v.applyAxisAngle(axis === "x" ? X : axis === "y" ? Y : Z, ang);
      v.applyEuler(new THREE.Euler(0.55, 0.75 + sin(t * 0.4) * 0.25, 0));
      p.out.copy(v).add(new THREE.Vector3(0, 0.15, 0));
    },
  },

  listening: {
    label: "Listening", blurb: "Big headphones, with sound waves rolling into each cup.", accent: TEAL,
    shape: (p, t, g) => {
      const [a, b, c] = p.r;
      let u: number;
      if ((u = slot(p.k, 0, 0.22)) >= 0) {
        const th = a * PI, R = 1.15 + (b - 0.5) * 0.18;
        p.out.set(cos(th) * R, 0.05 + sin(th) * R * 1.05, (c - 0.5) * 0.22);
        p.c = g.hat;
      } else if ((u = slot(p.k, 0.22, 0.62)) >= 0) {
        // cups: cylinders along x, with a cushion ring on the inner face
        const side = u < 0.5 ? -1 : 1, th = b * TAU, part = c;
        const cx = side * 1.12, cy = -0.15;
        if (part < 0.55) { p.out.set(cx + side * (a - 0.3) * 0.38, cy + cos(th) * 0.5, sin(th) * 0.5); p.c = INK; }
        else if (part < 0.8) { const r = sqrt(a) * 0.5; p.out.set(cx + side * 0.28, cy + cos(th) * r, sin(th) * r); p.c = "#2C2C34"; }
        else { const r = 0.42 + a * 0.12; p.out.set(cx - side * 0.12, cy + cos(th) * r, sin(th) * r); p.c = g.beard; }
      } else {
        const side = p.k < 0.81 ? -1 : 1, q = frac(floor(a * 3) / 3 + t * 0.45);
        const R = 2.9 - q * 1.35 + (c - 0.5) * 0.04, th = (b - 0.5) * 0.9;
        p.out.set(side * cos(th) * R, -0.15 + sin(th) * R, 0.1 + (c - 0.5) * 0.08);
        p.s = sin(q * PI);
        p.c = TEAL;
      }
    },
  },

  thinking: {
    label: "Thinking", blurb: "A thought cloud with bubbles drifting up to it.", accent: TEAL,
    shape: (p, t) => {
      const [a, b, c] = p.r;
      if (p.k < 0.8) {
        const B = [[-0.85, 1.15, 0.62], [0, 1.55, 0.78], [0.9, 1.2, 0.66], [-0.4, 0.75, 0.58], [0.5, 0.75, 0.58], [1.4, 0.8, 0.45], [-1.4, 0.75, 0.42]];
        const [x, y, r] = B[floor(c * B.length)];
        onSphere(p.out, a, b, r, 0.55);
        p.c = abs(p.out.z) < 0.09 * r ? "#7E8B98" : "#FFFFFF";
        p.s = 1.3;
        p.out.add(new THREE.Vector3(x, y + sin(t * 1.5 + x) * 0.05, 0.1));
      } else {
        const j = floor(slot(p.k, 0.8, 1) * 3);
        const pulse = 1 + 0.2 * sin(t * 4 - j * 1.2);
        const C = [[-0.95, -0.25, 0.28], [-1.3, -0.85, 0.19], [-1.5, -1.3, 0.12]][j];
        onSphere(p.out, a, b, C[2] * pulse);
        p.c = abs(p.out.z) < 0.15 * C[2] ? "#7E8B98" : "#FFFFFF";
        p.out.add(new THREE.Vector3(C[0], C[1], 0.2));
      }
    },
  },

  orbit: {
    label: "Orbit", blurb: "A banded ringed planet with two moons.", accent: GOLD,
    shape: (p, t, g) => {
      const [a, b, c] = p.r;
      const tilt = new THREE.Euler(0.42, 0, 0.32);
      if (p.k < 0.5) {
        onSphere(p.out, a + t * 0.05, b, 0.82);
        const lat = p.out.y / 0.82;
        p.c = abs(sin(lat * 7)) > 0.6 ? g.hat : shadeHex(g.skin, 1.05);
        p.out.applyEuler(tilt).add(new THREE.Vector3(0, 0.2, 0));
      } else if (p.k < 0.9) {
        const th = a * TAU + t * 0.3, R = 1.15 + b * 0.75;
        p.out.set(cos(th) * R, (c - 0.5) * 0.03, sin(th) * R).applyEuler(tilt).add(new THREE.Vector3(0, 0.2, 0));
        p.c = R < 1.45 ? shadeHex(g.beard, 0.9) : R < 1.55 ? INK : g.beard;
        p.s = 0.8;
      } else {
        const m = p.k < 0.95 ? 0 : 1, th = t * (m ? -0.9 : 0.6) + m * 2;
        onSphere(p.out, a, b, m ? 0.13 : 0.18).add(new THREE.Vector3(cos(th) * (2.1 + m * 0.3), 0.2 + sin(th) * 0.5, sin(th) * 1.1));
        p.c = m ? GOLD : "#C9C2B0";
      }
    },
  },

  radar: {
    label: "Radar", blurb: "A radar screen: grid, sweeping beam and blips.", accent: TEAL,
    shape: (p, t) => {
      const [a, b] = p.r;
      const R = 1.55, sweep = -t * 1.8;
      let u: number;
      if ((u = slot(p.k, 0, 0.3)) >= 0) { const r = sqrt(a) * R, th = b * TAU; p.out.set(cos(th) * r, 0.2 + sin(th) * r, 0); p.c = "#12301F"; p.s = 1.15; }
      else if ((u = slot(p.k, 0.3, 0.42)) >= 0) { const th = a * TAU, r = R + 0.05 + b * 0.14; p.out.set(cos(th) * r, 0.2 + sin(th) * r, 0.02); p.c = "#3A3A44"; }
      else if ((u = slot(p.k, 0.42, 0.6)) >= 0) {
        // grid: two rings and a crosshair
        if (a < 0.6) { const r = (a < 0.3 ? 0.5 : 1.0) * R, th = b * TAU; p.out.set(cos(th) * r, 0.2 + sin(th) * r, 0.03); }
        else if (a < 0.8) p.out.set((b * 2 - 1) * R, 0.2, 0.03);
        else p.out.set(0, 0.2 + (b * 2 - 1) * R, 0.03);
        p.c = "#4FB073"; p.s = 1.0;
      } else if ((u = slot(p.k, 0.6, 0.94)) >= 0) {
        const lag = a * 0.9, r = sqrt(b) * R, th = sweep + lag;
        p.out.set(cos(th) * r, 0.2 + sin(th) * r, 0.05);
        p.c = "#7CF2A0"; p.s = 1 - lag;
      } else {
        const B = [[0.55, 0.6], [-0.7, -0.4], [0.3, -0.9]], j = floor(slot(p.k, 0.94, 1) * 3), [bx, by] = B[j];
        const since = frac((sweep - Math.atan2(by, bx)) / -TAU);
        onSphere(p.out, a, b, 0.09).add(new THREE.Vector3(bx, 0.2 + by, 0.08));
        p.c = "#E9FFF0"; p.s = 1.3 * (1 - since);
      }
    },
  },

  progress: {
    label: "Progress", blurb: "An hourglass runs out, then flips.", accent: GOLD,
    shape: (p, t) => {
      const [a, b, c] = p.r;
      const T = 6, q = frac(t / T), run = clamp01(q / 0.86), flip = smooth((q - 0.88) / 0.12);
      const H = 1.1;
      const glassR = (y: number) => 0.09 + 0.78 * pow(abs(y), 1.25);
      let u: number;
      const v = p.out;
      if ((u = slot(p.k, 0, 0.2)) >= 0) { const y = b * 2 - 1, th = a * TAU, r = glassR(y); v.set(cos(th) * r, y * H, sin(th) * r); p.c = "#CFE8F0"; p.s = 0.6; }
      else if ((u = slot(p.k, 0.2, 0.38)) >= 0) { const top = u < 0.5 ? 1 : -1, r = sqrt(a) * 1.05, th = b * TAU; v.set(cos(th) * r, top * (H + 0.08 + (c - 0.5) * 0.14), sin(th) * r); p.c = "#7A5236"; }
      else if ((u = slot(p.k, 0.38, 0.46)) >= 0) { const th = floor(a * 3) / 3 * TAU + 0.5; v.set(cos(th) * 0.98, (b * 2 - 1) * H, sin(th) * 0.98); p.c = "#5C3D27"; }
      else if ((u = slot(p.k, 0.46, 0.7)) >= 0) {
        const level = 0.06 + (1 - run) * 0.84, y = 0.06 + b * (level - 0.06), r = glassR(y) * 0.92 * sqrt(a), th = c * TAU;
        v.set(cos(th) * r, y * H, sin(th) * r); p.c = GOLD; p.s = level > 0.08 ? 0.9 : 0;
      } else if ((u = slot(p.k, 0.7, 0.94)) >= 0) {
        const hgt = run * 0.75, y = -1 + b * hgt, cone = 1 - (y + 1) / (hgt + 0.001);
        const r = glassR(y) * 0.92 * sqrt(a) * sqrt(max(0, cone) * 0.6 + 0.4), th = c * TAU;
        v.set(cos(th) * r, y * H, sin(th) * r); p.c = GOLD; p.s = hgt > 0.02 ? 0.9 : 0;
      } else { v.set((a - 0.5) * 0.04, (0.06 - b * (1.06 - run * 0.75)) * H, 0); p.c = GOLD; p.s = run < 1 ? 0.8 : 0; }
      v.applyAxisAngle(Z, flip * PI).applyAxisAngle(Y, 0.4).add(new THREE.Vector3(0, 0.15, 0));
    },
  },

  dictating: {
    label: "Speaking", blurb: "A studio microphone with its voice rippling out.", accent: RED,
    shape: (p, t) => {
      const [a, b, c] = p.r;
      const head = new THREE.Vector3(0, 0.95, 0);
      let u: number;
      if ((u = slot(p.k, 0, 0.36)) >= 0) {
        onSphere(p.out, a, b, 0.56, 1).add(head);
        const d = p.out.clone().sub(head);
        const grille = abs(sin(Math.atan2(d.z, d.x) * 8)) < 0.18 || abs(sin(d.y * 14)) < 0.18;
        p.c = grille ? "#8B9098" : "#D3D7DD";
      } else if ((u = slot(p.k, 0.36, 0.5)) >= 0) { const th = a * TAU; p.out.set(cos(th) * 0.24, 0.45 - b * 1.25, sin(th) * 0.24); p.c = "#2C2C34"; }
      else if ((u = slot(p.k, 0.5, 0.6)) >= 0) {
        const th = PI + 0.25 + a * (PI - 0.5), R = 0.78;
        p.out.set(cos(th) * R, 0.95 + sin(th) * R, (b - 0.5) * 0.1); p.c = "#3A3A44";
      } else if ((u = slot(p.k, 0.6, 0.7)) >= 0) {
        if (a < 0.5) p.out.set((b - 0.5) * 0.08, -0.8 - c * 1.2, 0);
        else { const r = sqrt(b) * 0.7, th = c * TAU; p.out.set(cos(th) * r, -2.05, sin(th) * r * 0.6); }
        p.c = "#3A3A44";
      } else {
        const ring = floor(a * 3), side = b < 0.5 ? -1 : 1, R = 0.95 + ring * 0.38;
        const th = (c - 0.5) * 1.1, on = max(0, sin(t * 6 - ring * 1.1));
        p.out.set(side * cos(th) * R, 0.95 + sin(th) * R, 0.1);
        p.c = RED; p.s = on;
      }
    },
  },

  sending: {
    label: "Sending", blurb: "A paper plane loops away with a dotted trail.", accent: TEAL,
    shape: (p, t) => {
      const [a, b] = p.r;
      const path = (tt: number) => new THREE.Vector3(sin(tt * 1.1) * 1.6, 0.4 + sin(tt * 2.2) * 0.6, cos(tt * 1.1) * 0.7);
      if (p.k < 0.78) {
        p.out.copy(planePoint(p.k / 0.78, a, b, 1.15));
        const pos = path(t), ahead = path(t + 0.05).sub(pos);
        p.out.applyAxisAngle(Z, Math.atan2(ahead.y, Math.hypot(ahead.x, ahead.z)) * 0.6).applyAxisAngle(Y, Math.atan2(-ahead.z, ahead.x)).add(pos);
        p.c = p.k / 0.78 > 0.94 ? "#B9B29C" : p.k / 0.78 > 0.66 ? "#DDD6C2" : PAPER;
      } else {
        const back = slot(p.k, 0.78, 1), dash = frac(back * 12) < 0.55;
        p.out.copy(path(t - 0.12 - back * 1.4));
        p.s = dash ? (1 - back) * 0.9 : 0;
        p.c = TEAL;
      }
    },
  },

  receiving: {
    label: "Receiving", blurb: "A paper plane glides into a mailbox and the flag pops up.", accent: GOLD,
    shape: (p, t) => {
      const [a, b, c] = p.r;
      const W = 0.48, L = 0.95, Y0 = -0.3, Y1 = 0.25;
      const box = new THREE.Matrix4().makeRotationY(-0.75).setPosition(0.55, -0.05, 0);
      const q = frac(t / 4.6);
      const arrive = 0.55;
      let u: number;
      const v = p.out;
      if ((u = slot(p.k, 0, 0.4)) >= 0) {
        const part = frac(a * 7.31), h = frac(b * 5.17), z = (c * 2 - 1) * L;
        if (part < 0.27) v.set(-W, Y0 + (Y1 - Y0) * h, z);
        else if (part < 0.54) v.set(W, Y0 + (Y1 - Y0) * h, z);
        else if (part < 0.94) { const th = h * PI; v.set(cos(th) * W, Y1 + sin(th) * W, z); }
        else v.set((h * 2 - 1) * W, Y0, z);
        p.c = "#2F5FC4";
      } else if ((u = slot(p.k, 0.4, 0.55)) >= 0) {
        // front: D shape, open slot when the plane is due
        let x: number, y: number;
        if (a < 0.5) { x = (b * 2 - 1) * W; y = Y0 + (Y1 - Y0) * c; } else { const th = b * PI, r = sqrt(c) * W; x = cos(th) * r; y = Y1 + sin(th) * r; }
        v.set(x, y, L);
        const inner = abs(x) < W * 0.72 && y > Y0 + 0.1 && (y < Y1 || Math.hypot(x, y - Y1) < W * 0.72);
        p.c = inner && q < arrive + 0.1 ? "#141414" : "#4C7BDA";
      } else if ((u = slot(p.k, 0.55, 0.64)) >= 0) {
        const f = frac(a * 4.13);
        v.set(f < 0.5 ? (f * 4 - 1) * 0.1 : (f < 0.75 ? -1 : 1) * 0.1, Y0 - b * 1.9, (c - 0.5) * 0.2);
        p.c = "#7A5236";
      } else if ((u = slot(p.k, 0.64, 0.72)) >= 0) {
        const up = smooth((q - arrive - 0.04) / 0.12) * (1 - smooth((q - 0.93) / 0.06));
        const ang = up * PI / 2, along = a * 0.75;
        const wide = along > 0.48 ? 0.28 : 0.05;
        const local = new THREE.Vector3(0, (b - 0.5) * wide, -along).applyAxisAngle(X, ang);
        v.set(W + 0.04, 0.05 + local.y, -0.2 + local.z);
        p.c = RED;
      }
      if (p.k < 0.72) { v.applyMatrix4(box); return; }
      // the plane, flying into the slot
      const mouth = new THREE.Vector3(0, -0.02, L + 0.05).applyMatrix4(box);
      const start = new THREE.Vector3(-2.6, 2.3, 1.2), ctrl = new THREE.Vector3(-2.2, -0.4, 1.8);
      const bez = (s: number) => start.clone().multiplyScalar((1 - s) ** 2).add(ctrl.clone().multiplyScalar(2 * s * (1 - s))).add(mouth.clone().multiplyScalar(s * s));
      const fly = clamp01(q / arrive);
      if ((u = slot(p.k, 0.72, 0.93)) >= 0) {
        const pos = bez(fly), ahead = bez(min(1, fly + 0.02)).sub(bez(max(0, fly - 0.02)));
        v.copy(planePoint(u, a, b, 0.62));
        v.applyAxisAngle(Z, Math.atan2(ahead.y, Math.hypot(ahead.x, ahead.z))).applyAxisAngle(Y, Math.atan2(-ahead.z, ahead.x)).add(pos);
        p.s = q < arrive + 0.03 ? 1 : 0;
        p.c = u > 0.94 ? "#B9B29C" : PAPER;
      } else {
        const back = slot(p.k, 0.93, 1);
        v.copy(bez(max(0, fly - 0.05 - back * 0.3)));
        p.s = q < arrive && frac(back * 8) < 0.5 ? (1 - back) * 0.8 : 0;
        p.c = GOLD;
      }
    },
  },

  uploading: {
    label: "Uploading", blurb: "A cloud with an arrow lifting into it.", accent: TEAL,
    shape: (p, t, g) => {
      const [a, b, c] = p.r;
      let u: number;
      if ((u = slot(p.k, 0, 0.6)) >= 0) {
        const B = [[-0.75, 0.55, 0.62], [0.05, 0.95, 0.82], [0.85, 0.6, 0.6], [0, 0.45, 0.7]];
        const [x, y, r] = B[floor(c * B.length)];
        onSphere(p.out, a, b, r, 0.5);
        p.c = abs(p.out.z) < 0.08 * r ? "#7E8B98" : "#FFFFFF";
        p.s = 1.3;
        p.out.add(new THREE.Vector3(x, y, 0));
        if (p.out.y < 0.12) { p.out.y = 0.12 + (p.out.y - 0.12) * 0.15; if (p.out.y < 0.1) p.c = "#7E8B98"; }
      } else if ((u = slot(p.k, 0.6, 0.88)) >= 0) {
        const lift = frac(t / 2.2), y0 = -1.7 + smooth(lift) * 0.5;
        let x: number, y: number;
        if (a < 0.55) { x = (b - 0.5) * 0.36; y = y0 + c * 0.95; }
        else { const h = c, half = (1 - h) * 0.55; x = (b - 0.5) * 2 * half; y = y0 + 0.95 + h * 0.62; }
        p.out.set(x, y, 0.5);
        p.c = g.hat;
      } else {
        const q = frac(a + t * 0.45);
        p.out.set((b - 0.5) * 1.6, -2 + q * 2.4, 0.45 + (c - 0.5) * 0.3);
        p.s = sin(q * PI) * 0.7; p.c = TEAL;
      }
    },
  },

  bouncing: {
    label: "Bouncing", blurb: "Rolls into a beach ball and bounces.", accent: RED,
    shape: (p, t) => {
      const [a, b, c] = p.r;
      const h = abs(sin(t * 3)), squash = 1 - 0.3 * (1 - h) ** 6;
      if (p.k < 0.88) {
        const v = onSphere(new THREE.Vector3(), a, b, 0.85);
        const lon = frac(Math.atan2(v.z, v.x) / TAU + 0.5);
        p.c = abs(v.y) > 0.78 ? "#F5F2EA" : ["#D8402F", "#F5F2EA", "#2F6FD6", "#F2C230", "#F5F2EA", "#3E9B4F"][floor(lon * 6)];
        v.applyAxisAngle(Z, -t * 2).applyAxisAngle(X, 0.3);
        p.out.set(v.x / sqrt(squash), -1.35 + 2.6 * h + v.y * squash, v.z);
      } else {
        const th = a * TAU, rr = sqrt(b) * (0.45 + 0.6 * (1 - h));
        p.out.set(cos(th) * rr, -2.17, sin(th) * rr * 0.5); p.s = 0.6; p.c = INK;
      }
    },
  },

  alerting: {
    label: "Alerting", blurb: "A swinging bell ringing out.", accent: RED,
    shape: (p, t) => {
      const [a, b, c] = p.r;
      const swing = sin(t * 7) * 0.3, pivot = new THREE.Vector3(0, 1.45, 0);
      const ring = (v: THREE.Vector3, k = 1) => v.sub(pivot).applyAxisAngle(Z, swing * k).add(pivot);
      let u: number;
      if ((u = slot(p.k, 0, 0.66)) >= 0) {
        const s = b; // 0 top .. 1 lip
        const r = 0.22 + 0.42 * pow(s, 0.6) + 0.55 * pow(s, 4);
        p.out.set(cos(a * TAU) * r, 1.15 - s * 2.15, sin(a * TAU) * r);
        ring(p.out);
        p.c = s > 0.93 ? shadeHex(GOLD, 0.8) : GOLD;
      } else if ((u = slot(p.k, 0.66, 0.72)) >= 0) {
        const th = a * TAU; p.out.set(cos(th) * 0.16, 1.32 + sin(th) * 0.16, (b - 0.5) * 0.08); ring(p.out); p.c = shadeHex(GOLD, 0.8);
      } else if ((u = slot(p.k, 0.72, 0.8)) >= 0) {
        onSphere(p.out, a, b, 0.2).add(new THREE.Vector3(0, -1.2, 0)); ring(p.out, 1.5); p.c = INK;
      } else {
        const side = a < 0.5 ? -1 : 1, arc = floor(b * 2), R = 1.45 + arc * 0.35, th = (c - 0.5) * 1.0;
        const on = max(0, sin(t * 7 * 2 + arc)) * (side * swing > 0 ? 1 : 0.3);
        p.out.set(side * cos(th) * R, 0.1 + sin(th) * R, 0.2); p.c = RED; p.s = on;
      }
    },
  },

  "powering-down": {
    label: "Powering down", blurb: "A power symbol that dims and blinks off.", accent: "#9DA48E",
    shape: (p, t) => {
      const [a, b] = p.r;
      const q = frac(t / 5), dim = smooth((q - 0.25) / 0.45);
      const blink = q > 0.75 && q < 0.9 ? (sin(t * 40) > 0 ? 1 : 0.15) : 1;
      const off = q > 0.9;
      if (p.k < 0.72) {
        const th = PI / 2 + 0.6 + a * (TAU - 1.2), R = 1.15 + (b - 0.5) * 0.24;
        p.out.set(cos(th) * R, 0.2 + sin(th) * R, (b - 0.5) * 0.1);
      } else p.out.set((a - 0.5) * 0.24, 0.35 + b * 1.15, 0.05);
      p.out.multiplyScalar(1 - dim * 0.12);
      p.c = dim > 0.5 ? "#5E6552" : TEAL;
      p.s = off ? 0.25 : blink;
    },
  },
};
export const MORPH_IDS = Object.keys(MORPHS) as MorphId[];

/** Paper-plane point: two wings and a keel; u picks the triangle. */
function planePoint(u: number, a: number, b: number, scale: number) {
  const tri = u < 0.33 ? 0 : u < 0.66 ? 1 : 2;
  if (a + b > 1) { a = 1 - a; b = 1 - b; }
  const N = new THREE.Vector3(1, 0, 0), BC = new THREE.Vector3(-0.8, 0, 0);
  const corner = [new THREE.Vector3(-0.8, 0.06, 0.85), new THREE.Vector3(-0.8, 0.06, -0.85), new THREE.Vector3(-0.8, -0.38, 0)][tri];
  return N.multiplyScalar(1 - a - b).add(corner.multiplyScalar(a)).add(BC.multiplyScalar(b)).multiplyScalar(scale);
}

const N = 2600;
const DOT = 0.042; // world-size of one dot

const vert = /* glsl */ `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float uScale;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const frag = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    if (dot(d, d) > 0.25) discard;
    gl_FragColor = vec4(vColor, 1.0);
    #include <colorspace_fragment>
  }`;

export type SpellStyle = "dots" | "solid";
export interface MorphOptions { circle?: boolean; style?: SpellStyle }

export class Morpher {
  /** Show the glowing rune circle under the spell. */
  circle: boolean;
  /** "dots" keeps the formed object as fine dots; "solid" settles it into toon meshes like the goblins. */
  style: SpellStyle;
  private solids = new Map<MorphId, Solid>();
  private solidOn = 0;
  private group = new THREE.Group();
  private dots: THREE.Points;
  private posAttr: THREE.BufferAttribute;
  private colAttr: THREE.BufferAttribute;
  private sizeAttr: THREE.BufferAttribute;
  private stars: THREE.InstancedMesh;
  private ring = new THREE.Group();
  private src: THREE.Vector3[] = [];
  private srcColor: THREE.Color[] = [];
  private pos: THREE.Vector3[] = [];
  private ps: Particle[] = [];
  private palette: Palette;
  private id: MorphId | null = null;
  private shown: MorphId | null = null;
  private m = 0;
  private ringOn = 0;
  private xfade = 1; // 0..1 while morphing straight from one spell to another
  private fromPos = new Float32Array(N * 3);
  private fromCol = new Float32Array(N * 3);
  private fromSize = new Float32Array(N);
  private last = 0;
  private dummy = new THREE.Object3D();
  private col = new THREE.Color();
  private tmp = new THREE.Color();
  private runeMat: THREE.MeshBasicMaterial;

  constructor(private rig: Rig, goblin: Goblin, opts: MorphOptions = {}) {
    this.circle = opts.circle ?? true;
    this.style = opts.style ?? "dots";
    this.palette = { skin: goblin.skin, hat: goblin.hat === "none" ? goblin.skin : goblin.hatColor, beard: goblin.beard === "none" ? goblin.skin : goblin.beardColor, scarf: goblin.scarfColor };
    rig.root.add(this.group);

    // sample the goblin's own surface, in root space, with its colors
    rig.root.updateMatrixWorld(true);
    const inv = rig.root.matrixWorld.clone().invert();
    const pool: { v: THREE.Vector3; c: THREE.Color }[] = [];
    rig.head.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.material === kit.OUTLINE || !o.visible) return;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (!mat.color || mat.transparent) return;
      const pa = mesh.geometry.attributes.position;
      const step = max(1, floor(pa.count / 260));
      for (let i = 0; i < pa.count; i += step) pool.push({ v: new THREE.Vector3().fromBufferAttribute(pa, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv), c: mat.color });
    });
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const picks = Array.from({ length: N }, () => pool[floor(rnd() * pool.length)]);
    picks.sort((x, y) => x.v.y - y.v.y);
    picks.forEach((s, i) => {
      const jitter = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.05);
      this.src.push(s.v.clone().add(jitter));
      this.srcColor.push(s.c.clone());
      this.pos.push(s.v.clone());
      this.ps.push({ k: i / N, r: [rnd(), rnd(), rnd(), rnd()], out: new THREE.Vector3(), s: 1, c: null });
    });

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(N * 3), 3);
    this.colAttr = new THREE.BufferAttribute(new Float32Array(N * 3), 3);
    this.sizeAttr = new THREE.BufferAttribute(new Float32Array(N), 1);
    geo.setAttribute("position", this.posAttr);
    geo.setAttribute("color", this.colAttr);
    geo.setAttribute("size", this.sizeAttr);
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: { uScale: { value: 500 } } });
    this.dots = new THREE.Points(geo, mat);
    this.dots.frustumCulled = false;
    const sizeV = new THREE.Vector2();
    this.dots.onBeforeRender = (renderer, _s, camera) => {
      const fov = (camera as THREE.PerspectiveCamera).fov ?? 30;
      renderer.getDrawingBufferSize(sizeV);
      mat.uniforms.uScale.value = sizeV.y / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
    };
    this.group.add(this.dots);

    const star = new THREE.OctahedronGeometry(0.06);
    star.scale(0.5, 1.6, 0.4);
    this.stars = new THREE.InstancedMesh(star, new THREE.MeshBasicMaterial({ color: GOLD }), 32);
    this.stars.frustumCulled = false;
    this.group.add(this.stars);

    // rune circle under the feet
    this.runeMat = new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide });
    const band = (r1: number, r2: number) => this.ring.add(new THREE.Mesh(new THREE.RingGeometry(r1, r2, 64), this.runeMat));
    band(1.55, 1.62); band(1.12, 1.16); band(0.5, 0.53);
    for (let i = 0; i < 16; i++) {
      const th = (i / 16) * TAU;
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(i % 2 ? 0.06 : 0.14, i % 2 ? 0.2 : 0.1), this.runeMat);
      rune.position.set(cos(th) * 1.38, sin(th) * 1.38, 0);
      rune.rotation.z = th;
      this.ring.add(rune);
    }
    for (let i = 0; i < 6; i++) {
      const th = (i / 6) * TAU + PI / 6;
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.92, 0.03), this.runeMat);
      bar.position.set(cos(th) * 0.56, sin(th) * 0.56, 0);
      bar.rotation.z = th + PI / 2;
      this.ring.add(bar);
    }
    this.ring.rotation.x = -PI / 2;
    this.ring.position.y = -2.2;
    this.group.add(this.ring);
    this.group.visible = false;
  }

  set(id: MorphId | null) { this.id = id; }

  /** Call after animate() each frame. */
  update(t: number) {
    const dt = min(0.05, max(0, t - this.last));
    this.last = t;
    // spell to spell: the dots flow straight into the new object, no goblin in between
    if (this.id && this.shown && this.id !== this.shown && this.m > 0.05) {
      this.fromPos.set(this.posAttr.array as Float32Array);
      this.fromCol.set(this.colAttr.array as Float32Array);
      this.fromSize.set(this.sizeAttr.array as Float32Array);
      // a solid object breaks back into dots before flowing to the next one
      if (this.solidOn > 0.05) for (let i = 0; i < N; i++) this.fromSize[i] = max(this.fromSize[i], DOT * this.ps[i].s);
      this.shown = this.id;
      this.xfade = 0;
    }
    this.xfade = min(1, this.xfade + dt / 1.2);
    this.m = clamp01(this.m + ((this.id ? 1 : -1) * dt) / 1.1);
    if (this.m === 0) this.shown = this.id;
    if (this.id && this.shown === null) this.shown = this.id;
    const m = this.m;

    const rig = this.rig;
    const hide = smooth(m * 1.6);
    rig.head.scale.multiplyScalar(1 - hide);
    rig.head.visible = hide < 0.99;
    rig.hands.forEach((h) => h.scale.setScalar(1 - hide));
    if (m > 0.02) Object.values(rig.props).forEach((g) => (g.visible = false));
    if (m === 0 && this.id === null) { if (this.group.visible) rig.state.expr = ""; this.group.visible = false; return; }
    this.group.visible = true;

    const def = this.shown ? MORPHS[this.shown] : null;
    this.runeMat.color.set(def?.accent ?? GOLD);
    this.ringOn += ((this.circle ? 1 : 0) - this.ringOn) * 0.12;
    const cs = smooth(m) * this.ringOn;
    this.ring.scale.setScalar(0.2 + cs * 0.8);
    this.ring.rotation.z = t * 0.6;
    this.ring.visible = cs > 0.02;

    // solid mode: once formed, the dots settle into the toon object
    const formed = smooth((m - 0.86) / 0.14) * smooth((this.xfade - 0.82) / 0.18);
    this.solidOn += ((this.style === "solid" ? formed : 0) - this.solidOn) * 0.18;
    if (this.style === "solid" && this.shown && !this.solids.has(this.shown)) {
      const solid = SOLIDS[this.shown](this.palette);
      solid.group.visible = false;
      this.group.add(solid.group);
      this.solids.set(this.shown, solid);
    }
    for (const [id, solid] of this.solids) {
      const on = id === this.shown && this.solidOn > 0.01;
      solid.group.visible = on;
      if (!on) continue;
      solid.update(t);
      const k = smooth(this.solidOn);
      solid.group.scale.setScalar(0.6 + 0.4 * k + sin(k * PI) * 0.08);
    }
    const dotFade = 1 - smooth(this.solidOn * 1.3);

    const pa = this.posAttr.array as Float32Array, ca = this.colAttr.array as Float32Array, sa = this.sizeAttr.array as Float32Array;
    for (let i = 0; i < N; i++) {
      const p = this.ps[i];
      p.s = 1; p.c = null;
      if (def) def.shape(p, t, this.palette);
      // staggered: the top of the goblin lifts off first
      const delay = (1 - p.k) * 0.45;
      const e = smooth((m - delay * (1 - m)) / (1 - delay * 0.5));
      const v = this.pos[i].copy(this.src[i]).lerp(p.out, e);
      const swirl = sin(e * PI);
      if (swirl > 0.001) {
        v.applyAxisAngle(Y, swirl * (1.2 + p.r[0] * 2.5));
        v.y += swirl * (0.4 + p.r[1] * 0.8);
      }
      // dots start goblin-sized and settle to fine grain
      let size = DOT * (1 + (1 - e) * 1.6) * (e > 0.5 ? p.s : 1);
      this.col.copy(this.srcColor[i]);
      if (p.c) this.col.lerp(this.tmp.set(p.c), e);
      // depth shading: back of the object a touch darker
      this.col.multiplyScalar(1 - e * 0.28 * (1 - clamp01((p.out.z + 1.2) / 2.4)));
      if (this.xfade < 1) {
        const x = smooth((this.xfade - p.r[3] * 0.35) / 0.65), arc = sin(x * PI);
        const fx = this.fromPos[i * 3], fy = this.fromPos[i * 3 + 1], fz = this.fromPos[i * 3 + 2];
        v.set(fx + (v.x - fx) * x, fy + (v.y - fy) * x + arc * (0.3 + p.r[0] * 0.5), fz + (v.z - fz) * x);
        v.applyAxisAngle(Y, arc * (p.r[1] - 0.5) * 1.5);
        this.col.setRGB(this.fromCol[i * 3] + (this.col.r - this.fromCol[i * 3]) * x, this.fromCol[i * 3 + 1] + (this.col.g - this.fromCol[i * 3 + 1]) * x, this.fromCol[i * 3 + 2] + (this.col.b - this.fromCol[i * 3 + 2]) * x);
        const fs = this.fromSize[i] || DOT;
        size = (fs + (size - fs) * x) * (1 + arc * 0.4);
      }
      pa[i * 3] = v.x; pa[i * 3 + 1] = v.y; pa[i * 3 + 2] = v.z;
      sa[i] = size * dotFade;
      ca[i * 3] = this.col.r; ca[i * 3 + 1] = this.col.g; ca[i * 3 + 2] = this.col.b;
    }
    this.posAttr.needsUpdate = this.colAttr.needsUpdate = this.sizeAttr.needsUpdate = true;

    // twinkles riding the swarm, mostly mid-flight
    const flare = 0.25 + sin(m * PI) * 1.4 + sin(this.xfade * PI) * 1.2;
    for (let j = 0; j < 32; j++) {
      const idx = (j * 83) % N, v = this.pos[idx], r = this.ps[idx].r;
      const tw = max(0, sin(t * 4 + j * 1.7));
      this.dummy.position.set(v.x + (r[2] - 0.5) * 0.5, v.y + (r[0] - 0.5) * 0.5, v.z + 0.15);
      this.dummy.rotation.set(0, 0, t * 2 + j);
      this.dummy.scale.setScalar(m * tw * flare);
      this.dummy.updateMatrix();
      this.stars.setMatrixAt(j, this.dummy.matrix);
    }
    this.stars.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.rig.root.remove(this.group);
    this.dots.geometry.dispose();
    (this.dots.material as THREE.Material).dispose();
    this.stars.geometry.dispose();
    this.ring.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    for (const s of this.solids.values()) s.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  }
}
