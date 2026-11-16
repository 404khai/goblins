/** dist/goblins.js: the whole engine (three included) as one ES module, with <goblin-avatar> registered. */
import { defineGoblinElement } from "../engine/element";
export * from "./index";
defineGoblinElement();
