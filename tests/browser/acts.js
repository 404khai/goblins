// Visual check: every activity expression live in 3D, one goblin each. Open after build:lib.
import { createGoblin, DEFAULT_CLAN, EXPRESSION_IDS } from "../../dist/goblins.js";
const ids = EXPRESSION_IDS.slice(15).concat(["thinking"]);
const grid = document.getElementById("g");
let ready = 0;
ids.forEach((id, i) => {
  const f = document.createElement("figure");
  grid.appendChild(f);
  const c = createGoblin(f, { goblin: DEFAULT_CLAN[[0, 8, 1, 3, 6, 10, 11, 2, 4, 9, 7, 5, 2, 4, 6, 0][i]], size: 230, expression: id, followPointer: false });
  f.append(Object.assign(document.createElement("figcaption"), { textContent: id }));
  c.on("ready", () => { if (++ready === ids.length) setTimeout(() => (document.title = "READY"), 2500); });
});
