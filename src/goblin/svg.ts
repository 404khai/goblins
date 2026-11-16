import { EXPRESSION_META as EXPRESSIONS, STILLS } from "./poses";
import type { ExpressionId, Goblin } from "./types";

/**
 * Flat, front-facing SVG of a goblin. Shares the trait set and expression poses with the 3D rig,
 * so a goblin designed in the studio exports as a matching sticker.
 * 1 rig unit = 60px; the head sits at (120, 150) in a 320×320 viewBox.
 */

const INK = "#1D2318";
const R = 60;
const X = (x: number) => +(120 + x * R).toFixed(2);
const Y = (y: number) => +(150 - y * R).toFixed(2);
const SW = 4; // outline width
const HEADS: Record<Goblin["head"], [number, number]> = { round: [1.04, 0.96], egg: [0.9, 1.1], wide: [1.2, 0.86], bean: [0.98, 1.0] };

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(Math.min(255, v * f)));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
};
const deg = (rad: number) => +((rad * 180) / Math.PI).toFixed(2);
const attrs = (a: Record<string, string | number | undefined>) =>
  Object.entries(a).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}="${v}"`).join(" ");
const el = (tag: string, a: Record<string, string | number | undefined>, inner?: string) =>
  inner === undefined ? `<${tag} ${attrs(a)}/>` : `<${tag} ${attrs(a)}>${inner}</${tag}>`;
const line = { stroke: INK, "stroke-width": SW, "stroke-linejoin": "round", "stroke-linecap": "round" };

export interface SvgOptions {
  expression?: ExpressionId;
  /** Pixel width/height attributes. Omit for a fluid SVG. */
  size?: number;
  /** Allow the floating mitts. They only appear on expressions that use them (thinking, searching, confused). Default true. */
  hands?: boolean;
  /** Draw expression props such as Z's, hearts or the magnifier. Default true. */
  props?: boolean;
  /** Background fill; transparent when omitted. */
  background?: string;
  /** Prefix for ids inside the SVG so several can share one page. */
  idPrefix?: string;
}

export function goblinSvg(d: Goblin, opts: SvgOptions = {}): string {
  const id = opts.idPrefix ?? `gb${Math.random().toString(36).slice(2, 7)}`;
  const exprId = opts.expression ?? d.expression ?? "idle";
  const ex = EXPRESSIONS[exprId] ?? EXPRESSIONS.idle;
  const pose = ex.pose;
  const still = STILLS[exprId] ?? {};
  const [hx, hy] = HEADS[d.head] ?? HEADS.round;
  const skin = d.skin, dark = shade(d.skin, 0.8);
  const hasBeard = d.beard !== "none";
  const out: string[] = [];
  const back: string[] = [];
  const front: string[] = [];

  const ell = (cx: number, cy: number, rx: number, ry: number, fill: string, extra: Record<string, string | number | undefined> = {}) =>
    el("ellipse", { cx: X(cx), cy: Y(cy), rx: +(rx * R).toFixed(2), ry: +(ry * R).toFixed(2), fill, ...line, ...extra });
  const circ = (cx: number, cy: number, r: number, fill: string, extra: Record<string, string | number | undefined> = {}) =>
    el("circle", { cx: X(cx), cy: Y(cy), r: +(r * R).toFixed(2), fill, ...line, ...extra });
  const path = (dd: string, fill: string, extra: Record<string, string | number | undefined> = {}) => el("path", { d: dd, fill, ...line, ...extra });

  // ---------- ears (behind the head) ----------
  const EARS = { pointy: [0.24, 0.9, -0.15], long: [0.2, 1.4, 0.35], droopy: [0.24, 0.95, -0.85], tiny: [0.17, 0.5, 0.05] } as const;
  for (const s of [-1, 1]) {
    if (d.ears === "round") {
      back.push(ell(s * hx * 0.97, 0.12, 0.2, 0.3, skin), ell(s * hx * 0.99, 0.12, 0.1, 0.17, dark, { stroke: "none" }));
      continue;
    }
    const [r, h, a] = EARS[d.ears] ?? EARS.pointy;
    const dx = s * Math.cos(a), dy = Math.sin(a);
    const bx = s * hx * 0.78, by = 0.08;
    const tip = [bx + dx * h, by + dy * h];
    const px = -dy, py = dx; // perpendicular
    const tri = (rr: number, len: number) =>
      `M${X(bx + px * rr)} ${Y(by + py * rr)} Q${X(bx + dx * len * 0.55 + px * rr * 0.9)} ${Y(by + dy * len * 0.55 + py * rr * 0.9)} ${X(bx + dx * len)} ${Y(by + dy * len)} Q${X(bx + dx * len * 0.55 - px * rr * 0.9)} ${Y(by + dy * len * 0.55 - py * rr * 0.9)} ${X(bx - px * rr)} ${Y(by - py * rr)}Z`;
    back.push(path(tri(r, h), skin), path(tri(r * 0.5, h * 0.7), dark, { stroke: "none" }));
    void tip;
  }

  // ---------- head with a flat toon shade ----------
  const head = `${id}-head`;
  out.push(
    el("clipPath", { id: head }, el("ellipse", { cx: X(0), cy: Y(0), rx: hx * R, ry: hy * R })),
    el("ellipse", { cx: X(0), cy: Y(0), rx: hx * R, ry: hy * R, fill: dark }),
    el("ellipse", { cx: X(-0.1), cy: Y(0.1), rx: hx * R * 0.97, ry: hy * R * 0.95, fill: skin, "clip-path": `url(#${head})` }),
    el("ellipse", { cx: X(0), cy: Y(0), rx: hx * R, ry: hy * R, fill: "none", ...line }),
  );
  if (d.extras.includes("freckles"))
    for (const s of [-1, 1]) for (const [fx, fy] of [[0.5, -0.12], [0.62, -0.2], [0.48, -0.26]]) out.push(circ(s * fx * hx, fy, 0.035, dark, { stroke: "none" }));

  // ---------- hair ----------
  const hair = d.hair ?? "none", hairC = d.hairColor ?? "#5B3B28";
  if (hair === "bob" || hair === "long") {
    if (hair === "long") back.unshift(path(`M${X(-hx * 1.08)} ${Y(0.3)} Q${X(-hx * 1.25)} ${Y(-1.0)} ${X(-hx * 0.9)} ${Y(-1.55)} L${X(hx * 0.9)} ${Y(-1.55)} Q${X(hx * 1.25)} ${Y(-1.0)} ${X(hx * 1.08)} ${Y(0.3)}Z`, hairC));
    back.push(ell(0, 0.08, hx * 1.1, hy * 1.07, hairC));
    for (const s2 of [-1, 1]) out.push(ell(s2 * hx * 0.86, -0.08, 0.17, 0.42, hairC, { transform: `rotate(${s2 * -6} ${X(s2 * hx * 0.86)} ${Y(-0.08)})` }));
    out.push(path(`M${X(-hx * 0.98)} ${Y(hy * 0.28)} Q${X(-hx * 0.9)} ${Y(hy * 1.02)} ${X(0)} ${Y(hy * 1.04)} Q${X(hx * 0.9)} ${Y(hy * 1.02)} ${X(hx * 0.98)} ${Y(hy * 0.28)} Q${X(hx * 0.5)} ${Y(hy * 0.6)} ${X(0)} ${Y(hy * 0.48)} Q${X(-hx * 0.5)} ${Y(hy * 0.6)} ${X(-hx * 0.98)} ${Y(hy * 0.28)}Z`, hairC));
  } else if (hair !== "none") {
    if (hair === "ponytail") back.unshift(path(`M${X(hx * 0.55)} ${Y(hy * 0.75)} Q${X(hx * 1.6)} ${Y(hy * 0.9)} ${X(hx * 1.45)} ${Y(-0.55)} Q${X(hx * 1.25)} ${Y(-0.1)} ${X(hx * 0.75)} ${Y(hy * 0.35)}Z`, hairC));
    if (hair === "pigtails") for (const s2 of [-1, 1]) {
      back.unshift(ell(s2 * (hx + 0.28), hy * 0.1, 0.24, 0.42, hairC, { transform: `rotate(${s2 * -25} ${X(s2 * (hx + 0.28))} ${Y(hy * 0.1)})` }));
      out.push(circ(s2 * hx * 0.88, hy * 0.45, 0.09, "#E35D9C", { "stroke-width": 2.5 }));
    }
    if (hair === "bun") back.unshift(circ(0, hy + 0.12, 0.32, hairC));
    out.push(path(`M${X(-hx * 0.95)} ${Y(hy * 0.32)} Q${X(-hx * 0.85)} ${Y(hy * 1.03)} ${X(0)} ${Y(hy * 1.04)} Q${X(hx * 0.85)} ${Y(hy * 1.03)} ${X(hx * 0.95)} ${Y(hy * 0.32)} Q${X(0)} ${Y(hy * 0.72)} ${X(-hx * 0.95)} ${Y(hy * 0.32)}Z`, hairC));
  }
  const outfit = d.outfit ?? "none";
  if (outfit !== "none") {
    const barista = outfit === "barista", top = -1.0 * hy;
    out.push(path(`M${X(-0.42 * hx)} ${Y(top + 0.25)} Q${X(0)} ${Y(top - 0.05)} ${X(0.42 * hx)} ${Y(top + 0.25)}`, "none", { stroke: barista ? "#1F4236" : "#C9B99A", "stroke-width": 4 }));
    out.push(path(`M${X(-0.3)} ${Y(top)} L${X(0.3)} ${Y(top)} L${X(0.38)} ${Y(top - 0.35)} Q${X(0.5)} ${Y(top - 1.1)} ${X(0.42)} ${Y(top - 1.15)} L${X(-0.42)} ${Y(top - 1.15)} Q${X(-0.5)} ${Y(top - 1.1)} ${X(-0.38)} ${Y(top - 0.35)}Z`, barista ? "#2E5E4E" : "#F1EBDD"));
    if (barista) {
      out.push(el("rect", { x: X(-0.25), y: Y(top - 0.6), width: 0.5 * R, height: 0.26 * R, rx: 2, fill: "#24493C", ...line, "stroke-width": 2 }));
      out.push(el("rect", { x: X(-0.07), y: Y(top - 0.22), width: 0.14 * R, height: 0.12 * R, rx: 2, fill: "#F4EEDC" }), el("path", { d: `M${X(0.07)} ${Y(top - 0.25)} q6 0 6 4 q0 4 -6 4`, fill: "none", stroke: "#F4EEDC", "stroke-width": 2 }));
    } else {
      for (const [c, x, y, r] of [["#D8402F", -0.2, -0.3, 0.07], ["#2F6FD6", 0.18, -0.45, 0.06], ["#F2B630", -0.05, -0.75, 0.08], ["#3E9B4F", 0.25, -0.92, 0.05], ["#E35D9C", -0.28, -0.95, 0.06], ["#D8402F", 0.1, -0.15, 0.04]] as const) {
        out.push(ell(x, top + y, r, r * 0.85, c, { stroke: "none" }), circ(x + r * 1.3, top + y - r * 0.7, r * 0.35, c, { stroke: "none" }));
      }
    }
  }
  if (d.extras.includes("blush")) for (const s2 of [-1, 1]) out.push(ell(s2 * hx * 0.55, -0.17, 0.15, 0.08, "#F28BA8", { stroke: "none" }));

  // ---------- scarf ----------
  if (d.scarf !== "none") {
    const sc = d.scarfColor, y = -0.86 * hy;
    if (d.scarf === "long") out.push(el("rect", { x: X(0.43), y: Y(-1.0), width: 0.38 * R, height: 1.0 * R, rx: 5, fill: sc, ...line, transform: `rotate(-10 ${X(0.62)} ${Y(-1.35)})` }) +
      el("rect", { x: X(0.43), y: Y(-1.9), width: 0.38 * R, height: 0.12 * R, fill: shade(sc, 0.75), ...line, "stroke-width": 3, transform: `rotate(-10 ${X(0.62)} ${Y(-1.35)})` }));
    out.push(el("rect", { x: X(-0.96 * hx), y: Y(y + 0.24), width: 1.92 * hx * R, height: 0.48 * R, rx: 0.24 * R, fill: sc, ...line }));
    out.push(el("line", { x1: X(-0.8 * hx), x2: X(0.8 * hx), y1: Y(y), y2: Y(y), stroke: shade(sc, 0.8), "stroke-width": 3, "stroke-linecap": "round" }));
    if (d.scarf === "wrap") out.push(ell(0.45, -0.95, 0.22, 0.18, sc));
  }

  // ---------- beard ----------
  const bc = d.beardColor;
  const blob = (parts: string[]) => {
    // draw outlines first, then fills on top, so overlapping shapes read as one mass
    out.push(...parts.map((p) => p.replace(/fill="[^"]*"/, `fill="${INK}"`).replace(/stroke-width="4"/, `stroke-width="${SW * 2}"`)));
    out.push(...parts.map((p) => p.replace(/stroke="#1D2318"/, 'stroke="none"')));
  };
  if (d.beard === "full") blob([ell(0, -0.62, 0.9 * 1.05 * hx, 0.9 * 1.05, bc), circ(0, -1.25, 0.5, bc)]);
  else if (d.beard === "pointy") blob([path(`M${X(-0.72 * hx)} ${Y(-0.35)} Q${X(-0.5 * hx)} ${Y(-1.2)} ${X(0)} ${Y(-1.95)} Q${X(0.5 * hx)} ${Y(-1.2)} ${X(0.72 * hx)} ${Y(-0.35)} Q${X(0)} ${Y(-0.15)} ${X(-0.72 * hx)} ${Y(-0.35)}Z`, bc)]);
  else if (d.beard === "forked") blob([
    ell(0, -0.6, 0.77 * hx, 0.56, bc),
    path(`M${X(-0.55)} ${Y(-0.75)} L${X(-0.42)} ${Y(-1.75)} L${X(-0.05)} ${Y(-0.85)}Z`, bc),
    path(`M${X(0.55)} ${Y(-0.75)} L${X(0.42)} ${Y(-1.75)} L${X(0.05)} ${Y(-0.85)}Z`, bc),
  ]);
  else if (d.beard === "braid") {
    blob([ell(0, -0.55, 0.77 * hx, 0.52, bc), ...[0.3, 0.25, 0.21, 0.17].map((r, k) => ell(0, -1.0 - k * 0.32, r, r * 0.9, bc))]);
    out.push(circ(0, -2.08, 0.1, "#D8402F"));
  }
  // ---------- eyes ----------
  const EX = hx * 0.36, EY = 0.15;
  const look = still.look ?? [0, 0];
  const lid = pose.lid, wide = 1 + Math.max(0, -lid) * 1.2;
  const squint = still.squint ?? [0, 0];
  const visor = d.eyes === "visor";
  const GLOW = "#7CF2C8";
  if (visor) out.push(el("rect", { x: X(-hx * 0.6), y: Y(EY + 0.22), width: hx * 1.2 * R, height: 0.44 * R, rx: 12, fill: "#151515", ...line }));
  [-1, 1].forEach((s, i) => {
    if (i === 0 && d.extras.includes("eyepatch")) return;
    const mode = pose.eyes[i];
    const cx = s * EX, cy = EY;
    const arcColor = visor ? GLOW : INK;
    if (mode !== "open") {
      const up = mode === "happy" ? 1 : -1;
      out.push(path(`M${X(cx - 0.14)} ${Y(cy - 0.03 * up)} Q${X(cx)} ${Y(cy + 0.2 * up)} ${X(cx + 0.14)} ${Y(cy - 0.03 * up)}`, "none", { stroke: arcColor, "stroke-width": 5 }));
      return;
    }
    if (visor) {
      const h = 0.13 * (1 - Math.max(0, lid) * 0.6);
      out.push(el("rect", { x: X(cx - 0.12 + look[0] * 0.07), y: Y(cy + h / 2 + look[1] * 0.07), width: 0.24 * R, height: h * R, rx: 3, fill: GLOW, transform: `rotate(${-deg(s * pose.tilt * 0.6)} ${X(cx)} ${Y(cy)})` }));
      return;
    }
    if (d.eyes === "beady") {
      out.push(ell(cx + look[0] * 0.03, cy + look[1] * 0.03, 0.12 * wide, 0.14 * wide, INK, { stroke: "none" }));
      return;
    }
    const big = d.eyes === "wonky" && s < 0 ? 1.25 : 1;
    const box = d.eyes === "wonky" && s > 0;
    const [sx, sy] = d.eyes === "oval" ? [0.85, 1.4] : [1, 1.12];
    const rx = 0.22 * big * sx * wide, ry = 0.22 * big * sy * wide;
    const clip = `${id}-eye${i}`;
    const shape = box
      ? { tag: "rect", a: { x: X(cx - 0.18), y: Y(cy + 0.12), width: 0.44 * R, height: 0.32 * R, rx: 7, transform: `rotate(7 ${X(cx)} ${Y(cy)})` } }
      : { tag: "ellipse", a: { cx: X(cx), cy: Y(cy), rx: rx * R, ry: ry * R } };
    out.push(el("clipPath", { id: clip }, el(shape.tag, shape.a)));
    out.push(el(shape.tag, { ...shape.a, fill: "#FFFFFF", ...line }));
    const pr = 0.125 * big * pose.pupil;
    const eyeLid = Math.min(1, Math.max(0, lid) + squint[i]);
    out.push(el("g", { "clip-path": `url(#${clip})` },
      circ(cx + look[0] * 0.065 + (box ? -0.02 : 0), cy + look[1] * 0.065 + (box ? -0.04 : 0), pr, INK, { stroke: "none" }) +
      circ(cx + look[0] * 0.065 + pr * 0.35, cy + look[1] * 0.065 + pr * 0.4, pr * 0.28, "#FFFFFF", { stroke: "none" }) +
      (eyeLid > 0.02
        ? el("g", { transform: `rotate(${-deg(s * pose.tilt)} ${X(cx)} ${Y(cy)})` },
            el("rect", { x: X(cx - 0.4), y: Y(cy + 0.4), width: 0.8 * R, height: (0.4 - ry + ry * eyeLid) * R, fill: skin }) +
            el("line", { x1: X(cx - 0.4), x2: X(cx + 0.4), y1: Y(cy + ry - ry * eyeLid), y2: Y(cy + ry - ry * eyeLid), ...line }))
        : "")));
    out.push(el(shape.tag, { ...shape.a, fill: "none", ...line }));
  });

  // ---------- lashes ----------
  if (d.extras.includes("lashes") && d.eyes !== "visor" && d.eyes !== "beady") [-1, 1].forEach((s2, i) => {
    if (pose.eyes[i] !== "open") return;
    const big = d.eyes === "wonky" && s2 < 0 ? 1.25 : 1;
    const [sx, sy] = d.eyes === "oval" ? [0.85, 1.4] : [1, 1.12];
    const rx = 0.22 * big * sx * wide, ry = 0.22 * big * sy * wide * (1 - Math.max(0, lid) * 0.5);
    for (const a of [0.35, 0.75, 1.15]) {
      const x0 = s2 * EX + s2 * Math.cos(a) * rx, y0 = EY + Math.sin(a) * ry;
      out.push(el("line", { x1: X(x0), y1: Y(y0), x2: X(x0 + s2 * Math.cos(a) * 0.12), y2: Y(y0 + Math.sin(a) * 0.12), ...line, "stroke-width": 3.2 }));
    }
  });

  if (d.extras.includes("eyepatch")) {
    out.push(el("line", { x1: X(-hx * 0.98), y1: Y(0.55), x2: X(hx * 0.9), y2: Y(-0.05), stroke: "#151515", "stroke-width": 4 }));
    out.push(ell(-EX, EY, 0.26, 0.24, "#151515", { "stroke-width": 3 }));
  }

  // ---------- brows ----------
  const browColor = hasBeard ? shade(d.beardColor, 0.9) : shade(d.skin, 0.55);
  if (!["gnome", "wizard", "beanie", "tophat", "pirate", "hardhat", "chef"].includes(d.hat)) [-1, 1].forEach((s, i) => {
    const [lift, slant] = i === 0 && pose.browL ? pose.browL : pose.brow;
    const cx = s * EX, cy = EY + (d.eyes === "oval" ? 0.42 : 0.36) + lift;
    out.push(el("line", { x1: X(cx - 0.17), x2: X(cx + 0.17), y1: Y(cy), y2: Y(cy), stroke: INK, "stroke-width": 11, "stroke-linecap": "round", transform: `rotate(${-deg(s * slant)} ${X(cx)} ${Y(cy)})` }));
    out.push(el("line", { x1: X(cx - 0.17), x2: X(cx + 0.17), y1: Y(cy), y2: Y(cy), stroke: browColor, "stroke-width": 5, "stroke-linecap": "round", transform: `rotate(${-deg(s * slant)} ${X(cx)} ${Y(cy)})` }));
  });

  if (hasBeard) for (const s of [-1, 1]) out.push(ell(s * 0.2, -0.3, 0.3, 0.12, bc, { transform: `rotate(${-deg(s * 0.35)} ${X(s * 0.2)} ${Y(-0.3)})` }));

  // ---------- mouth ----------
  const MY = hasBeard ? -0.52 : -0.44;
  const ms = still.mouth ?? 1;
  const mx = X(0), my = Y(MY);
  const mouth = (() => {
    switch (pose.mouth) {
      case "grin": return path(`M${mx - 11} ${my - 2} A11 ${11 * ms} 0 0 0 ${mx + 11} ${my - 2}Z`, INK, { "stroke-width": 2 }) + el("ellipse", { cx: mx, cy: my + 6 * ms, rx: 5, ry: 3, fill: "#E0566A" });
      case "o": return el("ellipse", { cx: mx, cy: my, rx: 5.5, ry: 7 * ms, fill: INK });
      case "flat": return el("line", { x1: mx - 8, x2: mx + 8, y1: my, y2: my, ...line });
      case "frown": return path(`M${mx - 9} ${my + 4} Q${mx} ${my - 6} ${mx + 9} ${my + 4}`, "none");
      case "smirk": return path(`M${mx - 6} ${my} Q${mx + 3} ${my + 5} ${mx + 10} ${my - 3}`, "none");
      default: return path(`M${mx - 9} ${my - 3} Q${mx} ${my + 7} ${mx + 9} ${my - 3}`, "none");
    }
  })();
  out.push(mouth);
  if (d.extras.includes("tusks")) for (const s of [-1, 1]) out.push(path(`M${mx + s * 7} ${my} L${mx + s * 11} ${my - 13} L${mx + s * 14} ${my}Z`, "#F4EFE2", { "stroke-width": 2.5 }));
  if (d.extras.includes("pipe")) out.push(
    el("line", { x1: mx + 6, y1: my, x2: X(0.55), y2: Y(MY - 0.05), stroke: "#25221F", "stroke-width": 4, "stroke-linecap": "round" }),
    el("rect", { x: X(0.5), y: Y(MY + 0.2), width: 15, height: 18, rx: 4, fill: "#6B4226", ...line, "stroke-width": 3 }),
  );

  // ---------- nose (on top of the moustache) ----------
  const NY = -0.08;
  if (d.nose === "bulb") out.push(ell(0, NY, 0.23, 0.21, dark));
  else if (d.nose === "button") out.push(ell(0, NY, 0.14, 0.12, dark));
  else if (d.nose === "long") out.push(path(`M${X(-0.12)} ${Y(NY + 0.1)} Q${X(0)} ${Y(NY + 0.22)} ${X(0.12)} ${Y(NY + 0.1)} L${X(0.04)} ${Y(NY - 0.45)} Q${X(0)} ${Y(NY - 0.52)} ${X(-0.04)} ${Y(NY - 0.45)}Z`, dark));
  else out.push(path(`M${X(-0.15)} ${Y(NY + 0.12)} Q${X(0.05)} ${Y(NY + 0.25)} ${X(0.17)} ${Y(NY)} Q${X(0.12)} ${Y(NY - 0.3)} ${X(-0.12)} ${Y(NY - 0.32)} Q${X(0.02)} ${Y(NY - 0.12)} ${X(-0.15)} ${Y(NY + 0.12)}Z`, dark));

  // ---------- eyewear ----------
  if (d.eyewear === "round" || d.eyewear === "shades") {
    const shades = d.eyewear === "shades";
    for (const s of [-1, 1]) {
      out.push(circ(s * EX, EY, shades ? 0.27 : 0.25, shades ? INK : "none", { "stroke-width": shades ? SW : 3.5 }));
      if (shades) out.push(path(`M${X(s * EX - 0.12)} ${Y(EY + 0.05)} Q${X(s * EX - 0.08)} ${Y(EY + 0.16)} ${X(s * EX + 0.02)} ${Y(EY + 0.18)}`, "none", { stroke: "#FFFFFF", "stroke-width": 3 }));
      out.push(el("line", { x1: X(s * (EX + 0.25)), y1: Y(EY), x2: X(s * hx * 0.98), y2: Y(EY + 0.04), ...line, "stroke-width": 3.5 }));
    }
    out.push(path(`M${X(-EX + 0.25)} ${Y(EY)} Q${X(0)} ${Y(EY + 0.12)} ${X(EX - 0.25)} ${Y(EY)}`, "none", { "stroke-width": 3.5 }));
  } else if (d.eyewear === "monocle") {
    out.push(circ(EX, EY, 0.27, "none", { stroke: "#E0A92B", "stroke-width": 5 }), circ(EX, EY, 0.27, "none", { "stroke-width": 1.5 }));
    out.push(path(`M${X(EX + 0.2)} ${Y(EY - 0.18)} Q${X(EX + 0.45)} ${Y(EY - 0.6)} ${X(EX + 0.3)} ${Y(EY - 1.0)}`, "none", { stroke: "#E0A92B", "stroke-width": 2.5, "stroke-dasharray": "3 4" }));
  }

  // ---------- hats ----------
  const hc = d.hatColor, hcDark = shade(hc, 0.78);
  const capY = 0.48 * hy;
  if (d.hat === "gnome" || d.hat === "wizard") {
    const wiz = d.hat === "wizard";
    const tipX = wiz ? -0.75 : 0.6, tipY = capY + (wiz ? 2.3 : 2.0);
    const w = hx * 1.04;
    if (wiz) out.push(ell(0, capY + 0.02, hx * 1.65, 0.14, hc));
    out.push(path(`M${X(-w)} ${Y(capY)} Q${X(-w * 0.55)} ${Y(capY + 1.3)} ${X(tipX)} ${Y(tipY)} Q${X(w * 0.85)} ${Y(capY + 1.1)} ${X(w)} ${Y(capY)} Q${X(0)} ${Y(capY - 0.12)} ${X(-w)} ${Y(capY)}Z`, hc));
    out.push(path(`M${X(w * 0.25)} ${Y(capY + 0.15)} Q${X(w * 0.75)} ${Y(capY + 1.0)} ${X(tipX)} ${Y(tipY)} Q${X(w * 0.85)} ${Y(capY + 1.1)} ${X(w)} ${Y(capY)}Z`, hcDark, { stroke: "none" }));
    out.push(path(`M${X(-w)} ${Y(capY)} Q${X(-w * 0.55)} ${Y(capY + 1.3)} ${X(tipX)} ${Y(tipY)} Q${X(w * 0.85)} ${Y(capY + 1.1)} ${X(w)} ${Y(capY)}`, "none"));
    if (wiz) {
      out.push(el("rect", { x: X(-w * 0.98), y: Y(capY + 0.3), width: w * 1.96 * R, height: 0.18 * R, fill: "#E0A92B", ...line, "stroke-width": 3 }));
      out.push(star(X(tipX), Y(tipY), 14, "#F2B630"));
    } else out.push(el("rect", { x: X(-w * 1.0), y: Y(capY + 0.12), width: w * 2 * R, height: 0.24 * R, rx: 0.12 * R, fill: hcDark, ...line }));
  } else if (d.hat === "beret") {
    out.push(el("rect", { x: X(-0.06), y: Y(hy * 0.7 + 0.5), width: 6, height: 14, rx: 3, fill: hc, ...line, "stroke-width": 3 }));
    out.push(ell(-0.08, hy * 0.7, hx * 1.14 * 1.08, 0.38, hc, { transform: `rotate(-12 ${X(-0.08)} ${Y(hy * 0.7)})` }));
  } else if (d.hat === "beanie") {
    const rx = 1.06 * hx * 1.02, base = capY - 0.15;
    out.push(path(`M${X(-rx)} ${Y(base)} A${rx * R} ${1.06 * hy * R} 0 0 1 ${X(rx)} ${Y(base)}Z`, hc));
    for (const k of [-0.5, 0, 0.5]) out.push(el("line", { x1: X(k * rx), x2: X(k * rx * 0.7), y1: Y(base + 0.1), y2: Y(base + 0.85), stroke: hcDark, "stroke-width": 3, "stroke-linecap": "round" }));
    out.push(el("rect", { x: X(-hx * 1.1), y: Y(capY + 0.07), width: hx * 2.2 * R, height: 0.3 * R, rx: 8, fill: hcDark, ...line }));
    out.push(circ(0, base + 1.06 * hy + 0.05, 0.26, "#ECE6D6"));
  } else if (d.hat === "mushroom") {
    const rx = 1.5 * hx * 1.02, ry = 1.5 * 0.75, base = capY + 0.05;
    out.push(ell(0, base - 0.02, rx * 0.92, 0.13, "#F2ECDD"));
    out.push(path(`M${X(-rx)} ${Y(base)} A${rx * R} ${ry * R} 0 0 1 ${X(rx)} ${Y(base)} Q${X(0)} ${Y(base - 0.12)} ${X(-rx)} ${Y(base)}Z`, hc));
    for (const [sx2, sy2, r] of [[0, 0.75, 0.2], [0.75, 0.45, 0.16], [-0.8, 0.5, 0.18], [0.35, 1.0, 0.12], [-0.4, 1.0, 0.13], [1.15, 0.15, 0.1], [-1.2, 0.18, 0.11]])
      out.push(circ(sx2 * hx, base + sy2 * 0.95, r, "#F7F2E6", { "stroke-width": 2.5 }));
  } else if (d.hat === "sprout") {
    for (const [x, h, rz] of [[-0.25, 0.4, 0.5], [0.25, 0.4, -0.5], [0, 0.5, 0]] as const)
      out.push(ell(x, hy + h * 0.55, 0.15, h * 0.6, hc, { transform: `rotate(${-deg(rz)} ${X(x)} ${Y(hy + h * 0.55)})` }));
  } else if (d.hat === "headband") {
    out.push(el("rect", { x: X(-hx * 0.93), y: Y(capY + 0.1), width: hx * 1.86 * R, height: 0.2 * R, rx: 5, fill: hc, ...line }));
    out.push(path(`M${X(hx * 0.8)} ${Y(capY)} l14 10 l4 -14Z`, hc, { "stroke-width": 3 }));
  } else if (d.hat === "tophat") {
    const band = shade(hc, 1.6), cy0 = capY;
    out.push(el("g", { transform: `rotate(-4 ${X(0)} ${Y(cy0)})` },
      el("rect", { x: X(-hx * 0.72), y: Y(cy0 + 1.2), width: hx * 1.44 * R, height: 1.15 * R, rx: 4, fill: hc, ...line }) +
      el("rect", { x: X(-hx * 0.72), y: Y(cy0 + 0.33), width: hx * 1.44 * R, height: 0.2 * R, fill: band, ...line, "stroke-width": 3 }) +
      el("rect", { x: X(-hx * 1.3), y: Y(cy0 + 0.1), width: hx * 2.6 * R, height: 0.14 * R, rx: 5, fill: hc, ...line }) +
      el("circle", { cx: X(hx * 0.4), cy: Y(cy0 + 0.23), r: 7, fill: "#C9952B", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 2" })));
  }
  if (d.hat === "pirate") {
    const w = hx * 1.45, base = capY + 0.05;
    out.push(path(`M${X(-w)} ${Y(base + 0.25)} Q${X(-w * 0.7)} ${Y(base - 0.05)} ${X(0)} ${Y(base + 0.05)} Q${X(w * 0.7)} ${Y(base - 0.05)} ${X(w)} ${Y(base + 0.25)} Q${X(w * 0.6)} ${Y(base + 0.95)} ${X(0)} ${Y(base + 0.85)} Q${X(-w * 0.6)} ${Y(base + 0.95)} ${X(-w)} ${Y(base + 0.25)}Z`, hc));
    out.push(path(`M${X(-w * 0.92)} ${Y(base + 0.28)} Q${X(0)} ${Y(base + 0.05)} ${X(w * 0.92)} ${Y(base + 0.28)}`, "none", { stroke: "#E0A92B", "stroke-width": 3.5 }));
    const sx2 = X(0), sy2 = Y(base + 0.48);
    out.push(el("circle", { cx: sx2, cy: sy2, r: 8, fill: "#F4EFE2", stroke: INK, "stroke-width": 2 }), el("circle", { cx: sx2 - 3, cy: sy2 - 1, r: 2, fill: INK }), el("circle", { cx: sx2 + 3, cy: sy2 - 1, r: 2, fill: INK }),
      el("path", { d: `M${sx2 - 11} ${sy2 + 6} L${sx2 + 11} ${sy2 + 14} M${sx2 + 11} ${sy2 + 6} L${sx2 - 11} ${sy2 + 14}`, stroke: "#F4EFE2", "stroke-width": 3.5, "stroke-linecap": "round" }));
  } else if (d.hat === "hardhat") {
    const rx2 = 1.08 * hx, base = capY - 0.12;
    out.push(path(`M${X(-rx2)} ${Y(base)} A${rx2 * R} ${0.95 * R} 0 0 1 ${X(rx2)} ${Y(base)}Z`, hc));
    out.push(el("rect", { x: X(-0.08), y: Y(base + 0.98), width: 0.16 * R, height: 0.95 * R, rx: 4, fill: hc, ...line, "stroke-width": 3 }));
    out.push(el("rect", { x: X(-hx * 1.25), y: Y(base + 0.06), width: hx * 2.5 * R, height: 0.13 * R, rx: 5, fill: hc, ...line }));
    out.push(el("rect", { x: X(-0.12), y: Y(base + 0.62), width: 0.24 * R, height: 0.16 * R, rx: 3, fill: "#3A3A44", ...line, "stroke-width": 2 }), el("circle", { cx: X(0), cy: Y(base + 0.54), r: 3.5, fill: "#FFF4C2" }));
  } else if (d.hat === "chef") {
    const base = capY - 0.02, w = hx * 0.92;
    for (const [x, y, r] of [[-0.48, 0.85, 0.42], [0.48, 0.85, 0.42], [0, 1.1, 0.55]]) out.push(circ(x * hx, base + y, r, hc));
    out.push(el("rect", { x: X(-w), y: Y(base + 0.6), width: w * 2 * R, height: 0.62 * R, rx: 4, fill: hc, ...line }));
    for (const x of [-0.45, 0, 0.45]) out.push(el("line", { x1: X(x * w), x2: X(x * w), y1: Y(base + 0.55), y2: Y(base + 0.1), stroke: "#D9D3C4", "stroke-width": 2.5 }));
  } else if (d.hat === "crown") {
    const base = capY + 0.05, w = hx * 0.62;
    out.push(path(`M${X(-w)} ${Y(base)} L${X(-w)} ${Y(base + 0.45)} L${X(-w * 0.5)} ${Y(base + 0.22)} L${X(0)} ${Y(base + 0.55)} L${X(w * 0.5)} ${Y(base + 0.22)} L${X(w)} ${Y(base + 0.45)} L${X(w)} ${Y(base)}Z`, "#F2B630"));
    for (const [x, c] of [[-0.5, "#D8402F"], [0, "#2F6FD6"], [0.5, "#D8402F"]] as const) out.push(circ(x * w, base + 0.1, 0.05, c, { "stroke-width": 1.5 }));
  }
  if (d.hat === "straw") {
    const b = capY - 0.05, w = hx * 1.85;
    out.push(ell(0, b, w, 0.22, hc));
    for (const k2 of [0.45, 0.65, 0.85]) out.push(ell(0, b, w * k2, 0.22 * k2, "none", { stroke: "#C9A24A", "stroke-width": 2 }));
    out.push(path(`M${X(-hx * 0.85)} ${Y(b)} Q${X(-hx * 0.8)} ${Y(b + 0.62)} ${X(0)} ${Y(b + 0.65)} Q${X(hx * 0.8)} ${Y(b + 0.62)} ${X(hx * 0.85)} ${Y(b)}Z`, hc));
    out.push(el("rect", { x: X(-hx * 0.84), y: Y(b + 0.18), width: hx * 1.68 * R, height: 0.14 * R, fill: "#D8402F", ...line, "stroke-width": 3 }));
  }
  if (d.extras.includes("stethoscope")) {
    out.push(path(`M${X(-0.55 * hx)} ${Y(-0.9)} Q${X(-0.5 * hx)} ${Y(-1.45)} ${X(0)} ${Y(-1.5)} Q${X(0.5 * hx)} ${Y(-1.45)} ${X(0.55 * hx)} ${Y(-0.9)}`, "none", { stroke: "#3A3A44", "stroke-width": 4.5 }));
    out.push(path(`M${X(0.35)} ${Y(-1.42)} Q${X(0.4)} ${Y(-1.7)} ${X(0.2)} ${Y(-1.85)}`, "none", { stroke: "#3A3A44", "stroke-width": 4.5 }), circ(0.18, -1.9, 0.1, "#AEB6BF", { "stroke-width": 3 }));
  }
  if (d.extras.includes("goggles")) {
    const gy = d.hat === "tophat" ? capY + 0.25 : capY + 0.08;
    out.push(el("rect", { x: X(-hx * (d.hat === "tophat" ? 0.74 : 0.97)), y: Y(gy + 0.05), width: hx * (d.hat === "tophat" ? 1.48 : 1.94) * R, height: 0.1 * R, fill: "#3B2A20", stroke: "none" }));
    for (const s2 of [-1, 1]) out.push(circ(s2 * 0.27, gy + 0.02, 0.16, "#C9952B", { "stroke-width": 3 }), circ(s2 * 0.27, gy + 0.02, 0.1, "#7CC8C0", { "stroke-width": 2 }), circ(s2 * 0.27 + 0.04, gy + 0.06, 0.03, "#E9FFF8", { stroke: "none" }));
  }
  if (d.extras.includes("bow")) {
    const bx = hx * 0.72, by = hy * 0.66;
    for (const s2 of [-1, 1]) out.push(path(`M${X(bx)} ${Y(by)} L${X(bx + s2 * 0.3)} ${Y(by + 0.16)} L${X(bx + s2 * 0.3)} ${Y(by - 0.16)}Z`, "#E35D9C", { "stroke-width": 3 }));
    out.push(circ(bx, by, 0.07, "#E35D9C", { "stroke-width": 2.5 }));
  }

  if (d.hat === "astronaut") {
    const Rb = Math.max(hx, hy) * 1.42;
    out.push(ell(0, -Rb * 0.72, Rb * 0.78, 0.2, "#F4F2EC"));
    out.push(el("circle", { cx: X(0), cy: Y(0.12), r: Rb * R, fill: "#CFE8FF", "fill-opacity": 0.22, ...line }));
    out.push(el("path", { d: `M${X(-Rb * 0.62)} ${Y(Rb * 0.45)} A${Rb * R * 0.8} ${Rb * R * 0.8} 0 0 1 ${X(-Rb * 0.1)} ${Y(Rb * 0.95)}`, fill: "none", stroke: "#FFFFFF", "stroke-width": 6, "stroke-linecap": "round" }));
    out.push(el("line", { x1: X(Rb * 0.35), y1: Y(Rb * 1.0), x2: X(Rb * 0.45), y2: Y(Rb * 1.28), stroke: "#AEB6BF", "stroke-width": 3.5 }), circ(Rb * 0.46, Rb * 1.3, 0.07, "#D8402F", { "stroke-width": 2 }));
  }

  // ---------- headphones, earring ----------
  if (d.extras.includes("headphones")) {
    const tall = d.hat === "gnome" || d.hat === "wizard" || d.hat === "mushroom";
    const r = hx * (tall ? 1.18 : 1.1);
    out.push(path(`M${X(-hx * 1.04)} ${Y(0.1)} C${X(-r)} ${Y(hy + (tall ? 0.6 : 0.35))} ${X(r)} ${Y(hy + (tall ? 0.6 : 0.35))} ${X(hx * 1.04)} ${Y(0.1)}`, "none", { stroke: INK, "stroke-width": 9 }));
    out.push(path(`M${X(-hx * 1.04)} ${Y(0.1)} C${X(-r)} ${Y(hy + (tall ? 0.6 : 0.35))} ${X(r)} ${Y(hy + (tall ? 0.6 : 0.35))} ${X(hx * 1.04)} ${Y(0.1)}`, "none", { stroke: "#3A3832", "stroke-width": 4 }));
    for (const s of [-1, 1]) out.push(el("rect", { x: X(s * hx * 1.04) - 11, y: Y(0.1) - 22, width: 22, height: 44, rx: 10, fill: "#ECE6D6", ...line }), el("rect", { x: X(s * hx * 1.04) - 5 + s * 5, y: Y(0.1) - 15, width: 6, height: 30, rx: 3, fill: "#25221F" }));
  }
  if (d.extras.includes("earring")) back.push(circ(-hx * 1.0, -0.12, 0.1, "none", { stroke: "#E0A92B", "stroke-width": 4 }));

  // ---------- hands ----------
  // a carried tool shows (with the mitts) only when the expression doesn't need the hands
  const tool = !ex.hands && opts.hands !== false ? d.tool ?? "none" : "none";
  const hands = opts.hands !== false && (!!ex.hands || tool !== "none");
  const toolHands: [[number, number], [number, number]] | null =
    tool === "none" ? null
      : tool === "gameboy" ? [[-0.7, -1.12], [0.7, -1.12]]
      : tool === "briefcase" ? [[-(hx + 0.2), -1.2], [hx + 0.15, -0.75]]
      : tool === "mug" ? [[-(hx + 0.2), -1.2], [hx - 0.05, -0.9]]
      : tool === "lantern" ? [[-(hx + 0.2), -1.2], [hx + 0.25, -0.75]]
      : [[-(hx + 0.2), -1.2], [hx + 0.15, -1.0]];
  const hooked = d.extras.includes("hook");
  let handPos = (ex.hands ? still.hands : toolHands) ?? [null, null];
  // a hook can't hold a tool: mirror the carrying pose into the left mitt
  if (hooked && !ex.hands && toolHands) handPos = [[-toolHands[1][0], toolHands[1][1]], [-toolHands[0][0], toolHands[0][1]]];
  if (tool !== "none") {
    const mirrored = hooked && tool !== "gameboy";
    const body = toolSvg(tool, mirrored ? [null, [-handPos[0]![0], handPos[0]![1]]] : handPos, d);
    front.push(mirrored ? `<g transform="translate(240 0) scale(-1 1)">${body}</g>` : body);
  }
  if (hands || hooked) [-1, 1].forEach((s, i) => {
    const p = handPos[i] ?? [s * (hx + 0.2), -1.2];
    if (i === 1 && hooked) {
      front.push(el("rect", { x: X(p[0] - 0.2), y: Y(p[1] + 0.08), width: 0.4 * R, height: 0.26 * R, rx: 5, fill: "#5C3D27", ...line, "stroke-width": 3 }));
      front.push(el("path", { d: `M${X(p[0])} ${Y(p[1] + 0.08)} V${Y(p[1] + 0.32)} a10 10 0 1 1 -19 4`, fill: "none", stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }));
      front.push(el("path", { d: `M${X(p[0])} ${Y(p[1] + 0.08)} V${Y(p[1] + 0.32)} a10 10 0 1 1 -19 4`, fill: "none", stroke: "#AEB6BF", "stroke-width": 4, "stroke-linecap": "round" }));
    } else if (hands || i === 1) front.push(ell(p[0], p[1], 0.21, 0.2, skin));
  });

  // ---------- props ----------
  const topY = d.hat === "gnome" || d.hat === "wizard" ? capY + 1.6 : d.hat === "mushroom" ? capY + 1.1 : hy + 0.3;
  if (opts.props !== false) for (const p of ex.props ?? []) {
    if (p === "zzz") [[0.9, hy + 0.2, 0.7], [1.25, hy + 0.65, 0.9], [1.6, hy + 1.15, 1.1]].forEach(([x, y, s]) => front.push(zee(X(x * Math.max(1, hx)), Y(y), s * 12)));
    if (p === "hearts") [[-0.9, hy + 0.3, 1], [0.95, hy + 0.55, 0.8], [0.1, hy + 1.1, 0.65]].forEach(([x, y, s]) => front.push(heart(X(x), Y(y), s * 16)));
    if (p === "question") front.push(question(X(hx * 0.95), Y(topY + 0.1)));
    if (p === "exclaim") front.push(el("g", { transform: `translate(${X(-hx - 0.35)} ${Y(hy + 0.3)}) rotate(9)` }, el("rect", { x: -5, y: -22, width: 10, height: 26, rx: 4, fill: "#E2443A", ...line, "stroke-width": 3 }) + el("circle", { cx: 0, cy: 14, r: 5.5, fill: "#E2443A", ...line, "stroke-width": 3 })));
    if (p === "dots") [[0.08, 0], [0.12, 1], [0.17, 2]].forEach(([r, k]) => front.push(circ(hx + 0.35 + k * 0.25, hy + 0.35 + k * 0.22, r, "#F7F4EC", { "stroke-width": 3 })));
    if (p === "sweat") front.push(dropPath(X(hx * 0.85), Y(0.4), 1.3));
    if (p === "tear") front.push(dropPath(X(-EX - 0.05), Y(EY - 0.35), 1));
    if (p === "confetti") {
      const cols = ["#D8402F", "#F2B630", "#2F6FD6", "#3E9B4F", "#E35D9C", "#7CF2C8"];
      for (let kk = 0; kk < 22; kk++) {
        const x = (((kk * 37) % 22) / 22 - 0.5) * 4.2, y = (((kk * 13) % 22) / 22) * 3.6 - 1.1;
        if (Math.abs(x) < hx * 0.95 && y > -1.2 && y < hy + 0.2) continue; // keep the face clear
        front.push(el("rect", { x: X(x) - 4, y: Y(y) - 2.5, width: 8, height: 5, fill: cols[kk % cols.length], transform: `rotate(${(kk * 47) % 180} ${X(x)} ${Y(y)})` }));
      }
    }
    if (p === "sparkles") [[-1.5, 0.9], [1.55, 1.0], [-1.3, -0.6], [1.45, -0.4], [0, hy + 0.55]].forEach(([x, y], k) => front.push(star(X(x), Y(y), k % 2 ? 9 : 12, "#F2B630", 4)));
    // activities: the spells acted out
    const hp = (i: number, fallback: [number, number]) => (handPos[i] ?? fallback) as [number, number];
    const eq = (x: number, y: number, t: string, color = INK, size = 17, rot = 0) =>
      front.push(el("text", { x: X(x), y: Y(y), "font-family": "Georgia, 'Times New Roman', serif", "font-style": "italic", "font-weight": 600, "font-size": size, "text-anchor": "middle", fill: color, stroke: "#FFFFFF", "stroke-width": 4, "paint-order": "stroke", "stroke-linejoin": "round", transform: rot ? `rotate(${rot} ${X(x)} ${Y(y)})` : undefined }, t));
    const arcs = (cx: number, cy: number, dir: number, color: string, n = 3, r0 = 0.3, gap = 0.2) => {
      for (let i = 0; i < n; i++) { const r = (r0 + i * gap) * R; const a1 = -0.55, a2 = 0.55; front.push(el("path", { d: `M${X(cx) + dir * Math.cos(a1) * r} ${Y(cy) + Math.sin(a1) * r} A${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${X(cx) + dir * Math.cos(a2) * r} ${Y(cy) + Math.sin(a2) * r}`, fill: "none", stroke: color, "stroke-width": 4.5, "stroke-linecap": "round" })); }
    };
    if (p === "calculating") {
      // a chunky calculator with a receipt curling out; digits pop off as it taps
      const [lx, ly] = hp(0, [-0.5, -1.0]);
      const cx2 = lx + 0.28, cy2 = ly + 0.32;
      front.unshift(
        path(`M${X(cx2 - 0.3)} ${Y(cy2 + 0.3)} C${X(cx2 - 0.65)} ${Y(cy2 + 0.25)} ${X(cx2 - 0.8)} ${Y(cy2 - 0.2)} ${X(cx2 - 0.62)} ${Y(cy2 - 0.6)} L${X(cx2 - 0.8)} ${Y(cy2 - 0.68)} C${X(cx2 - 1.0)} ${Y(cy2 - 0.25)} ${X(cx2 - 0.85)} ${Y(cy2 + 0.4)} ${X(cx2 - 0.3)} ${Y(cy2 + 0.45)}Z`, "#F7F4EC", { "stroke-width": 2.5 }),
        el("rect", { x: X(cx2 - 0.3), y: Y(cy2 + 0.42), width: 0.6 * R, height: 0.84 * R, rx: 6, fill: "#3A3A44", ...line, "stroke-width": 3.5, transform: `rotate(-6 ${X(cx2)} ${Y(cy2)})` }),
        // its back: battery cover and screws (the keys face the goblin)
        el("rect", { x: X(cx2 - 0.2), y: Y(cy2 - 0.02), width: 0.4 * R, height: 0.3 * R, rx: 2, fill: "#2C2C34", transform: `rotate(-6 ${X(cx2)} ${Y(cy2)})` }),
        ...[[-0.22, 0.34], [0.22, 0.34], [-0.22, -0.36], [0.22, -0.36]].map(([dx, dy]) => el("circle", { cx: X(cx2 + dx), cy: Y(cy2 + dy), r: 2.5, fill: "#8A929C" })),
      );
      eq(-1.45, 0.55, "7 + 3", INK, 16, -6);
      eq(-1.7, 1.15, "×", "#2F4AA8", 20);
      eq(1.5, 0.8, "= 42", INK, 18, 6);
      eq(1.4, 1.45, "π", "#2F4AA8", 18);
    }
    if (p === "puzzling") {
      // a Rubik's cube held up in both mitts, mid-scramble
      const cx2 = 0, cy2 = -0.45, u = 0.17;
      const iso = (x: number, y: number, z: number): [number, number] => [cx2 + (x - z) * 0.87 * u, cy2 + y * u + (x + z) * 0.5 * u];
      const quad = (pts: [number, number][], fill: string) => front.push(path(`M${pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join(" L")}Z`, fill, { "stroke-width": 1.8 }));
      const top = [["#F5F2EA", "#3E9B4F", "#F5F2EA"], ["#D8402F", "#F5F2EA", "#F2C230"], ["#F5F2EA", "#F5F2EA", "#2F6FD6"]];
      const left = [["#3E9B4F", "#3E9B4F", "#F5F2EA"], ["#3E9B4F", "#E8772E", "#3E9B4F"], ["#F2C230", "#3E9B4F", "#3E9B4F"]];
      const right = [["#D8402F", "#D8402F", "#2F6FD6"], ["#D8402F", "#D8402F", "#D8402F"], ["#3E9B4F", "#D8402F", "#D8402F"]];
      for (let a2 = 0; a2 < 3; a2++) for (let b2 = 0; b2 < 3; b2++) {
        quad([iso(a2 - 1.5, 1.5, b2 - 1.5), iso(a2 - 0.5, 1.5, b2 - 1.5), iso(a2 - 0.5, 1.5, b2 - 0.5), iso(a2 - 1.5, 1.5, b2 - 0.5)], top[a2][b2]);
      }
      for (let a2 = 0; a2 < 3; a2++) for (let b2 = 0; b2 < 3; b2++) {
        // left face (z = +1.5), right face (x = +1.5)
        quad([iso(a2 - 1.5, 1.5 - b2, 1.5), iso(a2 - 0.5, 1.5 - b2, 1.5), iso(a2 - 0.5, 0.5 - b2, 1.5), iso(a2 - 1.5, 0.5 - b2, 1.5)], left[b2][a2]);
        quad([iso(1.5, 1.5 - b2, 1.5 - a2), iso(1.5, 1.5 - b2, 0.5 - a2), iso(1.5, 0.5 - b2, 0.5 - a2), iso(1.5, 0.5 - b2, 1.5 - a2)], right[b2][a2]);
      }
    }
    if (p === "jotting") {
      // the notepad faces the writer: cardboard back, spiral on top, the quill's feather bobbing over it
      const [lx, ly] = hp(0, [-0.5, -1.0]);
      const w = 0.72, h = 0.9, px = lx + 0.3, py = ly + 0.3;
      const [qx, qy] = hp(1, [0.15, -0.6]);
      front.unshift(ell(qx - 0.05, qy + 0.62, 0.09, 0.28, d.hatColor, { "stroke-width": 2.5, transform: `rotate(-15 ${X(qx - 0.05)} ${Y(qy + 0.62)})` }));
      front.splice(1, 0, el("rect", { x: X(px - w / 2), y: Y(py + h / 2), width: w * R, height: h * R, rx: 3, fill: "#B98B5E", ...line, "stroke-width": 3.5, transform: `rotate(-6 ${X(px)} ${Y(py)})` }));
      front.splice(2, 0, el("rect", { x: X(px - w / 2), y: Y(py + h / 2) - 4, width: w * R, height: 8, rx: 3, fill: "#3A3A44", transform: `rotate(-6 ${X(px)} ${Y(py)})` }));
    }
    if (p === "drawing") {
      // the pad faces the artist: we see its cardboard back and the pencil's top bobbing over the edge
      const [lx, ly] = hp(0, [-0.55, -0.85]);
      const px = lx + 0.45, py = ly + 0.45, w = 1.0;
      const [qx, qy] = hp(1, [0.15, -0.35]);
      front.unshift(el("line", { x1: X(qx), y1: Y(qy), x2: X(qx - 0.15), y2: Y(qy + 0.75), stroke: d.hatColor, "stroke-width": 8, "stroke-linecap": "round" }), circ(qx - 0.16, qy + 0.78, 0.06, "#E78FA8", { "stroke-width": 2 }));
      front.splice(2, 0, el("rect", { x: X(px - w / 2), y: Y(py + w / 2), width: w * R, height: w * R, rx: 3, fill: "#B98B5E", ...line, "stroke-width": 3.5, transform: `rotate(6 ${X(px)} ${Y(py)})` }));
      front.splice(3, 0, el("rect", { x: X(px - w / 2), y: Y(py + w / 2) - 4, width: w * R, height: 8, rx: 3, fill: "#3A3A44", transform: `rotate(6 ${X(px)} ${Y(py)})` }));
    }
    if (p === "hearing") arcs(hx + 0.15, 0.15, 1, "#7CF2C8");
    if (p === "announcing") {
      const [mx2, my2] = hp(1, [0.35, -0.62]);
      front.push(el("line", { x1: X(mx2), y1: Y(my2), x2: X(mx2 - 0.12), y2: Y(my2 + 0.35), stroke: "#2C2C34", "stroke-width": 7, "stroke-linecap": "round" }));
      front.push(circ(mx2 - 0.15, my2 + 0.45, 0.16, "#D3D7DD", { "stroke-width": 3 }));
      arcs(mx2 - 0.15, my2 + 0.45, 1, "#E2443A", 2, 0.32, 0.2);
    }
    if (p === "posting") {
      // the plane is already on its way, out past the head, trailing dots back to the throwing hand
      const [px2, py2] = hp(1, [1.15, 0.1]);
      const nx = -1.45, ny = Math.min(topY, hy + 1.1);
      for (let i = 1; i < 9; i++) { const k = i / 9; front.push(circ(px2 + (nx + 0.35 - px2) * k, py2 + 0.25 + (ny - 0.1 - py2 - 0.25) * k + Math.sin(k * Math.PI) * 0.5, 0.03, "#2FAF8F", { stroke: "none" })); }
      front.push(path(`M${X(nx - 0.45)} ${Y(ny + 0.2)} L${X(nx + 0.35)} ${Y(ny - 0.1)} L${X(nx + 0.05)} ${Y(ny + 0.22)}Z`, "#F7F4EC", { "stroke-width": 2.5 }));
      front.push(path(`M${X(nx - 0.45)} ${Y(ny + 0.2)} L${X(nx + 0.05)} ${Y(ny + 0.22)} L${X(nx + 0.12)} ${Y(ny + 0.02)}Z`, "#DDD6C2", { "stroke-width": 2.5 }));
    }
    if (p === "catching") {
      const cx = 0, cy = -0.82;
      front.push(el("rect", { x: X(cx - 0.36), y: Y(cy + 0.24), width: 0.72 * R, height: 0.48 * R, rx: 3, fill: "#F7F4EC", ...line, "stroke-width": 3 }));
      front.push(path(`M${X(cx - 0.36)} ${Y(cy + 0.24)} L${X(cx)} ${Y(cy - 0.04)} L${X(cx + 0.36)} ${Y(cy + 0.24)}`, "none", { "stroke-width": 2.5 }), circ(cx, cy - 0.04, 0.06, "#E2443A", { "stroke-width": 2 }));
    }
    if (p === "syncing") {
      const cy = Math.min(topY + 0.75, 2.35); // stays inside the frame above tall hats
      for (const [x, y, r] of [[-0.35, 0, 0.3], [0.05, 0.13, 0.4], [0.42, 0, 0.28]]) front.push(ell(x, cy + y, r, r * 0.8, "#FFFFFF", { "stroke-width": 3 }));
      front.push(el("rect", { x: X(-0.62), y: Y(cy - 0.02), width: 1.3 * R, height: 0.25 * R, fill: "#FFFFFF" }));
      front.push(el("line", { x1: X(-0.7), x2: X(0.7), y1: Y(cy - 0.23), y2: Y(cy - 0.23), ...line, "stroke-width": 3 }));
      front.push(path(`M${X(-0.18)} ${Y(cy - 0.55)} V${Y(cy - 0.05)} M${X(-0.18) - 7} ${Y(cy - 0.12)} L${X(-0.18)} ${Y(cy - 0.02)} L${X(-0.18) + 7} ${Y(cy - 0.12)}`, "none", { stroke: "#2FAF8F", "stroke-width": 4 }));
      front.push(path(`M${X(0.18)} ${Y(cy - 0.05)} V${Y(cy - 0.55)} M${X(0.18) - 7} ${Y(cy - 0.48)} L${X(0.18)} ${Y(cy - 0.58)} L${X(0.18) + 7} ${Y(cy - 0.48)}`, "none", { stroke: "#E0A92B", "stroke-width": 4 }));
    }
    if (p === "waiting") {
      const cx = hx + 0.7, cy = -0.9;
      front.push(path(`M${X(cx - 0.28)} ${Y(cy + 0.45)} H${X(cx + 0.28)} L${X(cx + 0.03)} ${Y(cy)} L${X(cx + 0.28)} ${Y(cy - 0.45)} H${X(cx - 0.28)} L${X(cx - 0.03)} ${Y(cy)}Z`, "#E3F1F5", { "stroke-width": 3 }));
      front.push(path(`M${X(cx - 0.15)} ${Y(cy + 0.25)} H${X(cx + 0.15)} L${X(cx)} ${Y(cy + 0.05)}Z M${X(cx - 0.22)} ${Y(cy - 0.4)} H${X(cx + 0.22)} L${X(cx)} ${Y(cy - 0.2)}Z`, "#F2B630", { stroke: "none" }));
      for (const s2 of [-1, 1]) front.push(el("rect", { x: X(cx - 0.35), y: Y(cy + s2 * 0.48 + 0.05), width: 0.7 * R, height: 0.1 * R, rx: 2, fill: "#7A5236", ...line, "stroke-width": 2.5 }));
    }
    if (p === "ringing") {
      const [bx, by] = hp(1, [1.1, 0.35]);
      front.push(el("line", { x1: X(bx), y1: Y(by), x2: X(bx), y2: Y(by + 0.25), stroke: "#7A5236", "stroke-width": 6, "stroke-linecap": "round" }));
      front.push(path(`M${X(bx - 0.08)} ${Y(by + 0.75)} Q${X(bx - 0.12)} ${Y(by + 0.45)} ${X(bx - 0.3)} ${Y(by + 0.28)} H${X(bx + 0.3)} Q${X(bx + 0.12)} ${Y(by + 0.45)} ${X(bx + 0.08)} ${Y(by + 0.75)}Z`, "#F2B630", { "stroke-width": 3 }));
      arcs(bx + 0.1, by + 0.5, 1, "#E2443A", 2, 0.42, 0.18);
      arcs(bx - 0.1, by + 0.5, -1, "#E2443A", 2, 0.42, 0.18);
    }
    if (p === "low-battery") {
      const cy = topY + 0.35;
      front.push(el("rect", { x: X(-0.45), y: Y(cy + 0.22), width: 0.9 * R, height: 0.44 * R, rx: 6, fill: "#F7F4EC", ...line, "stroke-width": 4 }));
      front.push(el("rect", { x: X(0.45), y: Y(cy + 0.09), width: 6, height: 0.18 * R, rx: 2, fill: INK }));
      front.push(el("rect", { x: X(-0.36), y: Y(cy + 0.13), width: 0.16 * R, height: 0.26 * R, rx: 2, fill: "#E2443A" }));
    }
    if (p === "scanning") {
      const ax = hx * 0.98, ay = 0.3, tx = ax + 0.3, ty = ay + 0.8;
      back.push(el("line", { x1: X(ax), y1: Y(ay), x2: X(tx), y2: Y(ty), stroke: "#3A3A44", "stroke-width": 4, "stroke-linecap": "round" }));
      front.push(circ(tx, ty, 0.09, "#E2443A", { "stroke-width": 2.5 }));
      for (let i = 0; i < 3; i++) front.push(circ(tx, ty, 0.2 + i * 0.16, "none", { stroke: "#7CF2C8", "stroke-width": 3, opacity: 1 - i * 0.25 }));
    }
    if (p === "orbiting") {
      const cy = hy * 0.75 + 0.3;
      front.unshift(ell(0, cy, 1.35, 0.25, "none", { stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6" }));
      front.push(circ(-1.2, cy - 0.1, 0.18, d.hatColor, { "stroke-width": 3 }), ell(-1.2, cy - 0.1, 0.32, 0.08, "none", { stroke: "#F2B630", "stroke-width": 3.5, transform: `rotate(-15 ${X(-1.2)} ${Y(cy - 0.1)})` }));
      [[1.15, cy + 0.12], [0.3, cy + 0.26], [-0.45, cy - 0.24]].forEach(([x, y]) => front.push(star(X(x), Y(y), 9, "#F2B630", 2.5)));
    }
    if (p === "juggling") {
      // the cascade arcs from hand to hand, up over the hat
      const peak = topY + 0.55;
      front.push(path(`M${X(-0.65)} ${Y(-1.0)} C${X(-1.9)} ${Y(peak * 0.7)} ${X(-0.8)} ${Y(peak + 0.3)} ${X(0)} ${Y(peak)} C${X(0.8)} ${Y(peak + 0.3)} ${X(1.9)} ${Y(peak * 0.7)} ${X(0.65)} ${Y(-1.0)}`, "none", { stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }));
      [[-1.42, peak * 0.45, "#E2443A"], [0, peak, "#F2B630"], [1.42, peak * 0.45, "#2F6FD6"]].forEach(([x, y, c]) => front.push(circ(x as number, y as number, 0.17, c as string, { "stroke-width": 3 })));
    }
    if (p === "magnifier" && hands) {
      const [hx2, hy2] = handPos[1] ?? [hx + 0.2, -1.2];
      front.unshift(
        el("line", { x1: X(hx2), y1: Y(hy2), x2: X(hx2 - 0.15), y2: Y(hy2 + 0.45), stroke: "#6B4226", "stroke-width": 7, "stroke-linecap": "round" }),
        el("circle", { cx: X(hx2 - 0.22), cy: Y(hy2 + 0.68), r: 16, fill: "#CFF1FF", "fill-opacity": 0.55, stroke: "#3A3A44", "stroke-width": 6 }),
      );
    }
  }

  const tilt = still.tilt ?? 0;
  const body = el("g", { transform: tilt ? `rotate(${-deg(tilt)} 120 160)` : undefined }, back.join("") + out.join(""));
  const bg = opts.background ? el("rect", { x: -40, y: -30, width: 320, height: 320, fill: opts.background }) : "";
  const size = opts.size ? { width: opts.size, height: opts.size } : {};
  return el("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "-40 -30 320 320", ...size, role: "img", "aria-label": `${d.name}, ${ex.label.toLowerCase()}` },
    bg + body + front.join(""));
}

/** Carried tools, drawn under the mitt that holds them. */
function toolSvg(tool: string, hands: ([number, number] | null)[], d: Goblin): string {
  const [rx, ry] = hands[1] ?? [1.2, -1.0];
  const g = (body: string, rot = 0) => el("g", { transform: `rotate(${rot} ${X(rx)} ${Y(ry)})` }, body);
  const S2 = { ...line, "stroke-width": 3 };
  switch (tool) {
    case "wrench": {
      // flat open-end wrench: C-shaped jaw on top, ring at the grip end
      const cx = X(rx), top = Y(ry + 1.0), bot = Y(ry - 0.05);
      const jaw = `M${cx + 5} ${top - 11} A12 12 0 1 1 ${cx - 5} ${top - 11} L${cx - 5} ${top} L${cx + 5} ${top}Z`;
      return g(el("rect", { x: cx - 5, y: top, width: 10, height: bot - top, rx: 3, fill: "#AEB6BF", ...S2 }) +
        el("path", { d: jaw, fill: "#AEB6BF", ...S2, transform: `rotate(-20 ${cx} ${top})` }) +
        el("circle", { cx, cy: bot + 4, r: 9, fill: "#AEB6BF", ...S2 }) + el("circle", { cx, cy: bot + 4, r: 4, fill: "#EFEBDD", ...line, "stroke-width": 2 }) +
        el("line", { x1: cx, y1: top + 8, x2: cx, y2: bot - 10, stroke: "#8A929C", "stroke-width": 3 }), 18);
    }
    case "hammer": return g(el("rect", { x: X(rx) - 4, y: Y(ry + 0.95), width: 8, height: 0.95 * R, rx: 3, fill: "#7A5236", ...S2 }) + el("rect", { x: X(rx) - 18, y: Y(ry + 1.1), width: 36, height: 16, rx: 3, fill: "#6C7480", ...S2 }), 16);
    case "sword": return g(el("rect", { x: X(rx) - 4, y: Y(ry + 0.2), width: 8, height: 0.3 * R, rx: 3, fill: "#5C3D27", ...S2 }) +
      el("rect", { x: X(rx) - 15, y: Y(ry + 0.27), width: 30, height: 6, rx: 3, fill: "#C9952B", ...S2 }) +
      el("path", { d: `M${X(rx) - 5} ${Y(ry + 0.3)} V${Y(ry + 1.55)} L${X(rx)} ${Y(ry + 1.72)} L${X(rx) + 5} ${Y(ry + 1.55)} V${Y(ry + 0.3)}Z`, fill: "#DDE3EA", ...S2 }), 12);
    case "wand": return g(el("line", { x1: X(rx), y1: Y(ry), x2: X(rx), y2: Y(ry + 0.9), stroke: "#3B2A20", "stroke-width": 5, "stroke-linecap": "round" }) + star(X(rx), Y(ry + 1.0), 11, "#F2B630", 2.5), 25);
    case "gameboy":
      // the back of a handheld: dark slab, blue and red grips, bumpers on top
      return el("rect", { x: X(-0.85), y: Y(-0.6), width: 0.36 * R, height: 0.5 * R, rx: 9, fill: "#00A2E8", ...S2 }) +
        el("rect", { x: X(0.49), y: Y(-0.6), width: 0.36 * R, height: 0.5 * R, rx: 9, fill: "#E60012", ...S2 }) +
        el("rect", { x: X(-0.52), y: Y(-0.62), width: 1.04 * R, height: 0.46 * R, rx: 3, fill: "#2C2C34", ...S2 }) +
        el("rect", { x: X(-0.8), y: Y(-0.55), width: 0.26 * R, height: 5, rx: 2, fill: "#1D1D22" }) + el("rect", { x: X(0.54), y: Y(-0.55), width: 0.26 * R, height: 5, rx: 2, fill: "#1D1D22" }) +
        el("path", { d: `M${X(-0.18)} ${Y(-0.82)} h${0.36 * R} M${X(-0.2)} ${Y(-0.92)} h${0.4 * R}`, stroke: "#45454F", "stroke-width": 2.5 });
    case "basketball": return el("circle", { cx: X(rx + 0.1), cy: Y(ry + 0.3), r: 0.33 * R, fill: "#E07A2E", ...S2 }) +
      el("path", { d: `M${X(rx + 0.1) - 0.33 * R} ${Y(ry + 0.3)} H${X(rx + 0.1) + 0.33 * R} M${X(rx + 0.1)} ${Y(ry + 0.63)} V${Y(ry - 0.03)} M${X(rx - 0.12)} ${Y(ry + 0.57)} Q${X(rx + 0.08)} ${Y(ry + 0.3)} ${X(rx - 0.12)} ${Y(ry + 0.03)} M${X(rx + 0.32)} ${Y(ry + 0.57)} Q${X(rx + 0.12)} ${Y(ry + 0.3)} ${X(rx + 0.32)} ${Y(ry + 0.03)}`, fill: "none", stroke: INK, "stroke-width": 2 });
    case "lantern": return el("path", { d: `M${X(rx) - 8} ${Y(ry - 0.05)} a8 8 0 0 1 16 0`, fill: "none", ...S2 }) +
      el("path", { d: `M${X(rx) - 12} ${Y(ry - 0.12)} h24 l-4 -8 h-16Z`, fill: "#3A3A44", ...S2 }) +
      el("rect", { x: X(rx) - 10, y: Y(ry - 0.15), width: 20, height: 22, rx: 3, fill: "#FFD35C", ...S2 }) +
      el("rect", { x: X(rx) - 13, y: Y(ry - 0.15) + 22, width: 26, height: 5, rx: 2, fill: "#3A3A44", ...S2 });
    case "mug": return el("path", { d: `M${X(rx + 0.2)} ${Y(ry + 0.2)} a7 7 0 0 1 0 14`, fill: "none", stroke: INK, "stroke-width": 6 }) +
      el("path", { d: `M${X(rx + 0.2)} ${Y(ry + 0.2)} a7 7 0 0 1 0 14`, fill: "none", stroke: "#ECE6D6", "stroke-width": 2.5 }) +
      el("rect", { x: X(rx - 0.22), y: Y(ry + 0.38), width: 0.42 * R, height: 0.4 * R, rx: 4, fill: "#ECE6D6", ...S2 }) +
      el("rect", { x: X(rx - 0.22), y: Y(ry + 0.25), width: 0.42 * R, height: 6, fill: d.hatColor }) +
      el("path", { d: `M${X(rx - 0.08)} ${Y(ry + 0.48)} q-4 -8 0 -14 M${X(rx + 0.06)} ${Y(ry + 0.5)} q-4 -8 0 -14`, fill: "none", stroke: "#B9B29C", "stroke-width": 2.5, "stroke-linecap": "round" });
    case "book": return g(el("rect", { x: X(rx - 0.25), y: Y(ry + 0.62), width: 0.5 * R, height: 0.7 * R, rx: 3, fill: d.hatColor === "#25221F" ? "#7A2E2E" : d.hatColor, ...S2 }) +
      el("rect", { x: X(rx + 0.2), y: Y(ry + 0.58), width: 5, height: 0.62 * R, fill: "#F4EEDC", stroke: INK, "stroke-width": 1.5 }) +
      el("rect", { x: X(rx - 0.25), y: Y(ry + 0.62), width: 6, height: 0.7 * R, fill: "#C9952B" }), -10);
    case "testtube": return g(el("rect", { x: X(rx) - 7, y: Y(ry + 0.85), width: 14, height: 0.75 * R, rx: 7, fill: "#E3F1F5", ...S2 }) + el("rect", { x: X(rx) - 4.5, y: Y(ry + 0.45), width: 9, height: 0.42 * R, rx: 4.5, fill: "#7CF2C8" }) + el("rect", { x: X(rx) - 9, y: Y(ry + 0.88), width: 18, height: 5, rx: 2, fill: "#E3F1F5", ...line, "stroke-width": 2 }) + el("circle", { cx: X(rx) + 1, cy: Y(ry + 0.6), r: 2.2, fill: "#FFFFFF" }), 10);
    case "spatula": return g(el("rect", { x: X(rx) - 4, y: Y(ry + 0.7), width: 8, height: 0.7 * R, rx: 3, fill: "#3A3A44", ...S2 }) + el("rect", { x: X(rx) - 11, y: Y(ry + 1.15), width: 22, height: 26, rx: 3, fill: "#AEB6BF", ...S2 }) + el("path", { d: `M${X(rx) - 5} ${Y(ry + 1.1)} v18 M${X(rx)} ${Y(ry + 1.1)} v18 M${X(rx) + 5} ${Y(ry + 1.1)} v18`, stroke: "#6C7480", "stroke-width": 2 }), 16);
    case "paintbrush": return g(el("rect", { x: X(rx) - 4, y: Y(ry + 0.75), width: 8, height: 0.75 * R, rx: 3, fill: "#C9652B", ...S2 }) + el("rect", { x: X(rx) - 5, y: Y(ry + 0.88), width: 10, height: 9, fill: "#AEB6BF", ...line, "stroke-width": 2 }) + el("path", { d: `M${X(rx) - 5} ${Y(ry + 0.88)} Q${X(rx)} ${Y(ry + 1.25)} ${X(rx) + 5} ${Y(ry + 0.88)}Z`, fill: d.hatColor, ...line, "stroke-width": 2 }), 20);
    case "pickaxe": return g(el("rect", { x: X(rx) - 4, y: Y(ry + 1.0), width: 8, height: 1.0 * R, rx: 3, fill: "#7A5236", ...S2 }) + el("path", { d: `M${X(rx) - 30} ${Y(ry + 0.85)} Q${X(rx)} ${Y(ry + 1.25)} ${X(rx) + 30} ${Y(ry + 0.85)}`, fill: "none", stroke: INK, "stroke-width": 11, "stroke-linecap": "round" }) + el("path", { d: `M${X(rx) - 30} ${Y(ry + 0.85)} Q${X(rx)} ${Y(ry + 1.25)} ${X(rx) + 30} ${Y(ry + 0.85)}`, fill: "none", stroke: "#6C7480", "stroke-width": 6, "stroke-linecap": "round" }), 16);
    case "spyglass": return g(el("rect", { x: X(rx) - 4, y: Y(ry + 0.3), width: 8, height: 0.3 * R, rx: 3, fill: "#C9952B", ...S2 }) + el("rect", { x: X(rx) - 5, y: Y(ry + 0.65), width: 10, height: 0.36 * R, rx: 3, fill: "#7A5236", ...S2 }) + el("rect", { x: X(rx) - 7, y: Y(ry + 1.12), width: 14, height: 0.48 * R, rx: 3, fill: "#C9952B", ...S2 }) + el("rect", { x: X(rx) - 7, y: Y(ry + 1.12), width: 14, height: 4, fill: "#9FD3E6" }), 35);
    case "flower": return g(el("line", { x1: X(rx), y1: Y(ry), x2: X(rx), y2: Y(ry + 0.85), stroke: "#2E6B46", "stroke-width": 4, "stroke-linecap": "round" }) + Array.from({ length: 6 }, (_, kk) => { const a = (kk / 6) * Math.PI * 2; return el("circle", { cx: X(rx) + Math.cos(a) * 8, cy: Y(ry + 0.9) + Math.sin(a) * 8, r: 6, fill: "#E35D9C", stroke: INK, "stroke-width": 2 }); }).join("") + el("circle", { cx: X(rx), cy: Y(ry + 0.9), r: 5, fill: "#F2B630", stroke: INK, "stroke-width": 2 }), 12);
    case "milkpitcher": return el("path", { d: `M${X(rx - 0.18)} ${Y(ry + 0.6)} L${X(rx + 0.12)} ${Y(ry + 0.6)} L${X(rx + 0.24)} ${Y(ry + 0.68)} L${X(rx + 0.16)} ${Y(ry + 0.5)} L${X(rx + 0.2)} ${Y(ry + 0.12)} L${X(rx - 0.22)} ${Y(ry + 0.12)}Z`, fill: "#AEB6BF", ...S2 }) +
      el("path", { d: `M${X(rx - 0.2)} ${Y(ry + 0.5)} q-12 4 -2 18`, fill: "none", stroke: INK, "stroke-width": 6 }) + el("path", { d: `M${X(rx - 0.2)} ${Y(ry + 0.5)} q-12 4 -2 18`, fill: "none", stroke: "#AEB6BF", "stroke-width": 2.5 }) +
      el("line", { x1: X(rx - 0.12), x2: X(rx + 0.1), y1: Y(ry + 0.35), y2: Y(ry + 0.35), stroke: "#8A929C", "stroke-width": 2 });
    case "palette": {
      const cx = X(rx - 0.05), cy = Y(ry + 0.35);
      const blob = (dx: number, dy: number, c: string) => el("ellipse", { cx: cx + dx, cy: cy + dy, rx: 5, ry: 4, fill: c });
      return el("path", { d: `M${cx} ${cy - 22} C${cx + 28} ${cy - 24} ${cx + 33} ${cy + 6} ${cx + 19} ${cy + 19} C${cx + 5} ${cy + 30} ${cx - 25} ${cy + 24} ${cx - 27} ${cy + 3} C${cx - 30} ${cy - 16} ${cx - 19} ${cy - 21} ${cx - 7} ${cy - 16} C${cx - 3} ${cy - 12} ${cx - 10} ${cy - 3} ${cx - 3} ${cy - 3} C${cx + 5} ${cy - 3} ${cx + 3} ${cy - 13} ${cx} ${cy - 22}Z`, fill: "#C99A62", ...S2 }) +
        el("circle", { cx: cx - 12, cy: cy - 4, r: 4, fill: "#EFEBDD", ...line, "stroke-width": 2 }) +
        blob(13, -12, "#D8402F") + blob(20, 3, "#F2B630") + blob(10, 16, "#2F6FD6") + blob(-6, 17, "#3E9B4F") + blob(-19, 6, "#FFFFFF") +
        el("line", { x1: cx - 12, y1: cy - 4, x2: cx - 30, y2: cy - 34, stroke: "#C9652B", "stroke-width": 4, "stroke-linecap": "round" }) + el("circle", { cx: cx - 31, cy: cy - 36, r: 3.5, fill: "#D8402F", ...line, "stroke-width": 1.5 });
    }
    case "briefcase": return el("path", { d: `M${X(rx) - 7} ${Y(ry) + 4} a7 7 0 0 1 14 0`, fill: "none", stroke: INK, "stroke-width": 4 }) +
      el("rect", { x: X(rx - 0.38), y: Y(ry) + 4, width: 0.76 * R, height: 0.52 * R, rx: 5, fill: "#6B4226", ...S2 }) +
      el("line", { x1: X(rx - 0.38), x2: X(rx + 0.38), y1: Y(ry) + 14, y2: Y(ry) + 14, stroke: "#4A2E1A", "stroke-width": 2.5 }) +
      el("rect", { x: X(rx - 0.25), y: Y(ry) + 10, width: 6, height: 6, fill: "#C9952B" }) + el("rect", { x: X(rx + 0.2), y: Y(ry) + 10, width: 6, height: 6, fill: "#C9952B" });
    default: return "";
  }
}

function star(cx: number, cy: number, r: number, fill: string, sw = 3) {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.38 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return el("polygon", { points: pts.join(" "), fill, ...line, "stroke-width": sw });
}
function heart(cx: number, cy: number, s: number) {
  return el("path", { d: `M${cx} ${cy + s * 0.9} C${cx - s * 1.4} ${cy} ${cx - s * 0.8} ${cy - s * 0.95} ${cx} ${cy - s * 0.35} C${cx + s * 0.8} ${cy - s * 0.95} ${cx + s * 1.4} ${cy} ${cx} ${cy + s * 0.9}Z`, fill: "#E2443A", ...line, "stroke-width": 3 });
}
function zee(cx: number, cy: number, s: number) {
  return el("path", { d: `M${cx - s} ${cy - s} H${cx + s} L${cx - s} ${cy + s} H${cx + s}`, fill: "none", ...line, "stroke-width": Math.max(3, s * 0.35) });
}
function question(cx: number, cy: number) {
  return el("g", { transform: `translate(${cx} ${cy})` },
    el("path", { d: "M-11 -10 Q-11 -24 0 -24 Q12 -24 12 -12 Q12 -4 3 0 Q0 2 0 8", fill: "none", stroke: INK, "stroke-width": 11, "stroke-linecap": "round", "stroke-linejoin": "round" }) +
    el("path", { d: "M-11 -10 Q-11 -24 0 -24 Q12 -24 12 -12 Q12 -4 3 0 Q0 2 0 8", fill: "none", stroke: "#F2B630", "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }) +
    el("circle", { cx: 0, cy: 20, r: 5.5, fill: "#F2B630", ...line, "stroke-width": 3 }));
}
function dropPath(cx: number, cy: number, s: number) {
  return el("path", { d: `M${cx} ${cy - 12 * s} Q${cx + 8 * s} ${cy} ${cx + 6 * s} ${cy + 4 * s} A6.5 6.5 0 1 1 ${cx - 6 * s} ${cy + 4 * s} Q${cx - 8 * s} ${cy} ${cx} ${cy - 12 * s}Z`, fill: "#7EC8F0", ...line, "stroke-width": 3 });
}
