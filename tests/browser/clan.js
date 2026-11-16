// Visual check: the whole default clan live in 3D, plus the new activity expressions. Open after build:lib.
import { createGoblin, DEFAULT_CLAN } from "../../dist/goblins.js";
const extra = [[1, "jotting"], [3, "puzzling"], [13, "angry"]];
const list = [...DEFAULT_CLAN.map((g) => [g, "idle"]), ...extra.map(([i, e]) => [DEFAULT_CLAN[i], e])];
const grid = document.getElementById("g");
let ready = 0;
list.forEach(([g, expression]) => {
  const f = document.createElement("figure");
  grid.appendChild(f);
  const c = createGoblin(f, { goblin: g, size: 230, expression, followPointer: false });
  f.append(Object.assign(document.createElement("figcaption"), { textContent: `${g.name} · ${expression}` }));
  c.on("ready", () => { if (++ready === list.length) setTimeout(() => (document.title = "READY"), 2500); });
});
