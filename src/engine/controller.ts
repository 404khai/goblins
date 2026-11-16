import * as THREE from "three";
import { buildGoblin, disposeRig, type Rig } from "../goblin/build";
import { animate } from "../goblin/expressions";
import { fromJSON } from "../goblin/export";
import { Morpher, type SpellStyle } from "../goblin/morph";
import type { MorphId } from "../goblin/spells";
import type { ExpressionId, Goblin } from "../goblin/types";
import { isExpressionId, isGesture, isMorphId, normalizeSequence, type Gesture, type SequenceInput, type SequenceStep } from "../goblin/validate";
import { makeRenderer, register, unregister, wake, type Drawable } from "./pool";

export interface GoblinOptions {
  /** The recipe. Partial recipes are filled in the same lenient way as fromJSON. */
  goblin: Partial<Goblin> | Goblin;
  /** CSS pixels, square. Default 96. */
  size?: number;
  framing?: "head" | "full";
  expression?: ExpressionId;
  morph?: MorphId | null;
  /** Eyes and head follow the pointer anywhere on the page. Default true. */
  followPointer?: boolean;
  paused?: boolean;
  /** Stop drawing after this long with nothing new (no calls, no sequence, no gesture). 0 = never. */
  settleAfterMs?: number;
  /** One settled pose that still reacts to changes. Default: the viewer's prefers-reduced-motion. */
  reducedMotion?: boolean;
  /** "shared" (default) draws through the page's single WebGL renderer; "own" gets a context. */
  renderer?: "shared" | "own";
  /** Rune circle under spells. Default true. */
  circle?: boolean;
  spellStyle?: SpellStyle;
}

export interface GoblinSnapshot { expression: ExpressionId; morph: MorphId | null; playing: boolean }
export type GoblinEvent = "statechange" | "morphdone" | "ready";
export interface GoblinEventDetail {
  statechange: GoblinSnapshot;
  morphdone: { morph: MorphId | null };
  ready: { id: string };
}

export interface GoblinController {
  readonly id: string;
  readonly element: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  setExpression(id: ExpressionId | string): boolean;
  cast(morph: MorphId | string | null): boolean;
  play(sequence: SequenceInput, opts?: { loop?: boolean }): boolean;
  stop(): boolean;
  poke(gesture: Gesture | string): boolean;
  lookAt(target: [number, number] | null): boolean;
  setGoblin(goblin: Partial<Goblin>): boolean;
  setSize(px: number): boolean;
  pause(): boolean;
  resume(): boolean;
  snapshot(): GoblinSnapshot;
  on<E extends GoblinEvent>(type: E, cb: (detail: GoblinEventDetail[E]) => void): () => void;
  destroy(): void;
}

// one pointer listener for the whole page
const pointer = { x: 0, y: 0, seen: false, at: 0 };
let pointerBound = false;
function bindPointer() {
  if (pointerBound || typeof window === "undefined") return;
  pointerBound = true;
  window.addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.seen = true; pointer.at = performance.now(); }, { passive: true });
}

const prefersReduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const smooth = (x: number) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const GESTURE_MS: Record<Gesture, number> = { bounce: 650, nod: 700, spin: 900 };
const REDUCED_SETTLE_MS = 1600;

function recipe(g: Partial<Goblin>): Goblin | null {
  try { return fromJSON(JSON.stringify(g))[0] ?? null; } catch { return null; }
}

/**
 * Mounts a live 3D goblin into `el` and returns a controller. Every method validates its input
 * and returns false (never throws) for unknown names or after destroy().
 */
export function createGoblin(el: HTMLElement, options: GoblinOptions): GoblinController {
  bindPointer();
  let goblin = recipe(options.goblin) ?? recipe({})!;
  let px = clampSize(options.size ?? 96);
  const framing = options.framing ?? "full";
  const mode = options.renderer ?? "shared";
  let reduce = options.reducedMotion ?? prefersReduced();
  let followPointer = options.followPointer ?? true;
  let settleAfter = Math.max(0, options.settleAfterMs ?? 0);
  let circle = options.circle ?? true;
  const spellStyle = options.spellStyle ?? "dots";

  let expression: ExpressionId = isExpressionId(options.expression) ? options.expression : isExpressionId(goblin.expression) ? goblin.expression : "idle";
  let morph: MorphId | null = options.morph !== undefined ? (isMorphId(options.morph) ? options.morph : null) : goblin.morph ?? null;
  let paused = !!options.paused;
  let destroyed = false;
  let look: [number, number] | null = null;
  let seq: { steps: SequenceStep[]; loop: boolean; i: number; left: number } | null = null;
  let gesture: { kind: Gesture; t: number } | null = null;
  let clock = 0;
  let lastActivity = performance.now();
  let lastPointerSeen = 0;
  let readyFired = false;
  // last spell transition reported through morphdone ("off" = back to a goblin)
  let morphDone: string | null = null;

  const listeners: { [K in GoblinEvent]: Set<(d: GoblinEventDetail[K]) => void> } = { statechange: new Set(), morphdone: new Set(), ready: new Set() };
  const emit = <E extends GoblinEvent>(type: E, detail: GoblinEventDetail[E]) => {
    for (const cb of listeners[type]) { try { cb(detail); } catch (err) { console.error(err); } }
  };
  const snapshot = (): GoblinSnapshot => ({ expression, morph, playing: !!seq });
  const changed = () => { lastActivity = performance.now(); wake(); emit("statechange", snapshot()); };
  const touch = () => { lastActivity = performance.now(); wake(); };

  // scene
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `display:block;width:${px}px;height:${px}px`;
  canvas.setAttribute("role", "img");
  el.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(4, 6, 8);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const head = framing === "head";
  camera.position.set(0, head ? 0.6 : 0.4, head ? 10.5 : 13);
  camera.lookAt(0, head ? 0.25 : 0.2, 0);

  let rig: Rig;
  let morpher: Morpher | null = null;
  const mount = () => {
    rig = buildGoblin(goblin);
    rig.ring.visible = false;
    scene.add(rig.root);
    canvas.setAttribute("aria-label", `${goblin.name}, ${expression}`);
  };
  const unmount = () => {
    morpher?.dispose();
    morpher = null;
    scene.remove(rig.root);
    disposeRig(rig);
  };
  mount();

  const rel = new THREE.Vector2();
  const drawable: Drawable = {
    canvas, scene, camera, px, mode, visible: false,
    own: mode === "own" ? makeRenderer(canvas) : undefined,
    tick(now, dt) {
      if (destroyed || paused) return false;
      if (followPointer && !reduce && pointer.at !== lastPointerSeen) { lastPointerSeen = pointer.at; lastActivity = now; }
      const busy = !!seq || !!gesture;
      if (reduce) { if (!busy && now - lastActivity > REDUCED_SETTLE_MS && readyFired) return false; }
      else if (settleAfter > 0 && !busy && now - lastActivity > settleAfter && readyFired) return false;
      // animation advances at most a quarter second per frame; sequences use real time
      clock += Math.min(dt, 0.25);

      // sequence
      if (seq) {
        seq.left -= dt * 1000;
        if (seq.left <= 0) {
          seq.i++;
          if (seq.i >= seq.steps.length) {
            if (seq.loop) seq.i = 0;
            else { seq = null; changed(); }
          }
          if (seq) applyStep(seq.steps[seq.i]);
        }
      }

      // where to look: explicit target, else the pointer relative to this goblin
      if (look) rel.set(look[0], look[1]);
      else if (followPointer && !reduce && pointer.seen) {
        const r = canvas.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2, span = Math.max(240, r.width * 3);
        rel.set(THREE.MathUtils.clamp((pointer.x - cx) / span, -1, 1), THREE.MathUtils.clamp(-(pointer.y - cy) / span, -1, 1));
      } else rel.set(0, 0);

      animate(rig, expression, clock, rel, reduce);
      if (morph && !morpher) { morpher = new Morpher(rig, goblin, { circle, style: spellStyle }); morphDone = null; }
      if (morpher) {
        morpher.circle = circle;
        morpher.freeze = reduce ? 0 : null;
        morpher.set(morph);
        morpher.update(clock);
        const p = morpher.progress;
        const key = morph ? (p.m >= 1 && p.xfade >= 1 && p.shown === morph ? morph : null) : p.m <= 0 ? "off" : null;
        if (key && key !== morphDone) { morphDone = key; emit("morphdone", { morph }); }
        if (p.m > 0 && p.m < 1 || p.xfade < 1) lastActivity = now; // keep drawing until a spell lands
      }

      // gestures layer on top of the expression
      rig.root.position.y = 0;
      rig.root.rotation.y = 0;
      if (gesture) {
        const k = (now - gesture.t) / GESTURE_MS[gesture.kind];
        if (k >= 1) { gesture = null; lastActivity = now; }
        else if (gesture.kind === "bounce") rig.root.position.y = Math.sin(Math.PI * k) * 0.55;
        else if (gesture.kind === "nod") rig.head.rotation.x += Math.sin(k * Math.PI * 2) * 0.3 * (1 - k);
        else rig.root.rotation.y = smooth(k) * Math.PI * 2;
      }
      return true;
    },
    drawn() {
      if (!readyFired) { readyFired = true; emit("ready", { id: goblin.id }); }
    },
  };
  register(drawable);

  function applyStep(step: SequenceStep) {
    if (seq) seq.left = step.ms;
    let any = false;
    if (step.expression && step.expression !== expression) { expression = step.expression; any = true; }
    if (step.morph !== undefined && step.morph !== morph) { morph = step.morph; any = true; }
    if (any) changed(); else touch();
  }

  const alive = () => !destroyed;
  const ctl: GoblinController = {
    get id() { return goblin.id; },
    element: el,
    canvas,
    setExpression(id) {
      if (!alive() || !isExpressionId(id)) return false;
      if (id !== expression) { expression = id; canvas.setAttribute("aria-label", `${goblin.name}, ${expression}`); changed(); } else touch();
      return true;
    },
    cast(id) {
      if (!alive() || (id !== null && !isMorphId(id))) return false;
      if (id !== morph) { morph = id; changed(); } else touch();
      return true;
    },
    play(sequence, opts = {}) {
      if (!alive()) return false;
      const steps = normalizeSequence(sequence);
      if (!steps) return false;
      seq = { steps, loop: !!opts.loop, i: 0, left: steps[0].ms };
      applyStep(steps[0]);
      changed();
      return true;
    },
    stop() {
      if (!alive()) return false;
      if (seq) { seq = null; changed(); }
      return true;
    },
    poke(g) {
      if (!alive() || !isGesture(g)) return false;
      gesture = { kind: g, t: performance.now() };
      touch();
      return true;
    },
    lookAt(target) {
      if (!alive()) return false;
      if (target === null) { look = null; touch(); return true; }
      if (!Array.isArray(target) || target.length !== 2 || !target.every((n) => typeof n === "number" && Number.isFinite(n))) return false;
      look = [THREE.MathUtils.clamp(target[0], -1, 1), THREE.MathUtils.clamp(target[1], -1, 1)];
      touch();
      return true;
    },
    setGoblin(next) {
      if (!alive() || !next || typeof next !== "object") return false;
      const g = recipe(next);
      if (!g) return false;
      const keep = goblin.id;
      unmount();
      goblin = { ...g, id: typeof next.id === "string" ? g.id : keep };
      mount();
      touch();
      return true;
    },
    setSize(size) {
      if (!alive() || typeof size !== "number" || !Number.isFinite(size)) return false;
      px = clampSize(size);
      drawable.px = px;
      canvas.style.width = canvas.style.height = `${px}px`;
      touch();
      return true;
    },
    pause() { if (!alive()) return false; paused = true; return true; },
    resume() { if (!alive()) return false; paused = false; touch(); return true; },
    snapshot,
    on(type, cb) {
      if (!listeners[type] || typeof cb !== "function") return () => {};
      listeners[type].add(cb as never);
      return () => listeners[type].delete(cb as never);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unregister(drawable);
      unmount();
      canvas.remove();
      for (const s of Object.values(listeners)) s.clear();
    },
  };
  // options the host may flip later through the element
  Object.defineProperty(ctl, "_set", { value: (o: { circle?: boolean; followPointer?: boolean; reducedMotion?: boolean; settleAfterMs?: number }) => {
    if (o.circle !== undefined) circle = o.circle;
    if (o.followPointer !== undefined) followPointer = o.followPointer;
    if (o.reducedMotion !== undefined) reduce = o.reducedMotion;
    if (o.settleAfterMs !== undefined) settleAfter = Math.max(0, o.settleAfterMs);
    touch();
  } });
  return ctl;
}

function clampSize(n: number) { return Math.max(8, Math.min(1024, Math.round(n))); }
