import * as THREE from "three";

/**
 * The WebGL budget. Every goblin on a page is drawn by one shared WebGLRenderer on an offscreen
 * canvas: each frame, a goblin's scene renders into a viewport tile, and the tile is copied into
 * that goblin's own 2D canvas. Pages can hold dozens of live goblins with one WebGL context.
 * Goblins asked for with renderer: "own" get their own context instead.
 *
 * One requestAnimationFrame loop drives everything. Goblins that are off screen, paused or
 * settled are skipped, so a page full of idle goblins costs nothing.
 */

export interface Drawable {
  /** Canvas this goblin shows in: 2D for shared, WebGL for own. */
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  camera: THREE.Camera;
  /** Size in CSS pixels (square). */
  px: number;
  mode: "shared" | "own";
  visible: boolean;
  /** Advance animation; return false to skip drawing this frame (paused, settled). */
  tick(now: number, dt: number): boolean;
  /** Called after the first successful draw. */
  drawn(): void;
  own?: THREE.WebGLRenderer;
  ctx?: CanvasRenderingContext2D | null;
}

const items = new Set<Drawable>();
let shared: THREE.WebGLRenderer | null = null;
let sharedW = 0, sharedH = 0;
let raf = 0;
let last = 0;
let io: IntersectionObserver | null = null;
const byCanvas = new WeakMap<Element, Drawable>();
let ownContexts = 0;

const dpr = () => Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 2);

export function makeRenderer(canvas?: HTMLCanvasElement) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !canvas, powerPreference: "low-power" });
  r.setClearColor(0x000000, 0);
  return r;
}

const MAX_ATLAS = 4096;

function sharedRenderer(w: number, h: number) {
  if (!shared) shared = makeRenderer();
  if (w > sharedW || h > sharedH) {
    sharedW = Math.min(MAX_ATLAS, Math.max(sharedW, Math.ceil(w / 256) * 256));
    sharedH = Math.min(MAX_ATLAS, Math.max(sharedH, Math.ceil(h / 256) * 256));
    shared.setPixelRatio(1);
    shared.setSize(sharedW, sharedH, false);
  }
  return shared;
}

function observer() {
  if (io || typeof IntersectionObserver === "undefined") return io;
  io = new IntersectionObserver((entries) => {
    for (const e of entries) { const d = byCanvas.get(e.target); if (d) d.visible = e.isIntersecting; }
  }, { rootMargin: "64px" });
  return io;
}

export function register(d: Drawable) {
  items.add(d);
  byCanvas.set(d.canvas, d);
  const o = observer();
  if (o) o.observe(d.canvas);
  else d.visible = true;
  if (d.mode === "own") ownContexts++;
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
}

export function unregister(d: Drawable) {
  items.delete(d);
  io?.unobserve(d.canvas);
  if (d.mode === "own") { ownContexts--; d.own?.dispose(); }
  if (items.size === 0) {
    cancelAnimationFrame(raf);
    raf = 0;
    shared?.dispose();
    shared?.forceContextLoss();
    shared = null;
    sharedW = sharedH = 0;
  }
}

/** Ask for a frame soon (after a change while settled). */
export function wake() {
  if (!raf && items.size) { last = performance.now(); raf = requestAnimationFrame(loop); }
}

function loop(now: number) {
  raf = requestAnimationFrame(loop);
  // real elapsed time (capped at 1s) so sequences keep time even when frames are slow
  const dt = Math.min(1, (now - last) / 1000);
  last = now;
  if (typeof document !== "undefined" && document.hidden) return;
  const batch: Drawable[] = [];
  for (const d of items) {
    if (!d.visible || !d.tick(now, dt)) continue;
    if (d.mode === "own") drawOwn(d);
    else batch.push(d);
  }
  if (batch.length) drawShared(batch);
}

function drawOwn(d: Drawable) {
  if (!d.own) return;
  const px = Math.max(1, Math.round(d.px * dpr()));
  if (d.canvas.width !== px) { d.own.setPixelRatio(1); d.own.setSize(px, px, false); }
  d.own.render(d.scene, d.camera);
  d.drawn();
}

/**
 * Shared goblins render into tiles of one atlas, then each tile is copied to its goblin's 2D
 * canvas. All renders happen before any copy, so the GPU is read back once per batch, not once
 * per goblin.
 */
function drawShared(batch: Drawable[]) {
  const ratio = dpr();
  let i = 0;
  while (i < batch.length) {
    // pack a shelf-layout batch that fits the atlas
    const placed: { d: Drawable; x: number; y: number; px: number }[] = [];
    let x = 0, y = 0, rowH = 0, usedW = 0;
    for (; i < batch.length; i++) {
      const px = Math.max(1, Math.min(MAX_ATLAS, Math.round(batch[i].px * ratio)));
      if (x + px > MAX_ATLAS) { x = 0; y += rowH; rowH = 0; }
      if (y + px > MAX_ATLAS) break;
      placed.push({ d: batch[i], x, y, px });
      x += px; rowH = Math.max(rowH, px); usedW = Math.max(usedW, x);
    }
    if (!placed.length) { i++; continue; }
    const r = sharedRenderer(usedW, y + rowH);
    r.setScissorTest(true);
    for (const t of placed) {
      // GL counts y from the bottom
      const gy = sharedH - t.y - t.px;
      r.setViewport(t.x, gy, t.px, t.px);
      r.setScissor(t.x, gy, t.px, t.px);
      r.clear();
      r.render(t.d.scene, t.d.camera);
    }
    for (const t of placed) {
      const d = t.d;
      if (d.canvas.width !== t.px) { d.canvas.width = t.px; d.canvas.height = t.px; }
      if (!d.ctx) d.ctx = d.canvas.getContext("2d");
      if (!d.ctx) continue;
      d.ctx.clearRect(0, 0, t.px, t.px);
      d.ctx.drawImage(r.domElement, t.x, t.y, t.px, t.px, 0, 0, t.px, t.px);
      d.drawn();
    }
  }
}

/** How many WebGL contexts goblins are using right now, and how many goblins are live. */
export function rendererStats() {
  return { contexts: (shared ? 1 : 0) + ownContexts, goblins: items.size, shared: [...items].filter((d) => d.mode === "shared").length };
}
