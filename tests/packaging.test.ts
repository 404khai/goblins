import { describe, expect, test } from "bun:test";

/** The flat entry must never pull in three (directly or through anything it imports). */
describe("packaging", () => {
  test("flat entry bundles without three", async () => {
    const out = await Bun.build({ entrypoints: ["src/lib/flat.ts"], target: "browser", external: [] , define: { __GOBLINS_VERSION__: '"test"' } });
    expect(out.success).toBe(true);
    const code = await out.outputs[0].text();
    expect(code).not.toContain("WebGLRenderer");
    expect(code).not.toContain("three.module");
    const inputs = out.outputs.length;
    expect(inputs).toBe(1);
  });

  test("goblinSvg and goblinGlyphSvg work with nothing but the flat entry", async () => {
    const { goblinSvg, goblinGlyphSvg, DEFAULT_CLAN } = await import("../src/lib/flat");
    const svg = goblinSvg(DEFAULT_CLAN[2], { expression: "wink" });
    expect(svg.startsWith("<svg")).toBe(true);
    const glyph = goblinGlyphSvg(DEFAULT_CLAN[2], { size: 20 });
    expect(glyph).toContain('width="20"');
    expect(glyph).not.toMatch(/fill="#(?!FFFFFF|000|fff)[0-9A-Fa-f]{3,6}"/); // single colour
  });
});
