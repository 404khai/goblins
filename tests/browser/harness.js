// Browser checks for the embed protocol and <goblin-avatar>. Writes a JSON report into #result.
import { DEFAULT_CLAN, rendererStats } from "../../dist/goblins.js";

const report = { checks: {}, posts: [], events: [] };
const ok = (name, pass, info) => (report.checks[name] = info === undefined ? !!pass : { pass: !!pass, info });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// software WebGL (CI, headless) can take seconds per frame, so wait for things to happen, not for a fixed time
const until = async (cond, ms = 20000) => { const t = performance.now(); while (!cond() && performance.now() - t < ms) await wait(50); return cond(); };
const frame = document.getElementById("embed");
addEventListener("message", (e) => { if (e.source === frame.contentWindow) report.posts.push(e.data); });

await new Promise((r) => (frame.contentWindow?.goblins ? r() : frame.addEventListener("load", r, { once: true })));
await wait(200);
const g = frame.contentWindow.goblins;
ok("embed exposes window.goblins.receive", typeof g?.receive === "function", g?.version);
ok("embed posts ready", report.posts.some((p) => p.type === "ready"));

const recipes = DEFAULT_CLAN.slice(0, 3).map((x, i) => ({ ...x, id: `astrid-${i}`, extraField: "ignored" }));
g.receive({ v: 1, type: "set", goblins: recipes });
g.receive({ v: 1, type: "expression", id: "astrid-0", expression: "thinking" });
g.receive({ v: 1, type: "cast", id: "astrid-1", morph: "writing" });
g.receive({ v: 1, type: "play", id: "astrid-2", sequence: ["happy", { morph: "solving", ms: 400 }], loop: false });
g.receive({ v: 1, type: "poke", id: "astrid-0", gesture: "spin" });
g.receive({ v: 1, type: "layout", mode: "cluster" });
g.receive(JSON.stringify({ v: 1, type: "layout", mode: "row" }));
frame.contentWindow.postMessage({ v: 1, type: "expression", id: "astrid-1", expression: "happy" }, "*");
g.receive({ v: 1, type: "cast", id: "astrid-0", morph: "fireball" });
g.receive({ v: 1, type: "poke", id: "nobody", gesture: "nod" });
g.receive("{broken");
await until(() => report.posts.some((p) => p.type === "state" && p.id === "astrid-2" && p.morph === "solving"));
const doc = frame.contentDocument;
const slot = doc.querySelector('.slot[data-id="astrid-0"]');
slot?.click();
await wait(100);

const states = report.posts.filter((p) => p.type === "state");
ok("set mounts one canvas per goblin", doc.querySelectorAll(".slot canvas").length === 3, doc.querySelectorAll(".slot canvas").length);
ok("state posted for expression change", states.some((s) => s.id === "astrid-0" && s.expression === "thinking"));
ok("state posted for cast", states.some((s) => s.id === "astrid-1" && s.morph === "writing"));
ok("postMessage from parent is accepted", states.some((s) => s.id === "astrid-1" && s.expression === "happy"));
ok("play advances through its steps", states.some((s) => s.id === "astrid-2" && s.morph === "solving"));
ok("click posts click", report.posts.some((p) => p.type === "click" && p.id === "astrid-0"));
const errors = report.posts.filter((p) => p.type === "error");
ok("bad messages are reported as errors", errors.length === 3, errors.map((e) => e.message));
ok("embed uses one WebGL context", frame.contentWindow.document.querySelectorAll("canvas").length === 3);

// custom element
const host = document.getElementById("elements");
host.innerHTML = `
  <goblin-avatar id="a3d" size="72" framing="head" expression="idle" recipe='${JSON.stringify(DEFAULT_CLAN[2]).replace(/'/g, "&#39;")}'></goblin-avatar>
  <goblin-avatar id="asvg" mode="svg" size="72" expression="wink" recipe='{"name":"Snig","hat":"wizard"}'></goblin-avatar>`;
const a3d = document.getElementById("a3d"), asvg = document.getElementById("asvg");
for (const el of [a3d, asvg]) for (const t of ["ready", "statechange", "morphdone"]) el.addEventListener(t, (e) => report.events.push(`${el.id}:${t}:${JSON.stringify(e.detail)}`));
await until(() => report.events.some((e) => e.startsWith("a3d:ready")));
a3d.setAttribute("expression", "surprised");
a3d.setAttribute("morph", "receiving");
asvg.setAttribute("expression", "sad");
await until(() => report.events.some((e) => e.startsWith("a3d:morphdone") && e.includes("receiving")));
a3d.setAttribute("morph", "");
await until(() => report.events.some((e) => e.startsWith("a3d:morphdone") && e.includes('"morph":null')));
ok("element (3d) fires ready", report.events.some((e) => e.startsWith("a3d:ready")));
ok("element observes expression attribute", report.events.some((e) => e.startsWith("a3d:statechange") && e.includes('"surprised"')));
ok("element observes morph attribute and fires morphdone", report.events.some((e) => e.startsWith("a3d:morphdone") && e.includes("receiving")));
ok("morph attribute removal ends the spell", report.events.some((e) => e.startsWith("a3d:morphdone") && e.includes('"morph":null')));
ok("element (svg) renders an svg without WebGL", !!asvg.querySelector("svg") && !asvg.querySelector("canvas"));
ok("element (svg) re-renders on attribute change", report.events.some((e) => e.startsWith("asvg:statechange") && e.includes('"sad"')));
const c = a3d.controller;
ok("unknown ids return false, never throw", [c.setExpression("dance"), c.cast("fireball"), c.poke("wave"), c.play(["nope"]), c.lookAt([1]), c.setSize(NaN)].every((v) => v === false));
ok("known ids return true", [c.setExpression("happy"), c.cast(null), c.poke("nod"), c.lookAt([0.5, 0.2]), c.lookAt(null), c.play(["sad", "writing"], { loop: true })].every((v) => v === true));
ok("snapshot reflects state", JSON.stringify(c.snapshot()) === JSON.stringify({ expression: "sad", morph: null, playing: true }), c.snapshot());
ok("page goblins share one WebGL context", rendererStats().contexts === 1, rendererStats());
c.destroy();
ok("calls after destroy return false", c.setExpression("happy") === false && c.poke("nod") === false);

// reduced motion: one settled pose that stops drawing, but still reacts to setExpression
const rmHost = document.createElement("div");
document.body.appendChild(rmHost);
const { createGoblin } = await import("../../dist/goblins.js");
const rm = createGoblin(rmHost, { goblin: DEFAULT_CLAN[0], size: 64, reducedMotion: true });
let rmReady = false;
rm.on("ready", () => (rmReady = true));
await until(() => rmReady);
const pixels = () => { const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"); x.drawImage(rm.canvas, 0, 0, 32, 32); return x.getImageData(0, 0, 32, 32).data.join(","); };
await wait(2200);
const a1 = pixels(); await wait(700); const a2 = pixels();
rm.setExpression("surprised");
await wait(1200);
const a3 = pixels();
ok("reduced motion settles into one still pose", a1 === a2 && /[1-9]/.test(a1.split(",").filter((_, i) => i % 4 === 3).join("")), "frames compared were blank or moving");
ok("reduced motion still reacts to setExpression", a3 !== a2);
rm.destroy();

report.passed = Object.values(report.checks).every((v) => v === true || v.pass === true);
document.getElementById("result").textContent = JSON.stringify(report, null, 2);
document.title = report.passed ? "PASS" : "FAIL";
