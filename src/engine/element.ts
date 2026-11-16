import { fromJSON } from "../goblin/export";
import { goblinSvg } from "../goblin/svg";
import type { Goblin } from "../goblin/types";
import { isExpressionId, isMorphId } from "../goblin/validate";
import { createGoblin, type GoblinController, type GoblinEvent } from "./controller";

/**
 * <goblin-avatar recipe='{"name":"Bramble",…}' expression="thinking" morph="writing"
 *   size="56" framing="head" mode="3d|svg"></goblin-avatar>
 *
 * Attribute changes are applied live. Fires "ready", "statechange" and "morphdone" as DOM
 * CustomEvents (detail matches the controller's events). In mode="svg" nothing loads WebGL.
 */

const ATTRS = ["recipe", "expression", "morph", "size", "framing", "mode", "renderer", "spell-style", "circle", "follow-pointer", "paused", "settle-after", "reduced-motion"] as const;
const EVENTS: GoblinEvent[] = ["ready", "statechange", "morphdone"];

const HTMLBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as typeof HTMLElement) : HTMLElement;

export class GoblinAvatarElement extends HTMLBase {
  static observedAttributes = [...ATTRS];
  /** The live controller in 3D mode (null in svg mode or before connecting). */
  controller: GoblinController | null = null;
  private goblin: Goblin | null = null;
  private svgExpression = "";

  connectedCallback() {
    if (!this.style.display) this.style.display = "inline-block";
    this.style.lineHeight = "0";
    this.render();
  }

  disconnectedCallback() {
    this.controller?.destroy();
    this.controller = null;
  }

  attributeChangedCallback(name: (typeof ATTRS)[number], prev: string | null, next: string | null) {
    if (!this.isConnected || prev === next) return;
    const c = this.controller;
    if (this.mode === "svg") {
      if (name === "expression" && next && !isExpressionId(next)) return;
      return this.render();
    }
    if (!c) return this.render();
    switch (name) {
      case "expression": if (next && isExpressionId(next)) c.setExpression(next); return;
      case "morph": if (!next) c.cast(null); else if (isMorphId(next)) c.cast(next); return;
      case "size": c.setSize(this.size); return;
      case "paused": next === null ? c.resume() : c.pause(); return;
      case "recipe": { const g = this.readRecipe(); if (g) c.setGoblin(g); return; }
      case "circle": case "follow-pointer": case "settle-after": case "reduced-motion":
        (c as unknown as { _set: (o: object) => void })._set({ circle: this.flag("circle", true), followPointer: this.flag("follow-pointer", true), settleAfterMs: this.num("settle-after", 0), reducedMotion: this.hasAttribute("reduced-motion") ? this.flag("reduced-motion", true) : undefined });
        return;
      default: return this.render(); // mode, framing, renderer, spell-style need a fresh mount
    }
  }

  /** Same as the controller's methods; false when not in 3D mode. */
  play(...a: Parameters<GoblinController["play"]>) { return this.controller?.play(...a) ?? false; }
  poke(...a: Parameters<GoblinController["poke"]>) { return this.controller?.poke(...a) ?? false; }
  lookAt(...a: Parameters<GoblinController["lookAt"]>) { return this.controller?.lookAt(...a) ?? false; }
  snapshot() { return this.controller?.snapshot() ?? (this.goblin ? { expression: this.svgExpression, morph: null, playing: false } : null); }

  private get mode() { return this.getAttribute("mode") === "svg" ? "svg" : "3d"; }
  private get size() { return this.num("size", 96); }
  private num(name: string, fallback: number) { const n = Number(this.getAttribute(name)); return this.hasAttribute(name) && Number.isFinite(n) ? n : fallback; }
  private flag(name: string, fallback: boolean) { const v = this.getAttribute(name); return v === null ? fallback : v !== "false" && v !== "0" && v !== "off"; }

  private readRecipe(): Goblin | null {
    const raw = this.getAttribute("recipe");
    try { return raw ? fromJSON(raw)[0] ?? null : fromJSON("{}")[0]; } catch { return null; }
  }

  private fire(type: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private render() {
    this.controller?.destroy();
    this.controller = null;
    this.replaceChildren();
    this.goblin = this.readRecipe();
    if (!this.goblin) { this.fire("error", { message: "recipe is not valid JSON" }); return; }
    const exp = this.getAttribute("expression");
    const morph = this.getAttribute("morph");
    if (this.mode === "svg") {
      const expression = isExpressionId(exp) ? exp : this.goblin.expression;
      const changed = this.svgExpression !== expression;
      this.svgExpression = expression;
      this.innerHTML = goblinSvg(this.goblin, { expression, size: this.size });
      this.fire("ready", { id: this.goblin.id });
      if (changed) this.fire("statechange", { expression, morph: null, playing: false });
      return;
    }
    const c = createGoblin(this, {
      goblin: this.goblin,
      size: this.size,
      framing: this.getAttribute("framing") === "head" ? "head" : "full",
      expression: isExpressionId(exp) ? exp : undefined,
      morph: morph && isMorphId(morph) ? morph : morph === "" ? null : undefined,
      renderer: this.getAttribute("renderer") === "own" ? "own" : "shared",
      spellStyle: this.getAttribute("spell-style") === "solid" ? "solid" : "dots",
      circle: this.flag("circle", true),
      followPointer: this.flag("follow-pointer", true),
      paused: this.hasAttribute("paused"),
      settleAfterMs: this.num("settle-after", 0),
      reducedMotion: this.hasAttribute("reduced-motion") ? this.flag("reduced-motion", true) : undefined,
    });
    for (const e of EVENTS) c.on(e, (d) => this.fire(e, d));
    this.controller = c;
  }
}

/** Registers <goblin-avatar> (or another tag). Safe to call more than once. */
export function defineGoblinElement(tag = "goblin-avatar") {
  if (typeof customElements === "undefined" || customElements.get(tag)) return false;
  customElements.define(tag, tag === "goblin-avatar" ? GoblinAvatarElement : class extends GoblinAvatarElement {});
  return true;
}
