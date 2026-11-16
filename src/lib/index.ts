/**
 * @404khai/goblins: the flat API plus the 3D engine (createGoblin, <goblin-avatar>, the shared
 * WebGL renderer). three is a peer dependency of this entry only.
 */
export * from "./flat";
export { createGoblin, type GoblinController, type GoblinOptions, type GoblinSnapshot, type GoblinEvent, type GoblinEventDetail } from "../engine/controller";
export { GoblinAvatarElement, defineGoblinElement } from "../engine/element";
export { rendererStats } from "../engine/pool";
export { buildGoblin, disposeRig, type Rig } from "../goblin/build";
export { animate, EXPRESSIONS } from "../goblin/expressions";
export { Morpher, MORPHS, type SpellStyle, type MorphOptions } from "../goblin/morph";
