import { describe, expect, test } from "bun:test";
import { EXPRESSION_IDS, EXPRESSION_META, GESTURES, LAYOUTS, MORPH_IDS, SPELL_META, isExpressionId, isGesture, isLayout, isMorphId, normalizeSequence } from "../src/lib/flat";
import { EXPRESSIONS } from "../src/goblin/expressions";
import { MORPHS } from "../src/goblin/morph";

const kebab = /^[a-z]+(-[a-z]+)*$/;

describe("ids", () => {
  test("expression and spell ids are unique, kebab-case and stable", () => {
    expect(new Set(EXPRESSION_IDS).size).toBe(EXPRESSION_IDS.length);
    expect(new Set(MORPH_IDS).size).toBe(MORPH_IDS.length);
    for (const id of [...EXPRESSION_IDS, ...MORPH_IDS, ...GESTURES, ...LAYOUTS]) expect(id).toMatch(kebab);
    // ids are append-only: the original fifteen keep their order, activities follow
    expect(EXPRESSION_IDS.slice(0, 15)).toEqual(["idle", "happy", "laughing", "love", "wink", "surprised", "thinking", "searching", "confused", "nervous", "sad", "angry", "talking", "sleeping", "celebrate"]);
    expect(EXPRESSION_IDS.slice(15)).toEqual(["serious", "calculating", "puzzling", "jotting", "drawing", "hearing", "announcing", "posting", "catching", "syncing", "waiting", "ringing", "low-battery", "scanning", "orbiting", "juggling"]);
    expect(MORPH_IDS).toEqual(["writing", "sketching", "solving", "listening", "thinking", "orbit", "radar", "progress", "dictating", "sending", "receiving", "uploading", "bouncing", "alerting", "powering-down"]);
  });

  test("the 3D tables cover exactly the flat ids", () => {
    expect(Object.keys(EXPRESSIONS)).toEqual(EXPRESSION_IDS);
    expect(Object.keys(MORPHS)).toEqual(MORPH_IDS);
    for (const id of EXPRESSION_IDS) expect(EXPRESSIONS[id].label).toBe(EXPRESSION_META[id].label);
    for (const id of MORPH_IDS) expect(MORPHS[id].label).toBe(SPELL_META[id].label);
  });

  test("guards accept known names and reject everything else without throwing", () => {
    expect(isExpressionId("thinking")).toBe(true);
    expect(isMorphId("powering-down")).toBe(true);
    expect(isGesture("spin")).toBe(true);
    expect(isLayout("cluster")).toBe(true);
    for (const bad of ["", "Thinking", "fireball", null, undefined, 3, {}, [], "toString", "__proto__"]) {
      expect(isExpressionId(bad)).toBe(false);
      expect(isMorphId(bad)).toBe(false);
      expect(isGesture(bad)).toBe(false);
      expect(isLayout(bad)).toBe(false);
    }
  });
});

describe("sequences", () => {
  test("expression and spell ids never collide, so bare strings in a sequence are unambiguous", () => {
    expect(EXPRESSION_IDS.filter((e) => (MORPH_IDS as string[]).includes(e))).toEqual(["thinking"]);
  });
  test("strings name an expression or a spell; objects carry both with a duration", () => {
    expect(normalizeSequence(["happy", "writing", { expression: "sad", morph: null, ms: 500 }])).toEqual([
      { expression: "happy", ms: 2000 },
      { morph: "writing", ms: 2000 },
      { expression: "sad", morph: null, ms: 500 },
    ]);
  });
  test("any unknown step rejects the whole sequence", () => {
    for (const bad of [[], ["happy", "dance"], [{ ms: 100 }], [{ expression: "happy", ms: -1 }], [{ morph: "zap" }], "happy", null, [null]]) expect(normalizeSequence(bad)).toBeNull();
  });
});
