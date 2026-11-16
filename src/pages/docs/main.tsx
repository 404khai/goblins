import { StrictMode, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { EXPRESSIONS, EXPRESSION_IDS } from "../../goblin/expressions";
import { toJSON } from "../../goblin/export";
import { MORPHS, MORPH_IDS } from "../../goblin/morph";
import { GoblinAvatar } from "../../goblin/react";
import { OPTIONS } from "../../goblin/types";
import { Footer, Nav } from "../../site/Chrome";
import { BRAMBLE, Logo } from "../../site/Logo";
import { Scenery } from "../../site/Scenery";
import "../../site/site.css";
import "./docs.css";

const SECTIONS = [
  { id: "start", title: "Getting started" },
  { id: "goblin", title: "The goblin object" },
  { id: "expressions", title: "Expressions" },
  { id: "spells", title: "Spells" },
  { id: "react", title: "React components" },
  { id: "export", title: "Exporting" },
  { id: "json", title: "JSON format" },
  { id: "three", title: "Raw three.js" },
];

const Code = ({ children }: { children: string }) => <pre className="code"><code>{children.trim()}</code></pre>;
const Sect = ({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: ReactNode }) => (
  <section id={id} className="doc-sect" data-sect>
    <span className="eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    {children}
  </section>
);

function Docs() {
  const [active, setActive] = useState(SECTIONS[0].id);
  useEffect(() => {
    const onScroll = () => {
      let cur = SECTIONS[0].id;
      document.querySelectorAll<HTMLElement>("[data-sect]").forEach((el) => { if (el.getBoundingClientRect().top < innerHeight * 0.3) cur = el.id; });
      setActive(cur);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="rails">
      <Nav current="Docs" />
      <header className="doc-banner">
        <div className="doc-banner-art" aria-hidden="true">
          <Logo size={170} expression="happy" />
          <Scenery kind="flower" className="dba-f1" style={{ "--d": "-1s" }} />
          <Scenery kind="tulip" className="dba-f2" style={{ "--d": "-3s" }} />
          <Scenery kind="stones" className="dba-stones" />
        </div>
        <div className="doc-banner-copy">
          <span className="eyebrow">Goblins / Docs</span>
          <h1>Goblins documentation</h1>
          <p>Everything you need to put a goblin in your app: the trait set, the fifteen expressions, the React components and the export formats.</p>
        </div>
        <Scenery kind="lamp" className="doc-lamp" style={{ "--d": "-2s" }} />
      </header>

      <div className="doc-body">
        <nav className="doc-toc" aria-label="On this page">
          <b>On this page</b>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? "true" : undefined}><i />{s.title}</a>
          ))}
        </nav>

        <main className="doc-main">
          <Sect id="start" eyebrow="01 · Start here" title="Getting started">
            <p>Goblins is a small TypeScript library plus a studio. The library lives in <code>src/goblin</code> and depends only on <code>three</code> (for 3D) and <code>react</code> (for the components). The SVG renderer and exporters have no dependencies at all.</p>
            <Code>{`
# clone and run the site + studio
bun install
bun run dev        # http://localhost:5173
bun run build      # static site in dist/
`}</Code>
            <p>To use goblins in another project, copy <code>src/goblin</code> in, or export a single goblin from the studio as a self-contained React file.</p>
            <Code>{`
import { GoblinAvatar, DEFAULT_CLAN } from "./goblin";

const bramble = DEFAULT_CLAN[2];

export function Profile() {
  return <GoblinAvatar goblin={bramble} expression="wink" size={64} />;
}
`}</Code>
          </Sect>

          <Sect id="goblin" eyebrow="02 · Data" title="The goblin object">
            <p>A goblin is a plain object. Every field below is required; <code>extras</code> can be empty.</p>
            <div className="table-wrap">
              <table className="doc-table">
                <thead><tr><th>Field</th><th>Values</th></tr></thead>
                <tbody>
                  <tr><td><code>id</code>, <code>name</code></td><td>Any string. The name shows up in exports and aria labels.</td></tr>
                  <tr><td><code>expression</code></td><td>{EXPRESSION_IDS.join(", ")}</td></tr>
                  {Object.entries(OPTIONS).map(([k, o]) => (
                    <tr key={k}>
                      <td><code>{k}</code>{o.multi && <span className="pill">array</span>}</td>
                      <td>{o.color ? <span className="swatches">{o.values.map((v) => <i key={v} style={{ background: v }} title={v} />)}<em>any hex color</em></span> : o.values.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Sect>

          <Sect id="expressions" eyebrow="03 · Moods" title="Expressions">
            <p>An expression sets a pose (eye shape, lids, brows, mouth, pupil size) and a motion that moves the head, hands and props every frame. In SVG you get a key frame of the same pose.</p>
            <div className="expr-grid">
              {EXPRESSION_IDS.map((id) => (
                <figure key={id}>
                  <GoblinAvatar goblin={BRAMBLE} expression={id} size="100%" idPrefix={`doc-${id}`} />
                  <figcaption><code>{id}</code><span>{EXPRESSIONS[id].blurb}</span></figcaption>
                </figure>
              ))}
            </div>
          </Sect>

          <Sect id="spells" eyebrow="04 · Agents" title="Spells">
            <p>A spell transforms the goblin into what it is doing, the way an agent shows its state. The body dissolves into fine dots in the goblin's own colors and reforms as an object. Switching spells flows the dots straight from one object to the next; clearing the spell (null) sends them back into the goblin. A rune circle glows underneath unless you pass circle={false}. Spells are 3D only; SVG exports show the expression.</p>
            <Code>{`
<Goblin3D goblin={bramble} morph="writing" />    // cast
<Goblin3D goblin={bramble} morph={null} />       // back to a goblin
<Goblin3D goblin={bramble} morph="solving" circle={false} />  // no rune circle
<Goblin3D goblin={bramble} morph="receiving" spellStyle="solid" /> // settle into toon objects

// or save it on the goblin itself
const busy = { ...bramble, morph: "uploading" };
`}</Code>
            <div className="table-wrap">
              <table className="doc-table">
                <thead><tr><th>Spell</th><th>What it becomes</th></tr></thead>
                <tbody>
                  {MORPH_IDS.map((id) => <tr key={id}><td><code>{id}</code></td><td>{MORPHS[id].blurb}</td></tr>)}
                </tbody>
              </table>
            </div>
            <p>With raw three.js, create a <code>Morpher</code> for a rig and call it after <code>animate</code>:</p>
            <Code>{`
const spell = new Morpher(rig, bramble);
spell.set("solving");
// every frame, after animate(...)
spell.update(seconds);
`}</Code>
          </Sect>

          <Sect id="react" eyebrow="05 · React" title="React components">
            <h3><code>&lt;GoblinAvatar /&gt;</code></h3>
            <p>Flat SVG. Cheap enough for long lists, comments and chat avatars, and it renders on the server.</p>
            <Code>{`<GoblinAvatar goblin={bramble} expression="thinking" size={48} hands={false} />`}</Code>
            <h3><code>&lt;Goblin3D /&gt;</code></h3>
            <p>The animated toon-shaded goblin, following the cursor. Each one owns a WebGL canvas, so use it for heroes and profile pages, not lists.</p>
            <Code>{`<Goblin3D goblin={bramble} expression="searching" size={320} />`}</Code>
            <div className="table-wrap">
              <table className="doc-table">
                <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Notes</th></tr></thead>
                <tbody>
                  <tr><td><code>goblin</code></td><td>Goblin</td><td>required</td><td>The recipe.</td></tr>
                  <tr><td><code>morph</code></td><td>MorphId | null</td><td><code>goblin.morph</code></td><td>3D only. Casts a spell.</td></tr>
                  <tr><td><code>circle</code></td><td>boolean</td><td>true</td><td>3D only. The rune circle under a spell.</td></tr>
                  <tr><td><code>spellStyle</code></td><td>"dots" | "solid"</td><td>"dots"</td><td>3D only. Keep the formed object as dots, or settle it into outlined toon meshes.</td></tr>
                  <tr><td><code>expression</code></td><td>ExpressionId</td><td><code>goblin.expression</code></td><td>Overrides the goblin's saved mood.</td></tr>
                  <tr><td><code>size</code></td><td>number | string</td><td>96 / 240</td><td>Pixels or any CSS length.</td></tr>
                  <tr><td><code>hands</code></td><td>boolean</td><td>true</td><td>SVG only. Hide the floating mitts for tight crops.</td></tr>
                  <tr><td><code>props</code></td><td>boolean</td><td>true</td><td>SVG only. Hide Z's, hearts, the magnifier and so on.</td></tr>
                  <tr><td><code>background</code></td><td>string</td><td>none</td><td>SVG only. Fills the square behind the goblin.</td></tr>
                </tbody>
              </table>
            </div>
          </Sect>

          <Sect id="export" eyebrow="06 · Export" title="Exporting">
            <p>The studio's export panel calls these functions. They are also importable from <code>src/goblin/export.ts</code>.</p>
            <div className="table-wrap">
              <table className="doc-table">
                <thead><tr><th>Format</th><th>Function</th><th>What you get</th></tr></thead>
                <tbody>
                  <tr><td>SVG</td><td><code>toSVG(goblin, size?)</code></td><td>A 320-unit square SVG string in the current expression.</td></tr>
                  <tr><td>PNG</td><td><code>toPNG(goblin, size?)</code></td><td>A transparent PNG Blob, 1024px by default. Browser only.</td></tr>
                  <tr><td>JSON</td><td><code>toJSON(goblin | goblin[])</code></td><td>A versioned <code>goblins/v1</code> file. <code>fromJSON</code> reads it back.</td></tr>
                  <tr><td>React</td><td><code>toReact(goblin)</code></td><td>A dependency-free <code>.tsx</code> with every expression as inline SVG.</td></tr>
                </tbody>
              </table>
            </div>
            <p>An exported React file looks like this:</p>
            <Code>{`
import { Bramble } from "./Bramble";

<Bramble expression="celebrate" size={120} />
`}</Code>
          </Sect>

          <Sect id="json" eyebrow="07 · Files" title="JSON format">
            <p>Clan files hold one or more goblins. The studio imports any of: this wrapper, a bare goblin object, or an array of goblins. Paste one into the studio's JSON box, or press paste anywhere on the studio page.</p>
            <Code>{toJSON(BRAMBLE)}</Code>
          </Sect>

          <Sect id="three" eyebrow="08 · Advanced" title="Raw three.js">
            <p>Skip React and drive a rig yourself. <code>buildGoblin</code> returns a <code>Rig</code> whose <code>root</code> you add to any scene; call <code>animate</code> every frame.</p>
            <Code>{`
import { buildGoblin, animate } from "./goblin";

const rig = buildGoblin(bramble);
scene.add(rig.root);

renderer.setAnimationLoop((ms) => {
  // pointer is -1..1 in both axes; the goblin looks toward it
  animate(rig, "thinking", ms / 1000, pointer, false);
  renderer.render(scene, camera);
});
`}</Code>
            <p>Feet sit 2.25 units below the root, so place the root at <code>groundY + 2.25</code>. The home page island is built this way, with lamps and mushrooms made from the same toon kit (<code>kit</code> in <code>build.ts</code>).</p>
          </Sect>
        </main>
      </div>
      <Footer />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Docs /></StrictMode>);
