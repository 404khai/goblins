import type { ExpressionId } from "./types";

/**
 * Expression data without any 3D: names, face poses and still frames. Shared by the 3D rig
 * (expressions.ts adds the motion) and the flat SVG renderer, so neither needs the other.
 */

export type EyeMode = "open" | "happy" | "closed";
export type MouthKind = "smile" | "grin" | "o" | "flat" | "frown" | "smirk";
export type ActKind = "calculating" | "puzzling" | "jotting" | "drawing" | "hearing" | "announcing" | "posting" | "catching" | "syncing" | "waiting" | "ringing" | "low-battery" | "scanning" | "orbiting" | "juggling";
export type PropKind = "magnifier" | "dots" | "question" | "zzz" | "hearts" | "sparkles" | "exclaim" | "sweat" | "tear" | "confetti" | ActKind;
export const ACT_KINDS: ActKind[] = ["calculating", "puzzling", "jotting", "drawing", "hearing", "announcing", "posting", "catching", "syncing", "waiting", "ringing", "low-battery", "scanning", "orbiting", "juggling"];

export interface Pose {
  eyes: [EyeMode, EyeMode]; // [left, right]
  lid: number; // 0 wide open … 1 half shut
  tilt: number; // lid slant, + angry / - sad
  pupil: number;
  brow: [number, number]; // [lift, slant] applied to both
  browL?: [number, number]; // optional asymmetric left brow
  mouth: MouthKind;
}

/** A single still frame of the expression, used by the SVG renderer. */
export interface Still {
  look?: [number, number];
  tilt?: number;
  hands?: [[number, number] | null, [number, number] | null];
  mouth?: number;
  /** Extra squint per eye [left, right], 0..1. */
  squint?: [number, number];
}

export interface ExpressionMeta {
  label: string;
  blurb: string;
  pose: Pose;
  props?: PropKind[];
  /** Show the floating mitts. Off unless the pose needs them (holding, rubbing, scratching). */
  hands?: boolean;
}

export const EXPRESSION_META: Record<ExpressionId, ExpressionMeta> = {
  idle: { label: "Idle", blurb: "Breathes, follows your cursor, blinks.", pose: {"eyes": ["open", "open"], "lid": 0, "tilt": 0, "pupil": 1, "brow": [0, 0], "mouth": "smile"} },
  happy: { label: "Happy", blurb: "Bouncy hop with sparkles.", pose: {"eyes": ["happy", "happy"], "lid": 0, "tilt": 0, "pupil": 1, "brow": [0.06, -0.05], "mouth": "grin"}, props: ["sparkles"] },
  laughing: { label: "Laughing", blurb: "Head thrown back, shaking with it.", pose: {"eyes": ["happy", "happy"], "lid": 0, "tilt": 0, "pupil": 1, "brow": [0.1, -0.15], "mouth": "grin"} },
  love: { label: "In love", blurb: "Swoons side to side, hearts drift up.", pose: {"eyes": ["open", "open"], "lid": 0.35, "tilt": 0, "pupil": 1.2, "brow": [0.08, -0.2], "mouth": "smile"}, props: ["hearts"] },
  wink: { label: "Wink", blurb: "Cheeky wink and a nod.", pose: {"eyes": ["open", "happy"], "lid": 0, "tilt": 0, "pupil": 1, "brow": [0.04, 0], "mouth": "smirk", "browL": [0.12, -0.15]} },
  surprised: { label: "Surprised", blurb: "Jolts upright, hands fly up.", pose: {"eyes": ["open", "open"], "lid": -0.15, "tilt": 0, "pupil": 0.55, "brow": [0.17, -0.1], "mouth": "o"}, props: ["exclaim"] },
  thinking: { label: "Thinking", blurb: "Chin rub, one eye squinted, head roaming, thought bubbles.", pose: {"eyes": ["open", "open"], "lid": 0.3, "tilt": 0, "pupil": 1, "brow": [0.02, 0.05], "mouth": "smirk", "browL": [0.14, -0.2]}, props: ["dots"], hands: true },
  searching: { label: "Searching", blurb: "Scans the room with a magnifying glass.", pose: {"eyes": ["open", "open"], "lid": 0.15, "tilt": 0, "pupil": 1, "brow": [0.06, 0.05], "mouth": "flat", "browL": [-0.02, 0.2]}, props: ["magnifier"], hands: true },
  confused: { label: "Confused", blurb: "Scratches its head, then looks around for help.", pose: {"eyes": ["open", "open"], "lid": 0, "tilt": 0, "pupil": 0.85, "brow": [0.02, 0.15], "mouth": "smirk", "browL": [0.18, -0.25]}, props: ["question"], hands: true },
  nervous: { label: "Nervous", blurb: "Trembles, darting eyes, sweat drop.", pose: {"eyes": ["open", "open"], "lid": 0.05, "tilt": 0, "pupil": 0.65, "brow": [0.08, -0.3], "mouth": "flat"}, props: ["sweat"] },
  sad: { label: "Sad", blurb: "Droops, looks down, a tear rolls.", pose: {"eyes": ["open", "open"], "lid": 0.45, "tilt": -0.35, "pupil": 1.15, "brow": [0.02, -0.35], "mouth": "frown"}, props: ["tear"] },
  angry: { label: "Angry", blurb: "Glares, fists shaking, steaming.", pose: {"eyes": ["open", "open"], "lid": 0.45, "tilt": 0.5, "pupil": 0.8, "brow": [-0.08, 0.5], "mouth": "frown"} },
  talking: { label: "Talking", blurb: "Chatters away with hand gestures.", pose: {"eyes": ["open", "open"], "lid": 0.1, "tilt": 0, "pupil": 1, "brow": [0.04, 0], "mouth": "o"} },
  sleeping: { label: "Sleeping", blurb: "Nods off, snores, Z's float away.", pose: {"eyes": ["closed", "closed"], "lid": 0, "tilt": 0, "pupil": 1, "brow": [-0.04, 0], "mouth": "o"}, props: ["zzz"] },
  celebrate: { label: "Celebrate", blurb: "Big jumps, arms up, confetti stars.", pose: {"eyes": ["happy", "happy"], "lid": 0, "tilt": 0, "pupil": 1, "brow": [0.12, -0.1], "mouth": "grin"}, props: ["confetti"] },
  // activities: the spells, acted out by a goblin that stays a goblin
  serious: { label: "Serious", blurb: "Level stare, brows down, perfectly still.", pose: {"eyes": ["open", "open"], "lid": 0.32, "tilt": 0.12, "pupil": 0.9, "brow": [-0.05, 0.2], "mouth": "flat"} },
  calculating: { label: "Calculating", blurb: "Taps away at a chunky calculator; numbers pop out and a receipt prints.", pose: {"eyes": ["open", "open"], "lid": 0.22, "tilt": 0.05, "pupil": 1, "brow": [-0.02, 0.18], "mouth": "flat", "browL": [0.1, -0.1]}, props: ["calculating"], hands: true },
  puzzling: { label: "Solving", blurb: "Juggles a Rubik's cube, scrambling it turn by turn, then solves it.", pose: {"eyes": ["open", "open"], "lid": 0.12, "tilt": 0.08, "pupil": 0.95, "brow": [0.02, 0.12], "mouth": "smirk"}, props: ["puzzling"], hands: true },
  jotting: { label: "Jotting", blurb: "Scribbles notes on a pad with a quill.", pose: {"eyes": ["open", "open"], "lid": 0.25, "tilt": 0, "pupil": 1, "brow": [0.02, 0.05], "mouth": "smirk"}, props: ["jotting"], hands: true },
  drawing: { label: "Drawing", blurb: "Sketches a star on a pad, tongue out.", pose: {"eyes": ["open", "open"], "lid": 0.2, "tilt": 0, "pupil": 1, "brow": [0.04, 0.1], "mouth": "grin"}, props: ["drawing"], hands: true },
  hearing: { label: "Hearing", blurb: "Cups an ear as sound waves roll in.", pose: {"eyes": ["open", "open"], "lid": 0.05, "tilt": 0, "pupil": 0.85, "brow": [0.06, 0], "mouth": "o", "browL": [0.16, -0.15]}, props: ["hearing"], hands: true },
  announcing: { label: "Announcing", blurb: "Talks into a microphone, voice rippling out.", pose: {"eyes": ["open", "open"], "lid": 0.05, "tilt": 0, "pupil": 1, "brow": [0.08, -0.05], "mouth": "o"}, props: ["announcing"], hands: true },
  posting: { label: "Posting", blurb: "Throws a paper plane, again and again.", pose: {"eyes": ["open", "open"], "lid": 0.1, "tilt": 0, "pupil": 1, "brow": [0.04, 0.1], "mouth": "smirk"}, props: ["posting"], hands: true },
  catching: { label: "Catching", blurb: "A letter flies in and lands in its hands.", pose: {"eyes": ["open", "open"], "lid": 0, "tilt": 0, "pupil": 1.1, "brow": [0.1, -0.1], "mouth": "grin"}, props: ["catching"], hands: true },
  syncing: { label: "Syncing", blurb: "A little cloud above swaps arrows up and down.", pose: {"eyes": ["open", "open"], "lid": 0.1, "tilt": 0, "pupil": 1, "brow": [0.06, 0], "mouth": "smile"}, props: ["syncing"] },
  waiting: { label: "Waiting", blurb: "Bored beside an hourglass that keeps flipping.", pose: {"eyes": ["open", "open"], "lid": 0.45, "tilt": 0, "pupil": 1, "brow": [-0.02, -0.05], "mouth": "flat"}, props: ["waiting"] },
  ringing: { label: "Ringing", blurb: "Rings a hand bell over its head.", pose: {"eyes": ["open", "open"], "lid": 0, "tilt": 0, "pupil": 0.9, "brow": [0.12, -0.1], "mouth": "grin"}, props: ["ringing"], hands: true },
  "low-battery": { label: "Low battery", blurb: "Droopy, with a blinking empty battery overhead.", pose: {"eyes": ["open", "open"], "lid": 0.6, "tilt": -0.2, "pupil": 1.05, "brow": [-0.03, -0.25], "mouth": "flat"}, props: ["low-battery"] },
  scanning: { label: "Scanning", blurb: "An antenna sends out pulses while its eyes dart.", pose: {"eyes": ["open", "open"], "lid": 0.15, "tilt": 0, "pupil": 0.75, "brow": [0.03, 0.12], "mouth": "flat"}, props: ["scanning"] },
  orbiting: { label: "Orbiting", blurb: "Dizzy, with a planet and stars circling its head.", pose: {"eyes": ["open", "open"], "lid": 0.2, "tilt": 0, "pupil": 0.5, "brow": [0.1, -0.2], "mouth": "o"}, props: ["orbiting"] },
  juggling: { label: "Juggling", blurb: "Keeps three balls in the air.", pose: {"eyes": ["open", "open"], "lid": 0.05, "tilt": 0, "pupil": 1, "brow": [0.06, 0], "mouth": "grin"}, props: ["juggling"], hands: true },
};

export const EXPRESSION_IDS = Object.keys(EXPRESSION_META) as ExpressionId[];

/** Key frames for the SVG renderer: where the eyes look, head tilt, and hand placement. */
export const STILLS: Partial<Record<ExpressionId, Still>> = {
  happy: {"hands": [[-1.3, -0.85], [1.3, -0.85]]},
  laughing: {"tilt": 0.05, "hands": [[-0.55, -1.15], [0.55, -1.15]], "mouth": 1.3},
  love: {"tilt": 0.1, "hands": [[-0.75, -0.55], [0.75, -0.55]]},
  wink: {"tilt": -0.12, "hands": [null, [1.05, -0.4]]},
  surprised: {"hands": [[-1.3, -0.05], [1.3, -0.05]], "mouth": 1.2},
  thinking: {"look": [0.6, 0.8], "tilt": 0.12, "hands": [null, [0.35, -1]], "squint": [0, 0.7]},
  searching: {"look": [0.5, -0.15], "hands": [null, [0.75, -0.6]]},
  confused: {"look": [0, 0.3], "tilt": 0.2, "hands": [null, [1.1, 0.55]]},
  nervous: {"look": [-0.8, -0.1], "hands": [[-0.3, -1.15], [0.3, -1.15]]},
  sad: {"look": [0, -0.8], "hands": [[-0.95, -1.45], [0.95, -1.45]]},
  angry: {"hands": [[-1.25, -0.6], [1.25, -0.6]]},
  talking: {"tilt": 0.05, "hands": [[-1.15, -0.75], [1.15, -1.05]], "mouth": 1.1},
  sleeping: {"tilt": 0.14, "hands": [[-1.1, -1.5], [1.1, -1.5]], "mouth": 1.1},
  celebrate: {"hands": [[-1.15, 1.1], [1.15, 1.1]]},
  calculating: {"look": [0.4, 0.6], "tilt": 0.06, "hands": [null, [0.35, -1.0]]},
  jotting: {"look": [-0.2, -0.7], "hands": [[-0.45, -1.05], [0.15, -1.0]]},
  drawing: {"look": [-0.1, -0.6], "hands": [[-0.55, -0.9], [0.05, -0.75]]},
  hearing: {"look": [0.8, 0], "tilt": -0.12, "hands": [null, [1.25, 0.15]]},
  announcing: {"hands": [null, [0.35, -0.62]], "mouth": 1.2},
  posting: {"look": [-0.6, 0.5], "hands": [null, [1.15, 0.1]]},
  catching: {"look": [0, -0.4], "hands": [[-0.35, -1.0], [0.35, -1.0]]},
  syncing: {"look": [0, 0.85]},
  waiting: {"look": [0.7, -0.2], "tilt": 0.1},
  ringing: {"look": [0.6, 0.7], "hands": [null, [1.1, 0.35]]},
  "low-battery": {"look": [0, -0.3], "tilt": -0.1},
  scanning: {"look": [0.8, 0]},
  orbiting: {"tilt": 0.12},
  juggling: {"look": [0, 0.7], "hands": [[-0.65, -1.1], [0.65, -1.15]]},
};
