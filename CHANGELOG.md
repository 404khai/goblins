# Changelog

All notable changes to `@404khai/goblins`. This project follows [Semantic Versioning](https://semver.org/).
Recipe files (`goblins/v1`) and the embed protocol (`v: 1`) carry their own versions.

## 0.7.0 — 2026-11-16

### Added
- Aprons: optional `outfit` trait, `barista` (green, with a pocket and a cup on the bib) or `artist` (paint-splattered).
- Hats: `astronaut` (glass bubble helmet with collar and antenna) and `straw`.
- Tools: `milkpitcher`, `palette` (with a brush through the thumb hole) and `briefcase`.
- Five new clan members: Bean the barista, Cosmo the astronaut, Ochre the painter, Ledger the businessman and Hayseed the farmer.

### Changed
- The handheld console and the jotting pad face their goblin, so you see their backs; the console's back has red and blue grips.
- The spyglass is held by the eyepiece, objective out front.
- The wrench is a flat open-end wrench with a ring end.
- Calculating plays out: a hand on the head while recalling, then the calculator comes out (its back toward you) and the tapping starts.
- Thinking squints one eye and lets the head roam; Confused scratches its head, then looks around for help; Celebrate throws confetti instead of stars.

### Fixed
- Calculating's floating numbers and Announcing's sound rings no longer linger after switching to another expression.

## 0.6.0 — 2026-11-16

### Added
- Hair: `hair` (ponytail, pigtails, bun, bob, long) and `hairColor`.
- Carried tools: `tool` (wrench, hammer, sword, wand, gameboy, basketball, lantern, mug, book, testtube, spatula, paintbrush, pickaxe, spyglass, flower). Shown while an expression leaves the hands free; put away when it needs them.
- Hats: `tophat`, `pirate` (tricorn with skull and crossbones), `hardhat` (with headlamp), `chef`, `crown`.
- Extras: `goggles`, `lashes`, `blush`, `bow`, `stethoscope`, `eyepatch`, `hook` (replaces the right mitt; tools move to the left).
- `puzzling` expression, labelled "Solving": juggles a Rubik's cube and really solves it.
- Four new clan members (Burdock the doctor, Barnacle the pirate, Brick the builder, Saffron the chef), and every goblin recast as a character. Hob is now Rivet, a steampunk tinkerer.

### Changed
- `calculating` is a goblin tapping a calculator, with numbers popping out and a receipt printing.
- `drawing` holds the sketch pad toward itself, so you see its back.
- `hair`, `hairColor` and `tool` are optional in `goblins/v1`: older recipes still validate, and `fromJSON` defaults them to none.

## 0.5.0 — 2026-11-16

### Added
- Fifteen new expressions, for thirty in all. `serious`, plus activities that act out the spells while the goblin stays a goblin: `calculating` (equations and a gravity diagram orbit its head), `jotting`, `drawing`, `hearing`, `announcing`, `posting`, `catching`, `syncing`, `waiting`, `ringing`, `low-battery`, `scanning`, `orbiting`, `juggling`. Each has a 3D prop and motion, and a flat SVG version.
- Expression ids are append-only and never share a name with a spell, so bare strings in `play()` sequences stay unambiguous.

### Fixed
- Receiving (solid): the mailbox's rounded roof was rendered upside down inside the box.
- Spells: gold twinkles no longer linger on hidden dots, such as the trail of a plane that has already landed.

## 0.4.0 — 2026-11-16

First packaged release, for embedding goblins in other apps (starting with Astrid's macOS app).

### Added
- `@404khai/goblins` package with `flat`, `react` and `element` entry points, a single-file ES module (`dist/goblins.js`, three included) and type declarations. `three` and `react` are optional peer dependencies.
- `createGoblin(el, options)`: a framework-free controller with `setExpression`, `cast`, `play`, `stop`, `poke`, `lookAt`, `setGoblin`, `setSize`, `pause`, `resume`, `snapshot`, `destroy`, and `statechange` / `morphdone` / `ready` events. Unknown names return `false` and never throw.
- Shared WebGL renderer: every goblin on a page renders through one context via a tiled atlas; off-screen, paused and settled goblins stop drawing. `renderer: "own"` opts out per goblin. `rendererStats()`.
- `<goblin-avatar>` custom element with live attributes, `mode="svg"`, and DOM events.
- `dist/embed.html`: a message-driven page for native hosts (WKWebView, iframes) with protocol v1 (`set`, `expression`, `cast`, `play`, `poke`, `layout` in; `ready`, `click`, `state`, `error` out). Strict-CSP safe, no network.
- `goblins/v1` JSON Schema (`dist/goblins.schema.json`), `validate(recipe)` and `goblinSchema()`.
- `goblinGlyphSvg(goblin)`: a single-colour outline icon, legible at 20 px.
- `prefers-reduced-motion` support in the engine: one settled pose that still reacts to changes.
- Unit tests (`bun test`) and real-browser tests (`tests/browser`), including a 24-goblin page.

### Changed
- Solving spell: the cube is juggled, scrambled with six real face turns, and solved by undoing them.
- `fromJSON` keeps a recipe's `id` when it has one, so hosts can address goblins.
- Expression and spell metadata moved into three-free modules (`poses.ts`, `spells.ts`); rendering is unchanged.
- The website now builds to `dist-site/`; `dist/` is the package.

## 0.3.0 — 2026-11-16
- Spells: goblins transform into what they're doing, as fine dots or solid toon objects, with an optional rune circle. Paste JSON into the studio.

## 0.2.0 — 2026-11-16
- Website: home island, studio, docs, changelog. SVG, PNG, JSON and React exports. Fifteen expressions.

## 0.1.0 — 2026-11-16
- The first goblins, in a single HTML file.
