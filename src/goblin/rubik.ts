import * as THREE from "three";

/**
 * A real Rubik's cube routine shared by the dot and solid spells: six face turns scramble it,
 * the same turns undone in reverse solve it, and each turn happens mid-toss. Solved, it gets a
 * big celebratory throw with a spin.
 */

type Axis = "x" | "y" | "z";
const SCRAMBLE: [Axis, number, number][] = [["y", 1, 1], ["x", -1, -1], ["z", 0, 1], ["y", -1, 1], ["x", 1, 1], ["z", 1, -1]];
const MOVES: [Axis, number, number][] = [...SCRAMBLE, ...[...SCRAMBLE].reverse().map(([a, l, d]) => [a, l, -d] as [Axis, number, number])];
const MOVE = 0.75, HOLD = 1.7;
export const RUBIK_CYCLE = MOVES.length * MOVE + HOLD;
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const smooth = (x: number) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const q90 = new THREE.Quaternion();

export interface RubikFrame { done: number; partial: number; toss: number; spin: number; solved: boolean }

export function rubikFrame(t: number): RubikFrame {
  const tau = ((t % RUBIK_CYCLE) + RUBIK_CYCLE) % RUBIK_CYCLE;
  const turns = MOVES.length * MOVE;
  if (tau >= turns) {
    const h = (tau - turns) / HOLD;
    return { done: MOVES.length, partial: 0, toss: Math.sin(Math.PI * h) * 1.1, spin: smooth(h) * Math.PI * 2, solved: true };
  }
  const i = Math.floor(tau / MOVE), q = tau / MOVE - i;
  return { done: i, partial: smooth((q - 0.15) / 0.6), toss: Math.sin(Math.PI * q) * 0.42, spin: 0, solved: false };
}

/**
 * Moves one point (and its cubie centre, which decides layer membership) through the turns so
 * far. `unit` is the spacing between cubie centres. Optionally composes the rotation into `quat`.
 */
export function rubikApply(f: RubikFrame, pos: THREE.Vector3, centre: THREE.Vector3, unit: number, quat?: THREE.Quaternion) {
  const step = (k: number, amount: number) => {
    const [axis, layer, dir] = MOVES[k];
    if (Math.round(centre[axis] / unit) !== layer) return;
    const ang = dir * amount * (Math.PI / 2);
    pos.applyAxisAngle(AX[axis], ang);
    centre.applyAxisAngle(AX[axis], ang);
    if (quat) quat.premultiply(q90.setFromAxisAngle(AX[axis], ang));
  };
  for (let k = 0; k < f.done; k++) step(k, 1);
  if (f.done < MOVES.length && f.partial > 0) step(f.done, f.partial);
}
