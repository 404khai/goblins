/**
 * Spell names and descriptions without any 3D, so ids can be validated and listed by
 * lightweight pages. morph.ts adds the shapes.
 */

export type MorphId = "writing" | "sketching" | "solving" | "listening" | "thinking" | "orbit" | "radar" | "progress" | "dictating" | "sending" | "receiving" | "uploading" | "bouncing" | "alerting" | "powering-down";

export interface SpellMeta { label: string; blurb: string; accent: string }

export const SPELL_META: Record<MorphId, SpellMeta> = {
  writing: { label: "Writing", blurb: "A quill writes lines across an unrolled scroll.", accent: "#F2B630" },
  sketching: { label: "Sketching", blurb: "A pencil draws a star on an easel.", accent: "#F2B630" },
  solving: { label: "Solving", blurb: "Juggles a Rubik's cube, scrambling it turn by turn, then solves it.", accent: "#7CF2C8" },
  listening: { label: "Listening", blurb: "Big headphones, with sound waves rolling into each cup.", accent: "#7CF2C8" },
  thinking: { label: "Thinking", blurb: "A thought cloud with bubbles drifting up to it.", accent: "#7CF2C8" },
  orbit: { label: "Orbit", blurb: "A banded ringed planet with two moons.", accent: "#F2B630" },
  radar: { label: "Radar", blurb: "A radar screen: grid, sweeping beam and blips.", accent: "#7CF2C8" },
  progress: { label: "Progress", blurb: "An hourglass runs out, then flips.", accent: "#F2B630" },
  dictating: { label: "Speaking", blurb: "A studio microphone with its voice rippling out.", accent: "#E2443A" },
  sending: { label: "Sending", blurb: "A paper plane loops away with a dotted trail.", accent: "#7CF2C8" },
  receiving: { label: "Receiving", blurb: "A paper plane glides into a mailbox and the flag pops up.", accent: "#F2B630" },
  uploading: { label: "Uploading", blurb: "A cloud with an arrow lifting into it.", accent: "#7CF2C8" },
  bouncing: { label: "Bouncing", blurb: "Rolls into a beach ball and bounces.", accent: "#E2443A" },
  alerting: { label: "Alerting", blurb: "A swinging bell ringing out.", accent: "#E2443A" },
  "powering-down": { label: "Powering down", blurb: "A power symbol that dims and blinks off.", accent: "#9DA48E" },
};

export const MORPH_IDS = Object.keys(SPELL_META) as MorphId[];
