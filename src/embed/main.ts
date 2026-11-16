import type { Goblin } from "../goblin/types";
import type { Layout } from "../goblin/validate";
import { createGoblin, type GoblinController } from "../engine/controller";
import { createHost, type OutMessage } from "./protocol";

/**
 * embed.html: a page a host app drives with JSON messages and no code of its own.
 *   in:  window.goblins.receive(msg)            (or window.postMessage from a parent frame)
 *   out: window.webkit.messageHandlers.goblins  (and window.parent.postMessage)
 */

declare global {
  interface Window {
    goblins?: { receive(msg: unknown): void; version: string };
    webkit?: { messageHandlers?: { goblins?: { postMessage(msg: unknown): void } } };
  }
}

const VERSION = __GOBLINS_VERSION__;
const stage = document.getElementById("stage") ?? document.body.appendChild(Object.assign(document.createElement("div"), { id: "stage" }));
const slots = new Map<string, { slot: HTMLDivElement; c: GoblinController }>();

function post(msg: OutMessage) {
  try { window.webkit?.messageHandlers?.goblins?.postMessage(msg); } catch { /* host went away */ }
  if (window.parent !== window) window.parent.postMessage(msg, "*");
}

let mode: Layout = "row";
let order: string[] = [];

function layout(next: Layout, ids: string[]) {
  mode = next;
  order = ids;
  stage.dataset.layout = mode;
  const W = stage.clientWidth || innerWidth, H = stage.clientHeight || innerHeight;
  const n = Math.max(1, ids.length), gap = 8;
  ids.forEach((id, i) => {
    const s = slots.get(id);
    if (!s) return;
    let size: number, x: number, y: number, show = true;
    if (mode === "single") {
      show = i === 0;
      size = Math.min(W, H);
      x = (W - size) / 2; y = (H - size) / 2;
    } else if (mode === "cluster") {
      size = n === 1 ? Math.min(W, H) : Math.min(W, H) * 0.62;
      const ring = (Math.min(W, H) - size) / 2, a = (i / Math.max(1, n - 1)) * Math.PI * 2 - Math.PI / 2;
      const r = i === 0 ? 0 : ring;
      x = W / 2 - size / 2 + Math.cos(a) * r; y = H / 2 - size / 2 + Math.sin(a) * r * 0.7;
      s.slot.style.zIndex = String(i === 0 ? n : n - i);
    } else {
      size = Math.max(16, Math.min(H, (W - gap * (n - 1)) / n));
      const total = size * n + gap * (n - 1);
      x = (W - total) / 2 + i * (size + gap); y = (H - size) / 2;
    }
    s.slot.hidden = !show;
    s.slot.style.transform = `translate(${x}px, ${y}px)`;
    s.c.setSize(size);
    show ? s.c.resume() : s.c.pause();
  });
}

const host = createHost({
  post,
  layout,
  mount(g: Goblin) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.id = g.id;
    slot.tabIndex = 0;
    stage.appendChild(slot);
    const c = createGoblin(slot, { goblin: g, size: 96, framing: "head" });
    const id = g.id;
    const click = () => post({ v: 1, type: "click", id });
    slot.addEventListener("click", click);
    slot.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); click(); } });
    c.on("statechange", (s) => post({ v: 1, type: "state", id, expression: s.expression, morph: s.morph }));
    c.on("morphdone", () => { const s = c.snapshot(); post({ v: 1, type: "state", id, expression: s.expression, morph: s.morph }); });
    slots.set(id, { slot, c });
    return {
      setExpression: (e) => c.setExpression(e),
      cast: (m) => c.cast(m),
      play: (seq, o) => c.play(seq, o),
      poke: (p) => c.poke(p),
      setGoblin: (next) => c.setGoblin(next),
      destroy: () => { c.destroy(); slot.remove(); slots.delete(id); },
    };
  },
});

window.goblins = { receive: (msg) => host.receive(msg), version: VERSION };
window.addEventListener("message", (e) => {
  if (e.source === window.parent && e.data && typeof e.data === "object" && (e.data as { v?: unknown }).v === 1) host.receive(e.data);
});
new ResizeObserver(() => layout(mode, order)).observe(stage);
post({ v: 1, type: "ready" });
