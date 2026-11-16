<p align="center"><img src="public/favicon.svg" width="140" alt="Bramble, the Goblins logo" /></p>

<h1 align="center">Goblins</h1>

<p align="center">A clan of 3D goblin avatars with gnome hats, beards and thirty animated moods.<br/>Flat toon colors, ink outlines, no gradients. Export to SVG, PNG, JSON or a React component.</p>

---

## What's inside

- **Studio** (`studio.html`): dress a clan of goblins in 3D. Click one for a close-up, pinch or scroll out to see everyone, drag to spin. Export from the side panel.
- **Home** (`index.html`): a floating island with a stone path, lamps, flowers, mushrooms and trees, where the goblins live.
- **Docs** (`docs.html`) and **Changelog** (`changelog.html`).
- **Classic** (`goblins.html`): the original single-file version. Open it straight in a browser, no build needed.

## Run it

```sh
bun install
bun run dev         # http://localhost:5173
bun run build:lib   # the package, into dist/
bun run build:site  # the website, into dist-site/
```

## Use a goblin in React

```tsx
import { GoblinAvatar, Goblin3D, DEFAULT_CLAN } from "./src/goblin";

const bramble = DEFAULT_CLAN[2];

<GoblinAvatar goblin={bramble} expression="wink" size={64} />   // flat SVG, cheap
<Goblin3D goblin={bramble} expression="searching" size={320} /> // animated WebGL
```

Or export a goblin from the studio as a single `.tsx` file with every expression built in and no dependencies:

```tsx
import { Bramble } from "./Bramble";

<Bramble expression="thinking" size={48} />
```

## Spells

A goblin can transform into what it's doing, the way an agent shows its state: it dissolves into particles of its own colors and reforms as a quill writing a scroll, a puzzle cube solving itself, an ear catching sound, a paper plane and more.

```tsx
<Goblin3D goblin={bramble} morph="writing" />
```

`writing` `sketching` `solving` `listening` `thinking` `orbit` `radar` `progress` `dictating` `sending` `receiving` `uploading` `bouncing` `alerting` `powering-down`

## Exports

| Format | Function | Output |
| --- | --- | --- |
| SVG | `toSVG(goblin)` | Flat front-facing sticker in the current expression |
| PNG | `toPNG(goblin, 1024)` | Transparent PNG blob (browser) |
| JSON | `toJSON(goblin \| goblin[])` / `fromJSON(text)` | `goblins/v1` recipe file |
| React | `toReact(goblin)` | Self-contained `.tsx` component |

## Embedding

Goblins ships as a versioned package, `@404khai/goblins`, for apps that want live avatars without vendoring source. It has four ways in, from most to least code:

| You have | Use | Needs |
| --- | --- | --- |
| A JS app | `createGoblin(el, options)` | `three` (peer) |
| An HTML page | `<goblin-avatar>` | `dist/goblins.js` |
| A native host (WKWebView, Electron, iframe) | `embed.html` + JSON messages | nothing; it's self-contained |
| A build script or a page with no WebGL | `@404khai/goblins/flat` | nothing; never imports `three` |

```sh
bun add @404khai/goblins three        # or: bun add github:404khai/goblins#v0.4.0
```

### Entry points

| Import | Contents |
| --- | --- |
| `@404khai/goblins` | Everything below plus the 3D engine: `createGoblin`, `defineGoblinElement`, `rendererStats`, `buildGoblin`, `Morpher` |
| `@404khai/goblins/flat` | `goblinSvg`, `goblinGlyphSvg`, `DEFAULT_CLAN`, `EXPRESSION_IDS`, `MORPH_IDS`, `fromJSON`/`toJSON`, `validate`, `goblinSchema`, the protocol parser, all types |
| `@404khai/goblins/react` | `<GoblinAvatar>`, `<Goblin3D>` |
| `@404khai/goblins/element` | Registers `<goblin-avatar>` on import |
| `@404khai/goblins/goblins.js` | One ES module with `three` bundled in and the element registered |
| `@404khai/goblins/embed.html` (+ `embed.js`, `embed.css`) | The message-driven page |
| `@404khai/goblins/schema.json` | `goblins/v1` as JSON Schema |

### The controller

```ts
import { createGoblin, DEFAULT_CLAN } from "@404khai/goblins";

const g = createGoblin(el, {
  goblin: DEFAULT_CLAN[2],      // any recipe; partial ones are filled leniently
  size: 56,                     // CSS px, square
  framing: "head",              // or "full"
  expression: "idle",
  morph: null,                  // a spell, or null
  followPointer: true,
  paused: false,
  settleAfterMs: 4000,          // stop drawing after 4 s with nothing new (0 = never)
  reducedMotion: undefined,     // default follows prefers-reduced-motion
  renderer: "shared",           // or "own" for a dedicated WebGL context
});

g.setExpression("thinking");    // true
g.setExpression("dancing");     // false: unknown names never throw
g.cast("writing");              // a spell; cast(null) turns it back into a goblin
g.play(["happy", { morph: "solving", ms: 3000 }, { expression: "wink", morph: null }], { loop: true });
g.poke("bounce");               // "bounce" | "nod" | "spin"
g.lookAt([0.5, 0.2]);           // -1..1 each axis; null hands control back to the pointer
g.pause(); g.resume();
g.snapshot();                   // { expression, morph, playing }
const off = g.on("statechange", (s) => {});   // also "morphdone" and "ready"
g.destroy();                    // later calls return false
```

A sequence step is an expression id, a spell id, or `{ expression?, morph?, ms? }` (2000 ms by default). Spells switch straight from one to the next; `morphdone` fires once a spell has fully formed, and again (with `morph: null`) once the goblin is back.

With reduced motion, each change plays its transition, then the goblin holds one settled pose and stops drawing. `setExpression` and `cast` still work.

### The element

```html
<script type="module" src="./goblins.js"></script>
<goblin-avatar recipe='{"name":"Bramble","eyes":"visor","beard":"braid","hat":"gnome","hatColor":"#2F4AA8"}'
  expression="thinking" morph="writing" size="56" framing="head" mode="3d"></goblin-avatar>
```

Attributes are live: change `expression`, `morph`, `size`, `recipe` or `paused` and the goblin follows. It also takes `mode="svg"` (a flat sticker, no WebGL), `renderer`, `spell-style`, `circle`, `follow-pointer`, `settle-after` and `reduced-motion`. It fires `ready`, `statechange` and `morphdone` as DOM `CustomEvent`s with the same `detail` as the controller, and `el.controller` is the controller itself.

### The message protocol

`dist/embed.html` is a page a host drives with JSON and no code of its own. It loads one classic script and one stylesheet, makes no network requests, and runs under `default-src 'none'; script-src 'self'; style-src 'self'`.

Send messages with `window.goblins.receive(msg)` (from WKWebView: `evaluateJavaScript("goblins.receive(\(json))")`) or `postMessage` from a parent frame. Replies go to `window.webkit.messageHandlers.goblins` and `window.parent.postMessage`.

```jsonc
// in
{"v":1,"type":"set","goblins":[{"id":"astrid","name":"Bramble", …}]}   // replaces the set; diffed by id
{"v":1,"type":"expression","id":"astrid","expression":"thinking"}
{"v":1,"type":"cast","id":"astrid","morph":"writing"}                  // or "morph": null
{"v":1,"type":"play","id":"astrid","sequence":["happy","solving"],"loop":true}
{"v":1,"type":"poke","id":"astrid","gesture":"nod"}
{"v":1,"type":"layout","mode":"row"}                                     // "row" | "single" | "cluster"

// out
{"v":1,"type":"ready"}
{"v":1,"type":"click","id":"astrid"}
{"v":1,"type":"state","id":"astrid","expression":"thinking","morph":null}
{"v":1,"type":"error","message":"cast: unknown spell \"fireball\"; use null to end a spell"}
```

Every goblin in `set` needs an `id`; the rest of the recipe is lenient. Unknown fields are ignored. Malformed messages, unknown ids and unknown names are dropped and reported as `error`. The same parser is exported as `parseMessage` and `createHost` for hosts that want to check messages before sending them.

For Astrid: serve `dist/embed.html`, `embed.js` and `embed.css` from `astrid-ui://`, register a `goblins` script message handler, wait for `ready`, then send `set`. Updating goblins means bumping the package version instead of copying `src/goblin`.

### The WebGL budget

Browsers cap WebGL contexts (often 16), so by default every goblin on a page shares one `WebGLRenderer`. Each frame, visible goblins render into tiles of one offscreen atlas, which is read back once and copied into each goblin's own 2D canvas. `tests/browser` runs 24 live goblins through one context. Goblins that are off screen (IntersectionObserver), paused, or settled (`settleAfterMs`, reduced motion) are skipped entirely. Pass `renderer: "own"` for a goblin that should have a dedicated context, such as one large hero goblin. `rendererStats()` reports contexts and live goblins.

### Recipes and glyphs

```ts
import { validate, goblinSchema, goblinGlyphSvg, fromJSON } from "@404khai/goblins/flat";

validate({ name: "Snig", hat: "fedora-of-doom" });
// [{ path: "hat", message: "must be one of gnome, wizard, …" }, { path: "skin", message: "is required" }, …]
fromJSON('{"name":"Snig","hat":"fedora-of-doom"}');   // still works: fills and falls back, keeps "id"
goblinGlyphSvg(goblin, { size: 20 });        // single-colour outline icon, like an SF Symbol
```

`goblinGlyphSvg` draws white strokes and solid eyes with no fills, and each part knocks out what lies under it, so it reads at 20 px. Use it as a template image and tint it.

### Versioning

The package follows semantic versioning. Recipe files (`goblins/v1`) and the message protocol (`v: 1`) are versioned separately: additions stay within v1, and anything that would break a host bumps them. See [CHANGELOG.md](CHANGELOG.md).

### Tests

```sh
bun test                                   # ids, validation, schema, protocol, packaging
bun run build && bun tests/browser/run.ts  # real Chrome: embed protocol, <goblin-avatar>, 24-goblin zoo
```

## Traits

Skin · head (round, egg, wide, bean) · ears (pointy, round, droopy, long, tiny) · nose (bulb, button, long, hook) · eyes (round, oval, wonky, beady, visor) · hair (ponytail, pigtails, bun, bob, long) · hat (gnome, wizard, beret, beanie, mushroom, sprout, headband, top hat, pirate, hard hat, chef, crown, astronaut, straw) · apron (barista, artist) · beard (full, pointy, forked, braid) · eyewear (round, shades, monocle) · scarf (wrap, long) · carrying (wrench, hammer, sword, wand, gameboy, basketball, lantern, mug, book, test tube, spatula, paintbrush, pickaxe, spyglass, flower, milk pitcher, palette, briefcase) · extras (headphones, earring, pipe, tusks, freckles, goggles, lashes, blush, bow, stethoscope, eyepatch, hook).

The clan: Grub the tea-drinking wanderer, Nettle the witch, Bramble (the logo), Pip the gamer, Mossbeard the lantern-bearing wizard, Wort the blacksmith, Tansy, Knuckle the squire, Fennick the scholar, Sorrel the musician, Dabble the athlete, Rivet the steampunk tinkerer, Burdock the doctor, Barnacle the pirate, Brick the builder, Saffron the chef, Bean the barista, Cosmo the astronaut, Ochre the painter, Ledger the businessman and Hayseed the farmer.

## Expressions

`idle` `happy` `laughing` `love` `wink` `surprised` `thinking` `searching` `confused` `nervous` `sad` `angry` `talking` `sleeping` `celebrate`

Activities, the spells acted out by a goblin that stays a goblin, plus a serious face:

`serious` `calculating` `puzzling` `jotting` `drawing` `hearing` `announcing` `posting` `catching` `syncing` `waiting` `ringing` `low-battery` `scanning` `orbiting` `juggling`

Each one sets a face pose (eyes, lids, brows, mouth) and a motion for the head, hands and props: thought bubbles, a magnifying glass, Z's, hearts, a tear.

## Layout

```
src/goblin/   the library: traits, 3D rig, expressions, SVG renderer, exporters, React components
src/studio/   the studio app
src/site/     nav, footer, logo, scenery, the 3D island
src/pages/    home, studio, docs, changelog entry points
```

## Credits

Inspired by [Bible Strong avatars](https://avatars.bible-strong.app/) for the 3D look, [open-bot-avatar](https://github.com/DominikScholz/open-bot-avatar) for the bot visor, and the Mipmapp characters for the floating mitts.

## License

[MIT](LICENSE)
