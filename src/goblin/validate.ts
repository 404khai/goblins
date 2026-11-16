import { EXPRESSION_IDS } from "./poses";
import { MORPH_IDS, type MorphId } from "./spells";
import { OPTIONS, type ExpressionId } from "./types";

/** Every name a host can send is checked here. Nothing in this file throws. */

export const GESTURES = ["bounce", "nod", "spin"] as const;
export type Gesture = (typeof GESTURES)[number];
export const LAYOUTS = ["row", "single", "cluster"] as const;
export type Layout = (typeof LAYOUTS)[number];

export const isExpressionId = (v: unknown): v is ExpressionId => typeof v === "string" && (EXPRESSION_IDS as string[]).includes(v);
export const isMorphId = (v: unknown): v is MorphId => typeof v === "string" && (MORPH_IDS as string[]).includes(v);
export const isGesture = (v: unknown): v is Gesture => typeof v === "string" && (GESTURES as readonly string[]).includes(v);
export const isLayout = (v: unknown): v is Layout => typeof v === "string" && (LAYOUTS as readonly string[]).includes(v);

/** One beat of a performance: an expression, a spell (or null to drop one), for a time. */
export interface SequenceStep { expression?: ExpressionId; morph?: MorphId | null; ms: number }
export type SequenceInput = (string | { expression?: string; morph?: string | null; ms?: number })[];

const DEFAULT_STEP_MS = 2000;

/**
 * Normalizes a sequence. Strings name an expression or a spell; objects may carry both.
 * Returns null if any step names something unknown or the sequence is empty.
 */
export function normalizeSequence(seq: unknown): SequenceStep[] | null {
  if (!Array.isArray(seq) || seq.length === 0 || seq.length > 500) return null;
  const out: SequenceStep[] = [];
  for (const step of seq) {
    if (typeof step === "string") {
      if (isExpressionId(step)) out.push({ expression: step, ms: DEFAULT_STEP_MS });
      else if (isMorphId(step)) out.push({ morph: step, ms: DEFAULT_STEP_MS });
      else return null;
      continue;
    }
    if (!step || typeof step !== "object") return null;
    const s = step as Record<string, unknown>;
    const st: SequenceStep = { ms: DEFAULT_STEP_MS };
    if (s.expression !== undefined) { if (!isExpressionId(s.expression)) return null; st.expression = s.expression; }
    if (s.morph !== undefined) { if (s.morph !== null && !isMorphId(s.morph)) return null; st.morph = s.morph as MorphId | null; }
    if (s.ms !== undefined) { if (typeof s.ms !== "number" || !Number.isFinite(s.ms) || s.ms < 50 || s.ms > 600000) return null; st.ms = s.ms; }
    if (st.expression === undefined && st.morph === undefined) return null;
    out.push(st);
  }
  return out;
}

const HEX = "^#[0-9a-fA-F]{6}$";

/** goblins/v1 as JSON Schema (draft 2020-12): a single recipe, and the file that wraps recipes. */
export function goblinSchema() {
  const traits: Record<string, unknown> = {};
  for (const [k, o] of Object.entries(OPTIONS)) {
    traits[k] = o.multi
      ? { type: "array", items: { enum: o.values }, uniqueItems: true, description: o.label }
      : o.color
        ? { type: "string", pattern: HEX, description: `${o.label}. Any #rrggbb color; the studio offers ${o.values.join(", ")}.` }
        : { enum: o.values, description: o.label };
  }
  const recipe = {
    type: "object",
    description: "One goblin. Unknown fields are allowed and ignored.",
    required: ["name", ...Object.entries(OPTIONS).filter(([, o]) => !o.optional).map(([k]) => k)],
    properties: {
      id: { type: "string", maxLength: 64, description: "Stable id a host uses to address this goblin." },
      name: { type: "string", minLength: 1, maxLength: 16 },
      expression: { enum: EXPRESSION_IDS, default: "idle" },
      morph: { anyOf: [{ enum: MORPH_IDS }, { type: "null" }], default: null, description: "A spell (3D only)." },
      ...traits,
    },
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://github.com/404khai/goblins/goblins.schema.json",
    title: "Goblins recipe file (goblins/v1)",
    type: "object",
    required: ["goblins"],
    properties: {
      $schema: { const: "goblins/v1" },
      version: { const: 1 },
      goblins: { type: "array", items: { $ref: "#/$defs/goblin" } },
    },
    $defs: { goblin: recipe },
  };
}

export interface ValidationError { path: string; message: string }

/**
 * Strictly checks one recipe against goblins/v1 and lists every problem (empty = valid).
 * fromJSON stays lenient; use this to tell an author what fromJSON would have fixed for them.
 */
export function validate(recipe: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!recipe || typeof recipe !== "object" || Array.isArray(recipe)) return [{ path: "", message: "must be an object" }];
  const r = recipe as Record<string, unknown>;
  const hex = new RegExp(HEX);
  if (r.id !== undefined && (typeof r.id !== "string" || r.id.length === 0 || r.id.length > 64)) errors.push({ path: "id", message: "must be a string of 1 to 64 characters" });
  if (typeof r.name !== "string" || r.name.trim().length === 0) errors.push({ path: "name", message: "is required and must be a non-empty string" });
  else if (r.name.length > 16) errors.push({ path: "name", message: "must be 16 characters or fewer" });
  if (r.expression !== undefined && !isExpressionId(r.expression)) errors.push({ path: "expression", message: `must be one of ${EXPRESSION_IDS.join(", ")}` });
  if (r.morph !== undefined && r.morph !== null && !isMorphId(r.morph)) errors.push({ path: "morph", message: `must be null or one of ${MORPH_IDS.join(", ")}` });
  for (const [k, o] of Object.entries(OPTIONS)) {
    const v = r[k];
    if (v === undefined) { if (!o.optional) errors.push({ path: k, message: "is required" }); continue; }
    if (o.multi) {
      if (!Array.isArray(v)) { errors.push({ path: k, message: "must be an array" }); continue; }
      v.forEach((x, i) => { if (!o.values.includes(x as string)) errors.push({ path: `${k}[${i}]`, message: `must be one of ${o.values.join(", ")}` }); });
      if (new Set(v).size !== v.length) errors.push({ path: k, message: "must not repeat items" });
    } else if (o.color) {
      if (typeof v !== "string" || !hex.test(v)) errors.push({ path: k, message: "must be a #rrggbb color" });
    } else if (!o.values.includes(v as string)) errors.push({ path: k, message: `must be one of ${o.values.join(", ")}` });
  }
  return errors;
}
