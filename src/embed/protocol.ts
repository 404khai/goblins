import { fromJSON } from "../goblin/export";
import type { MorphId } from "../goblin/spells";
import type { ExpressionId, Goblin } from "../goblin/types";
import { isExpressionId, isGesture, isLayout, isMorphId, normalizeSequence, type Gesture, type Layout, type SequenceStep } from "../goblin/validate";

/**
 * The goblins message protocol, version 1. Pure: no DOM and no three, so hosts and tests can use
 * it directly. Unknown fields are ignored; anything malformed comes back as an error message.
 */

export const PROTOCOL_VERSION = 1;

export type InMessage =
  | { v: 1; type: "set"; goblins: Goblin[] }
  | { v: 1; type: "expression"; id: string; expression: ExpressionId }
  | { v: 1; type: "cast"; id: string; morph: MorphId | null }
  | { v: 1; type: "play"; id: string; sequence: SequenceStep[]; loop: boolean }
  | { v: 1; type: "poke"; id: string; gesture: Gesture }
  | { v: 1; type: "layout"; mode: Layout };

export type OutMessage =
  | { v: 1; type: "ready" }
  | { v: 1; type: "click"; id: string }
  | { v: 1; type: "state"; id: string; expression: ExpressionId; morph: MorphId | null }
  | { v: 1; type: "error"; message: string };

export type Parsed = { ok: true; msg: InMessage } | { ok: false; error: string };

const bad = (error: string): Parsed => ({ ok: false, error });
const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 64;

/** Accepts an object or a JSON string. */
export function parseMessage(raw: unknown): Parsed {
  let m: unknown = raw;
  if (typeof raw === "string") {
    try { m = JSON.parse(raw); } catch { return bad("message is not valid JSON"); }
  }
  if (!m || typeof m !== "object" || Array.isArray(m)) return bad("message must be an object");
  const o = m as Record<string, unknown>;
  if (o.v !== PROTOCOL_VERSION) return bad(`unsupported protocol version ${JSON.stringify(o.v)}; expected 1`);
  switch (o.type) {
    case "set": {
      if (!Array.isArray(o.goblins)) return bad("set: goblins must be an array");
      if (o.goblins.length > 64) return bad("set: at most 64 goblins");
      if (o.goblins.length === 0) return { ok: true, msg: { v: 1, type: "set", goblins: [] } };
      let goblins: Goblin[];
      try { goblins = fromJSON(JSON.stringify(o.goblins)); } catch (e) { return bad(`set: ${(e as Error).message}`); }
      const ids = new Set<string>();
      for (const [i, g] of goblins.entries()) {
        const raw = (o.goblins as Record<string, unknown>[])[i];
        if (!isId(raw.id)) return bad(`set: goblins[${i}].id must be a string of 1 to 64 characters`);
        if (ids.has(g.id)) return bad(`set: duplicate id "${g.id}"`);
        ids.add(g.id);
      }
      return { ok: true, msg: { v: 1, type: "set", goblins } };
    }
    case "expression":
      if (!isId(o.id)) return bad("expression: id is required");
      if (!isExpressionId(o.expression)) return bad(`expression: unknown expression ${JSON.stringify(o.expression)}`);
      return { ok: true, msg: { v: 1, type: "expression", id: o.id, expression: o.expression } };
    case "cast":
      if (!isId(o.id)) return bad("cast: id is required");
      if (o.morph !== null && !isMorphId(o.morph)) return bad(`cast: unknown spell ${JSON.stringify(o.morph)}; use null to end a spell`);
      return { ok: true, msg: { v: 1, type: "cast", id: o.id, morph: o.morph as MorphId | null } };
    case "play": {
      if (!isId(o.id)) return bad("play: id is required");
      const sequence = normalizeSequence(o.sequence);
      if (!sequence) return bad("play: sequence must be a non-empty list of known expressions or spells");
      return { ok: true, msg: { v: 1, type: "play", id: o.id, sequence, loop: o.loop === true } };
    }
    case "poke":
      if (!isId(o.id)) return bad("poke: id is required");
      if (!isGesture(o.gesture)) return bad(`poke: unknown gesture ${JSON.stringify(o.gesture)}; use bounce, nod or spin`);
      return { ok: true, msg: { v: 1, type: "poke", id: o.id, gesture: o.gesture } };
    case "layout":
      if (!isLayout(o.mode)) return bad(`layout: unknown mode ${JSON.stringify(o.mode)}; use row, single or cluster`);
      return { ok: true, msg: { v: 1, type: "layout", mode: o.mode } };
    default:
      return bad(`unknown message type ${JSON.stringify(o.type)}`);
  }
}

/** What a "set" does to the goblins on the page, by id. */
export function planSet(current: string[], next: Goblin[]) {
  const nextIds = new Set(next.map((g) => g.id));
  const have = new Set(current);
  return {
    add: next.filter((g) => !have.has(g.id)),
    update: next.filter((g) => have.has(g.id)),
    remove: current.filter((id) => !nextIds.has(id)),
    order: next.map((g) => g.id),
  };
}

/** Minimal surface the host needs from a mounted goblin; createGoblin satisfies it. */
export interface HostGoblin {
  setExpression(id: string): boolean;
  cast(m: string | null): boolean;
  play(seq: SequenceStep[], o: { loop: boolean }): boolean;
  poke(g: string): boolean;
  setGoblin(g: Goblin): boolean;
  destroy(): void;
}

/**
 * Applies messages to a set of goblins. Rendering is injected (mount/unmount/layout), so this
 * runs the same in the embed page and in tests.
 */
export function createHost(io: {
  post: (msg: OutMessage) => void;
  mount: (g: Goblin) => HostGoblin;
  layout: (mode: Layout, order: string[]) => void;
}) {
  const live = new Map<string, HostGoblin>();
  let order: string[] = [];
  let mode: Layout = "row";
  const error = (message: string) => io.post({ v: 1, type: "error", message });
  const need = (id: string) => {
    const g = live.get(id);
    if (!g) error(`no goblin with id "${id}"; send a set message first`);
    return g;
  };
  return {
    receive(raw: unknown) {
      const p = parseMessage(raw);
      if (!p.ok) return error(p.error);
      const m = p.msg;
      switch (m.type) {
        case "set": {
          const plan = planSet([...live.keys()], m.goblins);
          for (const id of plan.remove) { live.get(id)?.destroy(); live.delete(id); }
          for (const g of plan.update) live.get(g.id)!.setGoblin(g);
          for (const g of plan.add) live.set(g.id, io.mount(g));
          order = plan.order;
          io.layout(mode, order);
          return;
        }
        case "expression": need(m.id)?.setExpression(m.expression); return;
        case "cast": need(m.id)?.cast(m.morph); return;
        case "play": need(m.id)?.play(m.sequence, { loop: m.loop }); return;
        case "poke": need(m.id)?.poke(m.gesture); return;
        case "layout": mode = m.mode; io.layout(mode, order); return;
      }
    },
    ids: () => [...order],
    get mode() { return mode; },
  };
}
