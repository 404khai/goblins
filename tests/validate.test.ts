import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { DEFAULT_CLAN, OPTIONS, fromJSON, goblinSchema, toJSON, validate } from "../src/lib/flat";

describe("validate", () => {
  test("every default goblin is valid", () => {
    for (const g of DEFAULT_CLAN) expect(validate(g)).toEqual([]);
  });

  test("lists every problem with a path", () => {
    const errs = validate({ name: "", hat: "fedora-of-doom", skin: "green", extras: ["pipe", "laser", "pipe"], expression: "dance", morph: "zap" });
    const paths = errs.map((e) => e.path);
    expect(paths).toContain("name");
    expect(paths).toContain("hat");
    expect(paths).toContain("skin");
    expect(paths).toContain("extras[1]");
    expect(paths).toContain("extras");
    expect(paths).toContain("expression");
    expect(paths).toContain("morph");
    expect(paths).toContain("head"); // missing
    expect(errs.every((e) => typeof e.message === "string" && e.message.length > 0)).toBe(true);
  });

  test("traits added after v1 are optional, but checked when present", () => {
    const { hair, hairColor, tool, ...older } = DEFAULT_CLAN[1];
    expect(validate(older)).toEqual([]);
    expect(validate({ ...older, hair: "mullet", tool: "laser", hairColor: "brown" }).map((e) => e.path).sort()).toEqual(["hair", "hairColor", "tool"]);
  });

  test("never throws on junk", () => {
    for (const junk of [null, undefined, 1, "x", [], () => 0]) expect(Array.isArray(validate(junk))).toBe(true);
  });
});

describe("fromJSON stays lenient", () => {
  test("partial recipes are filled, bad values fall back, host ids are kept", () => {
    const [g] = fromJSON('{"id":"astrid-1","name":"Snig","hat":"wizard","eyes":"laser","extras":["pipe","x"],"morph":"zap"}');
    expect(g.id).toBe("astrid-1");
    expect(g.hat).toBe("wizard");
    expect(g.eyes).toBe(DEFAULT_CLAN[0].eyes);
    expect(g.extras).toEqual(["pipe"]);
    expect(g.morph).toBeNull();
    expect(validate(g)).toEqual([]);
  });
  test("missing optional traits default to none, not to the template goblin's", () => {
    const [g] = fromJSON('{"name":"Plain"}');
    expect(g.tool).toBe("none");
    expect(g.hair).toBe("none");
  });
  test("round-trips through toJSON", () => {
    expect(fromJSON(toJSON(DEFAULT_CLAN)).map((g) => g.id)).toEqual(DEFAULT_CLAN.map((g) => g.id));
  });
});

describe("schema", () => {
  test("enumerates exactly the trait options", () => {
    const s = goblinSchema() as any;
    const props = s.$defs.goblin.properties;
    for (const [k, o] of Object.entries(OPTIONS)) {
      if (o.multi) expect(props[k].items.enum).toEqual(o.values);
      else if (o.color) expect(props[k].pattern).toBe("^#[0-9a-fA-F]{6}$");
      else expect(props[k].enum).toEqual(o.values);
    }
  });
  test("the published file matches the source", () => {
    if (!existsSync("dist/goblins.schema.json")) return;
    expect(JSON.parse(readFileSync("dist/goblins.schema.json", "utf8"))).toEqual(JSON.parse(JSON.stringify(goblinSchema())));
  });
});
