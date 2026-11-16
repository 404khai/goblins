import { useMemo } from "react";
import { Goblin3D } from "../goblin/react";
import { goblinSvg } from "../goblin/svg";
import { DEFAULT_CLAN } from "../goblin/types";

/** Bramble as in Classic: visor eyes, braided beard, blue gnome hat, headphones. */
export const BRAMBLE = DEFAULT_CLAN[2];

/** The live logo: Bramble in 3D, bobbing, blinking and watching the cursor. */
export function Logo({ size = 40, className, expression = "idle" as const }: { size?: number; className?: string; expression?: "idle" | "happy" | "wink" }) {
  return <Goblin3D goblin={BRAMBLE} expression={expression} size={size} framing="head" className={`logo ${className ?? ""}`} />;
}

/** Flat Bramble for spots where a WebGL canvas is overkill (footer, favicon). */
export function LogoFlat({ size = 28, expression = "idle" as const }: { size?: number; expression?: "idle" | "happy" | "wink" }) {
  const svg = useMemo(() => goblinSvg(BRAMBLE, { expression, hands: false, props: false, idPrefix: `logo-${expression}` }), [expression]);
  return <span className="logo" style={{ width: size, height: size }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
