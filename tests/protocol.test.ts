import { describe, expect, test } from "bun:test";
import { createHost, parseMessage, planSet, type HostGoblin, type OutMessage } from "../src/lib/flat";
import { DEFAULT_CLAN } from "../src/lib/flat";

const bramble = { ...DEFAULT_CLAN[2], id: "b" };

describe("parseMessage", () => {
  test("accepts every documented message, as objects or JSON strings", () => {
    const ok = [
      { v: 1, type: "set", goblins: [bramble] },
      { v: 1, type: "expression", id: "b", expression: "thinking" },
      { v: 1, type: "cast", id: "b", morph: "writing" },
      { v: 1, type: "cast", id: "b", morph: null },
      { v: 1, type: "play", id: "b", sequence: ["happy", { morph: "solving", ms: 3000 }], loop: true },
      { v: 1, type: "poke", id: "b", gesture: "nod" },
      { v: 1, type: "layout", mode: "cluster" },
    ];
    for (const m of ok) {
      expect(parseMessage(m).ok).toBe(true);
      expect(parseMessage(JSON.stringify(m)).ok).toBe(true);
    }
  });

  test("ignores unknown fields", () => {
    const p = parseMessage({ v: 1, type: "poke", id: "b", gesture: "spin", extra: { deep: true }, ts: 5 });
    expect(p).toEqual({ ok: true, msg: { v: 1, type: "poke", id: "b", gesture: "spin" } });
  });

  test("rejects bad messages with a reason, never throwing", () => {
    const bad: unknown[] = [
      "{not json", null, 7, [], {}, { type: "poke" }, { v: 2, type: "poke", id: "b", gesture: "nod" },
      { v: 1, type: "dance" }, { v: 1, type: "expression", id: "b", expression: "dance" },
      { v: 1, type: "expression", expression: "happy" }, { v: 1, type: "cast", id: "b", morph: "fireball" },
      { v: 1, type: "play", id: "b", sequence: [] }, { v: 1, type: "play", id: "b", sequence: ["happy", "zap"] },
      { v: 1, type: "poke", id: "b", gesture: "wave" }, { v: 1, type: "layout", mode: "grid" },
      { v: 1, type: "set", goblins: "nope" }, { v: 1, type: "set", goblins: [{ name: "no id" }] },
      { v: 1, type: "set", goblins: [bramble, bramble] },
    ];
    for (const m of bad) {
      const p = parseMessage(m);
      expect(p.ok).toBe(false);
      if (!p.ok) expect(p.error.length).toBeGreaterThan(0);
    }
  });

  test("set fills partial recipes leniently but keeps ids", () => {
    const p = parseMessage({ v: 1, type: "set", goblins: [{ id: "x", name: "X", hat: "beret", eyes: "laser" }] });
    expect(p.ok && p.msg.type === "set" && p.msg.goblins[0].id).toBe("x");
    expect(p.ok && p.msg.type === "set" && p.msg.goblins[0].hat).toBe("beret");
  });
});

describe("planSet", () => {
  test("diffs by id", () => {
    const g = (id: string) => ({ ...bramble, id });
    expect(planSet(["a", "b"], [g("b"), g("c")])).toEqual({ add: [g("c")], update: [g("b")], remove: ["a"], order: ["b", "c"] });
  });
});

describe("createHost", () => {
  function fake() {
    const posts: OutMessage[] = [];
    const calls: string[] = [];
    const layouts: string[] = [];
    const host = createHost({
      post: (m) => posts.push(m),
      layout: (mode, order) => layouts.push(`${mode}:${order.join(",")}`),
      mount: (g): HostGoblin => ({
        setExpression: (e) => (calls.push(`${g.id}.expression(${e})`), true),
        cast: (m) => (calls.push(`${g.id}.cast(${m})`), true),
        play: (s, o) => (calls.push(`${g.id}.play(${s.length},${o.loop})`), true),
        poke: (p) => (calls.push(`${g.id}.poke(${p})`), true),
        setGoblin: (n) => (calls.push(`${g.id}.set(${n.hat})`), true),
        destroy: () => calls.push(`${g.id}.destroy`),
      }),
    });
    return { host, posts, calls, layouts };
  }

  test("routes messages to goblins by id and keeps layout in sync", () => {
    const { host, calls, layouts, posts } = fake();
    host.receive({ v: 1, type: "set", goblins: [{ ...bramble, id: "a" }, { ...bramble, id: "b" }] });
    host.receive({ v: 1, type: "expression", id: "a", expression: "happy" });
    host.receive({ v: 1, type: "cast", id: "b", morph: "receiving" });
    host.receive({ v: 1, type: "play", id: "a", sequence: ["sad", "writing"], loop: true });
    host.receive({ v: 1, type: "poke", id: "b", gesture: "bounce" });
    host.receive({ v: 1, type: "layout", mode: "single" });
    host.receive({ v: 1, type: "set", goblins: [{ ...bramble, id: "b", hat: "beret" }] });
    expect(calls).toEqual(["a.expression(happy)", "b.cast(receiving)", "a.play(2,true)", "b.poke(bounce)", "a.destroy", "b.set(beret)"]);
    expect(layouts).toEqual(["row:a,b", "single:a,b", "single:b"]);
    expect(posts).toEqual([]);
    expect(host.ids()).toEqual(["b"]);
  });

  test("reports bad messages and unknown ids as errors, and keeps going", () => {
    const { host, posts, calls } = fake();
    host.receive("{oops");
    host.receive({ v: 1, type: "poke", id: "ghost", gesture: "nod" });
    host.receive({ v: 1, type: "set", goblins: [{ ...bramble, id: "a" }] });
    host.receive({ v: 1, type: "poke", id: "a", gesture: "nod" });
    expect(posts.map((p) => p.type)).toEqual(["error", "error"]);
    expect(posts.every((p) => p.type !== "error" || p.message.length > 0)).toBe(true);
    expect(calls).toEqual(["a.poke(nod)"]);
  });
});
