import { createGoblin, rendererStats, type GoblinController } from "../../lib/index";
import { DEFAULT_CLAN, EXPRESSION_IDS, MORPH_IDS, randomGoblin } from "../../lib/flat";
import "./zoo.css";

/**
 * Browser test page: 24 live goblins on one shared WebGL context, each looping through every
 * expression and every spell (offset so the page shows a mix at any moment). The header reports
 * contexts in use, goblins drawn and frame rate; it should read 1 context.
 */

const root = document.getElementById("root")!;
root.innerHTML = `
  <header>
    <h1>Goblins zoo</h1>
    <p>24 live goblins, every expression and spell, one WebGL context.</p>
    <dl id="stats"><div><dt>WebGL contexts</dt><dd id="ctx">…</dd></div><div><dt>Live goblins</dt><dd id="live">…</dd></div><div><dt>Frame rate</dt><dd id="fps">…</dd></div><div><dt>Events</dt><dd id="events">0</dd></div></dl>
    <div class="tools"><button id="pause" type="button">Pause all</button><button id="poke" type="button">Poke all</button><button id="solid" type="button">Solid spells</button></div>
  </header>
  <main id="grid"></main>`;

const grid = document.getElementById("grid")!;
const goblins: GoblinController[] = [];
let events = 0;
const steps = [...EXPRESSION_IDS.map((e) => ({ expression: e, morph: null, ms: 2200 })), ...MORPH_IDS.map((m) => ({ morph: m, ms: 3200 })), { morph: null, ms: 1500 }];

for (let i = 0; i < 24; i++) {
  const g = i < DEFAULT_CLAN.length ? DEFAULT_CLAN[i] : randomGoblin({ id: `zoo${i}`, name: `Zoo ${i + 1}`, expression: "idle" });
  const cell = document.createElement("figure");
  const label = document.createElement("figcaption");
  grid.appendChild(cell);
  const c = createGoblin(cell, { goblin: g, size: 150, framing: "full" });
  cell.appendChild(label);
  const rotate = (i * 5) % steps.length;
  c.play([...steps.slice(rotate), ...steps.slice(0, rotate)], { loop: true });
  const show = () => { const s = c.snapshot(); label.textContent = `${g.name} · ${s.morph ?? s.expression}`; };
  c.on("statechange", () => { events++; show(); });
  c.on("morphdone", () => events++);
  show();
  cell.addEventListener("click", () => c.poke("bounce"));
  goblins.push(c);
}

// unknown names must return false, never throw
console.assert(goblins[0].setExpression("nope") === false && goblins[0].cast("fireball") === false && goblins[0].poke("dance") === false, "validation");

let paused = false, solid = false;
document.getElementById("pause")!.onclick = (e) => { paused = !paused; goblins.forEach((c) => (paused ? c.pause() : c.resume())); (e.target as HTMLElement).textContent = paused ? "Resume all" : "Pause all"; };
document.getElementById("poke")!.onclick = () => goblins.forEach((c, i) => c.poke((["bounce", "nod", "spin"] as const)[i % 3]));
document.getElementById("solid")!.onclick = (e) => {
  solid = !solid;
  goblins.forEach((c, i) => { const snap = c.snapshot(); c.destroy(); const cell = grid.children[i] as HTMLElement; const n = createGoblin(cell, { goblin: i < DEFAULT_CLAN.length ? DEFAULT_CLAN[i] : randomGoblin({ id: `zoo${i}`, name: `Zoo ${i + 1}`, expression: "idle" }), size: 150, spellStyle: solid ? "solid" : "dots" }); cell.insertBefore(n.canvas, cell.firstChild); const rotate = (i * 5) % steps.length; n.play([...steps.slice(rotate), ...steps.slice(0, rotate)], { loop: true }); goblins[i] = n; void snap; });
  (e.target as HTMLElement).textContent = solid ? "Dot spells" : "Solid spells";
};

let frames = 0, t0 = performance.now();
const tick = () => {
  frames++;
  const now = performance.now();
  if (now - t0 > 500) {
    const s = rendererStats();
    document.getElementById("ctx")!.textContent = String(s.contexts);
    document.getElementById("live")!.textContent = String(s.goblins);
    document.getElementById("fps")!.textContent = `${Math.round((frames * 1000) / (now - t0))} fps`;
    document.getElementById("events")!.textContent = String(events);
    frames = 0; t0 = now;
  }
  requestAnimationFrame(tick);
};
tick();
