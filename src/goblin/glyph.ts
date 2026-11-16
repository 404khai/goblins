import type { Goblin } from "./types";

/**
 * A single-colour outline icon of a goblin, in the spirit of an SF Symbol: strokes only, solid
 * eyes, no fills, and every part knocks out what lies under it (with a small gap), so overlapping
 * shapes stay readable at 20px. Same geometry as goblinSvg, simplified.
 */

export interface GlyphOptions {
  /** Stroke and eye colour. Default white, so hosts can tint it as a template image. */
  color?: string;
  /** Stroke width in viewBox units (the viewBox is 310 wide). Default 22 (about 1.4px at 20px). */
  strokeWidth?: number;
  /** Pixel width/height attributes. Omit for a fluid SVG. */
  size?: number;
  /** Prefix for mask ids, so several glyphs can share a page. */
  idPrefix?: string;
}

const R = 60;
const X = (x: number) => +(120 + x * R).toFixed(2);
const Y = (y: number) => +(150 - y * R).toFixed(2);
const HEADS: Record<Goblin["head"], [number, number]> = { round: [1.04, 0.96], egg: [0.9, 1.1], wide: [1.2, 0.86], bean: [0.98, 1.0] };

type Part = { tag: "path" | "ellipse" | "circle" | "rect"; a: Record<string, number | string>; solid?: boolean; open?: boolean };

const ell = (cx: number, cy: number, rx: number, ry: number, solid = false, rotate = 0): Part =>
  ({ tag: "ellipse", a: { cx: X(cx), cy: Y(cy), rx: +(rx * R).toFixed(2), ry: +(ry * R).toFixed(2), ...(rotate ? { transform: `rotate(${rotate} ${X(cx)} ${Y(cy)})` } : {}) }, solid });
const path = (d: string, solid = false, open = false): Part => ({ tag: "path", a: { d }, solid, open });

function parts(d: Goblin): Part[] {
  const [hx, hy] = HEADS[d.head] ?? HEADS.round;
  const out: Part[] = [];

  // ears
  const EARS = { pointy: [0.24, 0.9, -0.15], long: [0.2, 1.4, 0.35], droopy: [0.24, 0.95, -0.85], tiny: [0.17, 0.5, 0.05] } as const;
  for (const s of [-1, 1]) {
    if (d.ears === "round") { out.push(ell(s * hx * 0.97, 0.12, 0.2, 0.3)); continue; }
    const [r, h, a] = EARS[d.ears] ?? EARS.pointy;
    const dx = s * Math.cos(a), dy = Math.sin(a), bx = s * hx * 0.78, by = 0.08, px = -dy, py = dx;
    out.push(path(`M${X(bx + px * r)} ${Y(by + py * r)} Q${X(bx + dx * h * 0.55 + px * r * 0.9)} ${Y(by + dy * h * 0.55 + py * r * 0.9)} ${X(bx + dx * h)} ${Y(by + dy * h)} Q${X(bx + dx * h * 0.55 - px * r * 0.9)} ${Y(by + dy * h * 0.55 - py * r * 0.9)} ${X(bx - px * r)} ${Y(by - py * r)}Z`));
  }

  out.push(ell(0, 0, hx, hy));

  // beard silhouettes
  if (d.beard === "full") out.push(path(`M${X(-0.95 * hx)} ${Y(-0.25)} Q${X(-1.05 * hx)} ${Y(-1.45)} ${X(0)} ${Y(-1.78)} Q${X(1.05 * hx)} ${Y(-1.45)} ${X(0.95 * hx)} ${Y(-0.25)} Q${X(0)} ${Y(-0.05)} ${X(-0.95 * hx)} ${Y(-0.25)}Z`));
  else if (d.beard === "pointy") out.push(path(`M${X(-0.72 * hx)} ${Y(-0.35)} Q${X(-0.5 * hx)} ${Y(-1.2)} ${X(0)} ${Y(-1.95)} Q${X(0.5 * hx)} ${Y(-1.2)} ${X(0.72 * hx)} ${Y(-0.35)} Q${X(0)} ${Y(-0.15)} ${X(-0.72 * hx)} ${Y(-0.35)}Z`));
  else if (d.beard === "forked") out.push(path(`M${X(-0.77 * hx)} ${Y(-0.45)} Q${X(-0.75 * hx)} ${Y(-1.0)} ${X(-0.42)} ${Y(-1.75)} L${X(0)} ${Y(-1.1)} L${X(0.42)} ${Y(-1.75)} Q${X(0.75 * hx)} ${Y(-1.0)} ${X(0.77 * hx)} ${Y(-0.45)} Q${X(0)} ${Y(-0.1)} ${X(-0.77 * hx)} ${Y(-0.45)}Z`));
  else if (d.beard === "braid") {
    out.push(ell(0, -0.55, 0.77 * hx, 0.52));
    [0.3, 0.25, 0.21, 0.17].forEach((r, k) => out.push(ell(0, -1.0 - k * 0.32, r, r * 0.9)));
  }

  // hats
  const capY = 0.48 * hy;
  if (d.hat === "gnome" || d.hat === "wizard") {
    const wiz = d.hat === "wizard", w = hx * 1.04;
    const tipX = wiz ? -0.75 : 0.6, tipY = capY + (wiz ? 2.3 : 2.0);
    if (wiz) out.push(ell(0, capY + 0.02, hx * 1.65, 0.14));
    out.push(path(`M${X(-w)} ${Y(capY)} Q${X(-w * 0.55)} ${Y(capY + 1.3)} ${X(tipX)} ${Y(tipY)} Q${X(w * 0.85)} ${Y(capY + 1.1)} ${X(w)} ${Y(capY)} Q${X(0)} ${Y(capY - 0.12)} ${X(-w)} ${Y(capY)}Z`));
    if (!wiz) out.push({ tag: "rect", a: { x: X(-w), y: Y(capY + 0.12), width: w * 2 * R, height: 0.24 * R, rx: 0.12 * R } });
  } else if (d.hat === "beret") out.push(ell(-0.08, hy * 0.7, hx * 1.14 * 1.08, 0.38, false, -12));
  else if (d.hat === "beanie") {
    const rx = 1.06 * hx * 1.02, base = capY - 0.15;
    out.push(path(`M${X(-rx)} ${Y(base)} A${rx * R} ${1.06 * hy * R} 0 0 1 ${X(rx)} ${Y(base)}Z`));
    out.push({ tag: "rect", a: { x: X(-hx * 1.1), y: Y(capY + 0.07), width: hx * 2.2 * R, height: 0.3 * R, rx: 8 } });
    out.push({ tag: "circle", a: { cx: X(0), cy: Y(base + 1.06 * hy + 0.05), r: 0.24 * R } });
  } else if (d.hat === "mushroom") {
    const rx = 1.5 * hx * 1.02, ry = 1.5 * 0.75, base = capY + 0.05;
    out.push(path(`M${X(-rx)} ${Y(base)} A${rx * R} ${ry * R} 0 0 1 ${X(rx)} ${Y(base)} Q${X(0)} ${Y(base - 0.12)} ${X(-rx)} ${Y(base)}Z`));
  } else if (d.hat === "sprout") {
    for (const [x, h, rz] of [[-0.25, 0.4, 0.5], [0.25, 0.4, -0.5], [0, 0.5, 0]] as const) out.push(ell(x, hy + h * 0.55, 0.15, h * 0.6, false, -(rz * 180) / Math.PI));
  } else if (d.hat === "headband") out.push({ tag: "rect", a: { x: X(-hx * 0.93), y: Y(capY + 0.1), width: hx * 1.86 * R, height: 0.2 * R, rx: 5 } });
  else if (d.hat === "tophat") {
    out.push({ tag: "rect", a: { x: X(-hx * 1.3), y: Y(capY + 0.1), width: hx * 2.6 * R, height: 0.14 * R, rx: 5 } });
    out.push({ tag: "rect", a: { x: X(-hx * 0.72), y: Y(capY + 1.2), width: hx * 1.44 * R, height: 1.1 * R, rx: 4 } });
  } else if (d.hat === "pirate") {
    const w = hx * 1.45, b = capY + 0.05;
    out.push(path(`M${X(-w)} ${Y(b + 0.25)} Q${X(-w * 0.7)} ${Y(b - 0.05)} ${X(0)} ${Y(b + 0.05)} Q${X(w * 0.7)} ${Y(b - 0.05)} ${X(w)} ${Y(b + 0.25)} Q${X(w * 0.6)} ${Y(b + 0.95)} ${X(0)} ${Y(b + 0.85)} Q${X(-w * 0.6)} ${Y(b + 0.95)} ${X(-w)} ${Y(b + 0.25)}Z`));
  } else if (d.hat === "hardhat") {
    const rx = 1.08 * hx, b = capY - 0.12;
    out.push(path(`M${X(-rx)} ${Y(b)} A${rx * R} ${0.95 * R} 0 0 1 ${X(rx)} ${Y(b)}Z`));
    out.push({ tag: "rect", a: { x: X(-hx * 1.25), y: Y(b + 0.06), width: hx * 2.5 * R, height: 0.13 * R, rx: 5 } });
  } else if (d.hat === "chef") {
    const b = capY - 0.02, w = hx * 0.92;
    out.push(path(`M${X(-w)} ${Y(b)} L${X(-w)} ${Y(b + 0.65)} A${0.42 * R} ${0.42 * R} 0 0 1 ${X(-0.2)} ${Y(b + 1.35)} A${0.55 * R} ${0.55 * R} 0 0 1 ${X(0.25)} ${Y(b + 1.35)} A${0.42 * R} ${0.42 * R} 0 0 1 ${X(w)} ${Y(b + 0.65)} L${X(w)} ${Y(b)}Z`));
  } else if (d.hat === "straw") {
    out.push(ell(0, capY - 0.05, hx * 1.85, 0.22));
    out.push(path(`M${X(-hx * 0.85)} ${Y(capY - 0.05)} Q${X(-hx * 0.8)} ${Y(capY + 0.57)} ${X(0)} ${Y(capY + 0.6)} Q${X(hx * 0.8)} ${Y(capY + 0.57)} ${X(hx * 0.85)} ${Y(capY - 0.05)}Z`));
  } else if (d.hat === "astronaut") {
    out.push({ tag: "circle", a: { cx: X(0), cy: Y(0.12), r: Math.max(hx, hy) * 1.42 * R } });
  } else if (d.hat === "crown") {
    const b = capY + 0.05, w = hx * 0.62;
    out.push(path(`M${X(-w)} ${Y(b)} L${X(-w)} ${Y(b + 0.45)} L${X(-w * 0.5)} ${Y(b + 0.22)} L${X(0)} ${Y(b + 0.55)} L${X(w * 0.5)} ${Y(b + 0.22)} L${X(w)} ${Y(b + 0.45)} L${X(w)} ${Y(b)}Z`));
  }

  // nose
  const NY = -0.08;
  if (d.nose === "bulb") out.push(ell(0, NY, 0.23, 0.21));
  else if (d.nose === "button") out.push(ell(0, NY, 0.14, 0.12));
  else if (d.nose === "long") out.push(path(`M${X(-0.12)} ${Y(NY + 0.1)} Q${X(0)} ${Y(NY + 0.22)} ${X(0.12)} ${Y(NY + 0.1)} L${X(0.04)} ${Y(NY - 0.45)} Q${X(0)} ${Y(NY - 0.52)} ${X(-0.04)} ${Y(NY - 0.45)}Z`));
  else out.push(path(`M${X(-0.15)} ${Y(NY + 0.12)} Q${X(0.05)} ${Y(NY + 0.25)} ${X(0.17)} ${Y(NY)} Q${X(0.12)} ${Y(NY - 0.3)} ${X(-0.12)} ${Y(NY - 0.32)} Q${X(0.02)} ${Y(NY - 0.12)} ${X(-0.15)} ${Y(NY + 0.12)}Z`));

  // eyes: solid
  const EX = hx * 0.36, EY = 0.15;
  if (d.eyes === "visor") {
    out.push({ tag: "rect", a: { x: X(-hx * 0.6), y: Y(EY + 0.22), width: hx * 1.2 * R, height: 0.44 * R, rx: 12 } });
    for (const s of [-1, 1]) out.push({ tag: "rect", a: { x: X(s * EX - 0.13), y: Y(EY + 0.07), width: 0.26 * R, height: 0.14 * R, rx: 4 }, solid: true });
  } else for (const s of [-1, 1]) {
    if (d.eyes === "beady") out.push(ell(s * EX, EY, 0.11, 0.13, true));
    else if (d.eyes === "wonky" && s > 0) out.push({ tag: "rect", a: { x: X(s * EX - 0.16), y: Y(EY + 0.12), width: 0.36 * R, height: 0.26 * R, rx: 6, transform: `rotate(7 ${X(s * EX)} ${Y(EY)})` }, solid: true });
    else {
      const big = d.eyes === "wonky" ? 1.2 : 1;
      out.push(ell(s * EX, EY, 0.17 * big * (d.eyes === "oval" ? 0.85 : 1), 0.19 * big * (d.eyes === "oval" ? 1.3 : 1), true));
    }
  }

  // eyewear
  if (d.eyewear === "round") for (const s of [-1, 1]) out.push({ tag: "circle", a: { cx: X(s * EX), cy: Y(EY), r: 0.27 * R } });
  if (d.eyewear === "shades") for (const s of [-1, 1]) out.push({ tag: "circle", a: { cx: X(s * EX), cy: Y(EY), r: 0.27 * R }, solid: true });
  if (d.eyewear === "monocle") out.push({ tag: "circle", a: { cx: X(EX), cy: Y(EY), r: 0.29 * R } });

  if (d.extras?.includes("headphones")) {
    const tall = d.hat === "gnome" || d.hat === "wizard" || d.hat === "mushroom";
    const r = hx * (tall ? 1.18 : 1.1), top = hy + (tall ? 0.6 : 0.35);
    out.push(path(`M${X(-hx * 1.04)} ${Y(0.1)} C${X(-r)} ${Y(top)} ${X(r)} ${Y(top)} ${X(hx * 1.04)} ${Y(0.1)}`, false, true));
    for (const s of [-1, 1]) out.push({ tag: "rect", a: { x: X(s * hx * 1.04) - 12, y: Y(0.1) - 24, width: 24, height: 48, rx: 11 } });
  }
  return out;
}

const attrs = (a: Record<string, number | string>) => Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ");

export function goblinGlyphSvg(d: Goblin, opts: GlyphOptions = {}): string {
  const color = opts.color ?? "#FFFFFF";
  const sw = opts.strokeWidth ?? 22;
  const id = opts.idPrefix ?? `gg${Math.random().toString(36).slice(2, 7)}`;
  const list = parts(d);
  const defs: string[] = [];
  const body: string[] = [];
  list.forEach((p, i) => {
    // knock out everything drawn above this part, plus a gap the width of a stroke
    const above = list.slice(i + 1).filter((q) => !q.open || true);
    const mask = `${id}-${i}`;
    if (above.length) {
      defs.push(`<mask id="${mask}" maskUnits="userSpaceOnUse" x="-60" y="-60" width="420" height="420"><rect x="-60" y="-60" width="420" height="420" fill="#fff"/>${above
        .map((q) => `<${q.tag} ${attrs(q.a)} fill="${q.open ? "none" : "#000"}" stroke="#000" stroke-width="${sw * 2.2}" stroke-linejoin="round" stroke-linecap="round"/>`)
        .join("")}</mask>`);
    }
    const paint = p.solid ? `fill="${color}" stroke="${color}" stroke-width="${sw * 0.5}"` : `fill="none" stroke="${color}" stroke-width="${sw}"`;
    body.push(`<${p.tag} ${attrs(p.a)} ${paint} stroke-linejoin="round" stroke-linecap="round"${above.length ? ` mask="url(#${mask})"` : ""}/>`);
  });
  const size = opts.size ? ` width="${opts.size}" height="${opts.size}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-35 -35 310 310"${size} role="img" aria-label="${(d.name ?? "goblin").replace(/[<>&"]/g, "")}"><defs>${defs.join("")}</defs>${body.join("")}</svg>`;
}
