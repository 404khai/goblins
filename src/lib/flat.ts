/**
 * @404khai/goblins/flat: everything that doesn't need WebGL. Recipes, the default clan, ids,
 * the SVG and glyph renderers, JSON import/export, and validation. Never imports three, so build
 * scripts and lightweight pages can use it alone.
 */
export const VERSION: string = typeof __GOBLINS_VERSION__ === "string" ? __GOBLINS_VERSION__ : "dev";

export { DEFAULT_CLAN, NAMES, OPTIONS, randomGoblin, type ExpressionId, type Goblin, type Option } from "../goblin/types";
export { EXPRESSION_IDS, EXPRESSION_META, STILLS, type ExpressionMeta, type Pose, type Still } from "../goblin/poses";
export { MORPH_IDS, SPELL_META, type MorphId, type SpellMeta } from "../goblin/spells";
export { goblinSvg, type SvgOptions } from "../goblin/svg";
export { goblinGlyphSvg, type GlyphOptions } from "../goblin/glyph";
export { fromJSON, toJSON, toSVG, toReact, toPNG, SCHEMA_VERSION } from "../goblin/export";
export {
  validate, goblinSchema, normalizeSequence, isExpressionId, isMorphId, isGesture, isLayout, GESTURES, LAYOUTS,
  type ValidationError, type Gesture, type Layout, type SequenceStep, type SequenceInput,
} from "../goblin/validate";
export { parseMessage, planSet, createHost, PROTOCOL_VERSION, type InMessage, type OutMessage, type HostGoblin } from "../embed/protocol";
