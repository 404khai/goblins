import type { CSSProperties, ReactElement } from "react";

/** Flat storybook props: outlined, no gradients. They sway gently via CSS (--r tilt, --d delay). */
export type SceneryKind = "lamp" | "flower" | "tulip" | "mushroom" | "tree" | "stones" | "sign";
const INK = "#1D2318";
const s = { stroke: INK, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export function Scenery({ kind, className, style }: { kind: SceneryKind; className?: string; style?: CSSProperties & Record<string, string> }) {
  return (
    <svg className={`scenery sway ${className ?? ""}`} style={style} viewBox={VIEW[kind]} aria-hidden="true">
      {ART[kind]}
    </svg>
  );
}

const VIEW: Record<SceneryKind, string> = {
  lamp: "0 0 120 260", flower: "0 0 100 180", tulip: "0 0 100 180", mushroom: "0 0 140 140", tree: "0 0 200 260", stones: "0 0 260 80", sign: "0 0 160 170",
};

const ART: Record<SceneryKind, ReactElement> = {
  lamp: (
    <g>
      <rect x="54" y="90" width="12" height="160" rx="4" fill="#3A3832" {...s} />
      <rect x="38" y="236" width="44" height="16" rx="5" fill="#3A3832" {...s} />
      <path d="M34 60 L60 30 L86 60Z" fill="#2F4AA8" {...s} />
      <rect x="40" y="58" width="40" height="40" rx="6" fill="#FFD35C" {...s} />
      <path d="M60 58 V98 M40 78 H80" {...s} strokeWidth={3} />
      <circle cx="60" cy="26" r="6" fill="#E0A92B" {...s} strokeWidth={3} />
      <path d="M66 120 Q92 126 92 150" fill="none" {...s} strokeWidth={3} />
      <path d="M86 150 l6 14 l6 -14Z" fill="#6FA35A" {...s} strokeWidth={3} />
    </g>
  ),
  flower: (
    <g>
      <path d="M50 70 Q46 120 52 176" fill="none" {...s} stroke="#2E6B46" strokeWidth={6} />
      <path d="M50 70 Q46 120 52 176" fill="none" {...s} strokeWidth={0} />
      <ellipse cx="34" cy="128" rx="16" ry="7" transform="rotate(-30 34 128)" fill="#6FA35A" {...s} />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="50" cy="38" rx="13" ry="20" transform={`rotate(${a} 50 56)`} fill="#E35D9C" {...s} />
      ))}
      <circle cx="50" cy="56" r="13" fill="#F2B630" {...s} />
    </g>
  ),
  tulip: (
    <g>
      <path d="M50 80 Q54 130 48 176" fill="none" {...s} stroke="#2E6B46" strokeWidth={6} />
      <ellipse cx="66" cy="136" rx="16" ry="7" transform="rotate(30 66 136)" fill="#6FA35A" {...s} />
      <path d="M28 40 L38 58 L50 36 L62 58 L72 40 Q76 84 50 86 Q24 84 28 40Z" fill="#D8402F" {...s} />
    </g>
  ),
  mushroom: (
    <g>
      <path d="M52 80 Q48 124 58 130 H84 Q94 124 88 80Z" fill="#F2ECDD" {...s} />
      <path d="M10 84 Q14 18 70 16 Q126 18 130 84 Q70 96 10 84Z" fill="#D8402F" {...s} />
      <circle cx="46" cy="48" r="9" fill="#F7F2E6" {...s} strokeWidth={3} />
      <circle cx="84" cy="36" r="7" fill="#F7F2E6" {...s} strokeWidth={3} />
      <circle cx="104" cy="62" r="8" fill="#F7F2E6" {...s} strokeWidth={3} />
      <circle cx="72" cy="66" r="5" fill="#F7F2E6" {...s} strokeWidth={3} />
    </g>
  ),
  tree: (
    <g>
      <path d="M88 160 Q84 220 76 254 H124 Q116 220 112 160Z" fill="#7A5236" {...s} />
      <circle cx="100" cy="92" r="70" fill="#4E8C4A" {...s} />
      <circle cx="58" cy="128" r="40" fill="#5E9E56" {...s} />
      <circle cx="144" cy="124" r="42" fill="#5E9E56" {...s} />
      <circle cx="78" cy="70" r="8" fill="#D8402F" {...s} strokeWidth={3} />
      <circle cx="132" cy="84" r="8" fill="#D8402F" {...s} strokeWidth={3} />
      <circle cx="104" cy="132" r="8" fill="#D8402F" {...s} strokeWidth={3} />
    </g>
  ),
  stones: (
    <g>
      <ellipse cx="40" cy="44" rx="32" ry="16" fill="#D9CFB4" {...s} />
      <ellipse cx="116" cy="38" rx="36" ry="18" fill="#D9CFB4" {...s} />
      <ellipse cx="196" cy="46" rx="30" ry="15" fill="#D9CFB4" {...s} />
    </g>
  ),
  sign: (
    <g>
      <rect x="74" y="60" width="12" height="104" rx="3" fill="#7A5236" {...s} />
      <path d="M14 30 H128 L148 52 L128 74 H14Z" fill="#E0A92B" {...s} />
      <path d="M34 52 H112" {...s} strokeWidth={5} />
    </g>
  ),
};
