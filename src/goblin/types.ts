export type ExpressionId =
  | "idle" | "happy" | "laughing" | "love" | "wink" | "surprised" | "thinking" | "searching"
  | "confused" | "nervous" | "sad" | "angry" | "talking" | "sleeping" | "celebrate"
  | "serious" | "calculating" | "puzzling" | "jotting" | "drawing" | "hearing" | "announcing" | "posting" | "catching"
  | "syncing" | "waiting" | "ringing" | "low-battery" | "scanning" | "orbiting" | "juggling";

import type { MorphId } from "./spells";

export interface Goblin {
  id: string;
  name: string;
  expression: ExpressionId;
  skin: string;
  head: "round" | "egg" | "wide" | "bean";
  ears: "pointy" | "round" | "droopy" | "long" | "tiny";
  nose: "bulb" | "button" | "long" | "hook";
  eyes: "round" | "oval" | "wonky" | "beady" | "visor";
  hat: "gnome" | "wizard" | "beret" | "beanie" | "mushroom" | "sprout" | "headband" | "tophat" | "pirate" | "hardhat" | "chef" | "crown" | "astronaut" | "straw" | "none";
  hatColor: string;
  beard: "full" | "pointy" | "forked" | "braid" | "none";
  beardColor: string;
  eyewear: "none" | "round" | "shades" | "monocle";
  scarf: "none" | "wrap" | "long";
  scarfColor: string;
  extras: string[];
  /** Optional: hair under the hat. Recipes without it have none. */
  hair?: "none" | "ponytail" | "pigtails" | "bun" | "bob" | "long";
  hairColor?: string;
  /** Optional: something the goblin carries when its hands are free. */
  tool?: "none" | "wrench" | "hammer" | "sword" | "wand" | "gameboy" | "basketball" | "lantern" | "mug" | "book" | "testtube" | "spatula" | "paintbrush" | "pickaxe" | "spyglass" | "flower" | "milkpitcher" | "palette" | "briefcase";
  /** Optional: an apron tied on below the chin. */
  outfit?: "none" | "barista" | "artist";
  /** Optional spell: the goblin transforms into what it is doing. 3D only. */
  morph?: MorphId | null;
}

type Trait = Exclude<keyof Goblin, "id" | "name" | "expression" | "morph">;
export interface Option {
  label: string;
  values: string[];
  color?: boolean;
  multi?: boolean;
  dependsOn?: [Trait, string];
  /** Added after goblins/v1 first shipped: may be missing from a recipe; the first value is the default. */
  optional?: boolean;
}

export const OPTIONS: Record<Trait, Option> = {
  skin: { label: "Skin", color: true, values: ["#6FA35A", "#9AAE4C", "#4E9C8E", "#4A7FD6", "#9C86C9", "#E2508C", "#E8613C", "#F2B630", "#C07A55", "#7C8A99"] },
  head: { label: "Head", values: ["round", "egg", "wide", "bean"] },
  ears: { label: "Ears", values: ["pointy", "round", "droopy", "long", "tiny"] },
  nose: { label: "Nose", values: ["bulb", "button", "long", "hook"] },
  eyes: { label: "Eyes", values: ["round", "oval", "wonky", "beady", "visor"] },
  hair: { label: "Hair", optional: true, values: ["none", "ponytail", "pigtails", "bun", "bob", "long"] },
  hairColor: { label: "Hair color", optional: true, color: true, dependsOn: ["hair", "none"], values: ["#5B3B28", "#2A2420", "#C9652B", "#E9C46A", "#EDE8DF", "#E35D9C", "#5B3FA0", "#2F4AA8"] },
  hat: { label: "Hat", values: ["gnome", "wizard", "beret", "beanie", "mushroom", "sprout", "headband", "tophat", "pirate", "hardhat", "chef", "crown", "astronaut", "straw", "none"] },
  hatColor: { label: "Hat color", color: true, dependsOn: ["hat", "none"], values: ["#D8402F", "#2F4AA8", "#E0A92B", "#2E6B46", "#25221F", "#E35D9C", "#5B3FA0", "#ECE6D6", "#F2B630", "#FFFFFF", "#3B2A20", "#E9C46A"] },
  beard: { label: "Beard", values: ["full", "pointy", "forked", "braid", "none"] },
  beardColor: { label: "Beard color", color: true, dependsOn: ["beard", "none"], values: ["#EDE8DF", "#C9652B", "#9A948C", "#5B3B28", "#2A2420", "#E9C46A"] },
  eyewear: { label: "Eyewear", values: ["none", "round", "shades", "monocle"] },
  tool: { label: "Carrying", optional: true, values: ["none", "wrench", "hammer", "sword", "wand", "gameboy", "basketball", "lantern", "mug", "book", "testtube", "spatula", "paintbrush", "pickaxe", "spyglass", "flower", "milkpitcher", "palette", "briefcase"] },
  outfit: { label: "Apron", optional: true, values: ["none", "barista", "artist"] },
  scarf: { label: "Scarf", values: ["none", "wrap", "long"] },
  scarfColor: { label: "Scarf color", color: true, dependsOn: ["scarf", "none"], values: ["#E0A92B", "#2F4AA8", "#D8402F", "#ECE6D6", "#2E6B46", "#E35D9C"] },
  extras: { label: "Extras", multi: true, values: ["headphones", "earring", "pipe", "tusks", "freckles", "goggles", "lashes", "blush", "bow", "stethoscope", "eyepatch", "hook"] },
};

export const NAMES = ["Grub", "Nettle", "Bramble", "Pip", "Mossbeard", "Wort", "Snig", "Tansy", "Burdock", "Fennick", "Gristle", "Hob", "Rivet", "Cog", "Sprocket", "Sorrel", "Knuckle", "Toadflax", "Mugwump", "Dabble", "Crumb"];

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export function randomGoblin(base: Pick<Goblin, "id" | "name" | "expression">): Goblin {
  const g = { ...base, extras: OPTIONS.extras.values.filter(() => Math.random() < 0.25) } as Goblin;
  for (const k of Object.keys(OPTIONS) as Trait[]) if (!OPTIONS[k].multi) (g as any)[k] = pick(OPTIONS[k].values);
  // most goblins travel light
  if (Math.random() < 0.5) g.tool = "none";
  if (Math.random() < 0.5) g.hair = "none";
  return g;
}

const G = (id: number, name: string, expression: ExpressionId, t: Omit<Goblin, "id" | "name" | "expression">): Goblin => ({ id: `g${id}`, name, expression, ...t });

/** The clan: each goblin is a character, not just a palette. Bramble (index 2) is the logo. */
export const DEFAULT_CLAN: Goblin[] = [
  // the wandering grandpa, never without his tea
  G(1, "Grub", "idle", { skin: "#6FA35A", head: "round", ears: "pointy", nose: "bulb", eyes: "round", hat: "gnome", hatColor: "#D8402F", beard: "full", beardColor: "#EDE8DF", eyewear: "round", scarf: "none", scarfColor: "#E0A92B", extras: [], tool: "mug" }),
  // a hedge witch with a long black braid and a wand
  G(2, "Nettle", "thinking", { skin: "#9C86C9", head: "egg", ears: "round", nose: "long", eyes: "oval", hat: "wizard", hatColor: "#25221F", beard: "none", beardColor: "#2A2420", eyewear: "none", scarf: "wrap", scarfColor: "#D8402F", extras: ["lashes", "earring"], hair: "long", hairColor: "#2A2420", tool: "wand" }),
  // the bot-eyed tinkerer, our logo
  G(3, "Bramble", "searching", { skin: "#4E9C8E", head: "wide", ears: "droopy", nose: "bulb", eyes: "visor", hat: "gnome", hatColor: "#2F4AA8", beard: "braid", beardColor: "#9A948C", eyewear: "none", scarf: "none", scarfColor: "#E0A92B", extras: ["headphones"] }),
  // a pigtailed kid glued to her handheld
  G(4, "Pip", "happy", { skin: "#F2B630", head: "bean", ears: "tiny", nose: "button", eyes: "round", hat: "sprout", hatColor: "#E0A92B", beard: "none", beardColor: "#C9652B", eyewear: "none", scarf: "long", scarfColor: "#2F4AA8", extras: ["freckles", "lashes"], hair: "pigtails", hairColor: "#C9652B", tool: "gameboy" }),
  // the old wizard who lights the way
  G(5, "Mossbeard", "sleeping", { skin: "#9AAE4C", head: "round", ears: "long", nose: "hook", eyes: "round", hat: "wizard", hatColor: "#5B3FA0", beard: "full", beardColor: "#9A948C", eyewear: "monocle", scarf: "none", scarfColor: "#E0A92B", extras: [], tool: "lantern" }),
  // the grumpy blacksmith
  G(6, "Wort", "angry", { skin: "#7C8A99", head: "wide", ears: "pointy", nose: "hook", eyes: "beady", hat: "headband", hatColor: "#D8402F", beard: "none", beardColor: "#EDE8DF", eyewear: "none", scarf: "none", scarfColor: "#ECE6D6", extras: ["tusks", "earring"], tool: "hammer" }),
  // a mushroom-capped sweetheart with a bob and a bow
  G(7, "Tansy", "love", { skin: "#E2508C", head: "egg", ears: "round", nose: "button", eyes: "oval", hat: "mushroom", hatColor: "#D8402F", beard: "none", beardColor: "#EDE8DF", eyewear: "none", scarf: "wrap", scarfColor: "#ECE6D6", extras: ["freckles", "lashes", "blush", "bow"], hair: "bob", hairColor: "#5B3B28" }),
  // a squire who laughs at danger
  G(8, "Knuckle", "laughing", { skin: "#C07A55", head: "round", ears: "droopy", nose: "bulb", eyes: "wonky", hat: "beanie", hatColor: "#2E6B46", beard: "forked", beardColor: "#C9652B", eyewear: "none", scarf: "long", scarfColor: "#E0A92B", extras: ["earring"], tool: "sword" }),
  // the scholar, book under one arm
  G(9, "Fennick", "confused", { skin: "#4A7FD6", head: "bean", ears: "long", nose: "long", eyes: "round", hat: "none", hatColor: "#D8402F", beard: "pointy", beardColor: "#EDE8DF", eyewear: "round", scarf: "none", scarfColor: "#E0A92B", extras: [], tool: "book" }),
  // a moody musician with long violet hair
  G(10, "Sorrel", "sad", { skin: "#6FA35A", head: "egg", ears: "droopy", nose: "button", eyes: "oval", hat: "beanie", hatColor: "#2F4AA8", beard: "none", beardColor: "#9A948C", eyewear: "none", scarf: "long", scarfColor: "#D8402F", extras: ["headphones", "lashes"], hair: "long", hairColor: "#5B3FA0" }),
  // the sporty one: ponytail, sweatband, basketball
  G(11, "Dabble", "surprised", { skin: "#E8613C", head: "round", ears: "round", nose: "bulb", eyes: "round", hat: "headband", hatColor: "#2F4AA8", beard: "none", beardColor: "#5B3B28", eyewear: "none", scarf: "none", scarfColor: "#E0A92B", extras: ["lashes", "blush"], hair: "ponytail", hairColor: "#2A2420", tool: "basketball" }),
  // Rivet, steampunk tinkerer: top hat, brass goggles, monocle, wrench
  G(12, "Rivet", "celebrate", { skin: "#C07A55", head: "wide", ears: "pointy", nose: "bulb", eyes: "round", hat: "tophat", hatColor: "#3B2A20", beard: "full", beardColor: "#C9652B", eyewear: "monocle", scarf: "none", scarfColor: "#2F4AA8", extras: ["goggles"], tool: "wrench" }),
  // Doc Burdock: stethoscope, round specs, a bubbling test tube
  G(13, "Burdock", "thinking", { skin: "#9AAE4C", head: "egg", ears: "round", nose: "button", eyes: "round", hat: "none", hatColor: "#ECE6D6", beard: "none", beardColor: "#EDE8DF", eyewear: "round", scarf: "none", scarfColor: "#ECE6D6", extras: ["stethoscope", "lashes"], hair: "bun", hairColor: "#EDE8DF", tool: "testtube" }),
  // Barnacle the pirate: tricorn, eyepatch, spyglass
  G(14, "Barnacle", "wink", { skin: "#7C8A99", head: "wide", ears: "pointy", nose: "hook", eyes: "round", hat: "pirate", hatColor: "#25221F", beard: "forked", beardColor: "#2A2420", eyewear: "none", scarf: "wrap", scarfColor: "#D8402F", extras: ["eyepatch", "hook", "earring"], tool: "spyglass" }),
  // Brick the builder: hard hat and pickaxe
  G(15, "Brick", "happy", { skin: "#E8613C", head: "wide", ears: "droopy", nose: "bulb", eyes: "beady", hat: "hardhat", hatColor: "#F2B630", beard: "full", beardColor: "#5B3B28", eyewear: "none", scarf: "none", scarfColor: "#E8772E", extras: [], tool: "pickaxe" }),
  G(16, "Saffron", "talking", { skin: "#F2B630", head: "round", ears: "tiny", nose: "button", eyes: "oval", hat: "chef", hatColor: "#FFFFFF", beard: "none", beardColor: "#EDE8DF", eyewear: "none", scarf: "wrap", scarfColor: "#D8402F", extras: ["lashes", "blush"], hair: "ponytail", hairColor: "#C9652B", tool: "spatula" }),
  // Bean the barista: green apron, steel milk pitcher
  G(17, "Bean", "happy", { skin: "#C07A55", head: "round", ears: "round", nose: "button", eyes: "round", hat: "beret", hatColor: "#2E6B46", beard: "none", beardColor: "#5B3B28", eyewear: "none", scarf: "none", scarfColor: "#ECE6D6", extras: ["freckles"], hair: "bun", hairColor: "#5B3B28", tool: "milkpitcher", outfit: "barista" }),
  // Cosmo the astronaut, in a bubble helmet
  G(18, "Cosmo", "surprised", { skin: "#4A7FD6", head: "round", ears: "pointy", nose: "button", eyes: "round", hat: "astronaut", hatColor: "#ECE6D6", beard: "none", beardColor: "#EDE8DF", eyewear: "none", scarf: "none", scarfColor: "#ECE6D6", extras: [] }),
  // Ochre the painter: beret, splattered apron, palette and brush
  G(19, "Ochre", "thinking", { skin: "#9C86C9", head: "egg", ears: "droopy", nose: "long", eyes: "oval", hat: "beret", hatColor: "#D8402F", beard: "pointy", beardColor: "#2A2420", eyewear: "none", scarf: "none", scarfColor: "#E0A92B", extras: [], tool: "palette", outfit: "artist" }),
  // Ledger, all business: specs, briefcase
  G(20, "Ledger", "serious", { skin: "#7C8A99", head: "egg", ears: "tiny", nose: "long", eyes: "beady", hat: "none", hatColor: "#25221F", beard: "pointy", beardColor: "#9A948C", eyewear: "round", scarf: "long", scarfColor: "#2F4AA8", extras: [], hair: "bob", hairColor: "#2A2420", tool: "briefcase" }),
  // Hayseed the farmer: straw hat, freckles, a flower
  G(21, "Hayseed", "idle", { skin: "#9AAE4C", head: "wide", ears: "droopy", nose: "bulb", eyes: "round", hat: "straw", hatColor: "#E9C46A", beard: "none", beardColor: "#C9652B", eyewear: "none", scarf: "wrap", scarfColor: "#D8402F", extras: ["freckles"], hair: "pigtails", hairColor: "#C9652B", tool: "flower" }),
];
