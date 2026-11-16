import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { EXPRESSIONS, EXPRESSION_IDS } from "../../goblin/expressions";
import { GoblinAvatar } from "../../goblin/react";
import { DEFAULT_CLAN, OPTIONS } from "../../goblin/types";
import { Footer, Nav } from "../../site/Chrome";
import { Scenery } from "../../site/Scenery";
import { World } from "../../site/World";
import "../../site/site.css";
import "./home.css";

// Real count of distinct looks the trait set allows (extras are on/off each).
const LOOKS = Object.values(OPTIONS).reduce((n, o) => n * (o.multi ? 2 ** o.values.length : o.values.length), 1);
const looks = LOOKS >= 1e9 ? `${(LOOKS / 1e9).toFixed(1)} billion` : `${Math.round(LOOKS / 1e6)} million`;

const EXPORTS = [
  { title: "SVG", body: "A flat sticker of any goblin in any expression. Crisp at every size, editable in Figma.", code: `goblinSvg(bramble, { expression: "wink" })` },
  { title: "React", body: "One .tsx file per goblin with all 15 expressions baked in. No dependencies.", code: `<Bramble expression="thinking" size={64} />` },
  { title: "JSON", body: "The goblin's recipe. Import it back into the studio or keep a clan in your repo.", code: `{ "hat": "gnome", "eyes": "visor", … }` },
  { title: "PNG", body: "A 1024px transparent image for chat apps, slides and profile pictures.", code: `await toPNG(bramble, 1024)` },
];

function Home() {
  return (
    <div className="rails">
      <Nav current="Home" />

      <header className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Avatar bundle · 3D · SVG · React</span>
          <h1>A clan of goblins, ready to move in.</h1>
          <p>
            Gnome hats, braided beards and big googly eyes. Each goblin has fifteen animated moods, from
            thinking to snoring, and exports to SVG, PNG, JSON or a React component.
          </p>
          <div className="hero-cta">
            <a className="btn" href="./studio.html">Open the studio</a>
            <a className="btn ghost" href="./docs.html">Read the docs</a>
          </div>
        </div>
        <Scenery kind="lamp" className="hero-lamp" style={{ "--d": "-1s" }} />
        <Scenery kind="mushroom" className="hero-mush" style={{ "--d": "-4s" }} />
      </header>

      <section className="world-wrap" aria-label="Goblin island">
        <World />
        <p className="world-note mono">Move your cursor. They're watching.</p>
      </section>

      <section className="sect">
        <div className="sect-head">
          <span className="eyebrow">Expressions</span>
          <h2>Fifteen moods, each with its own moves.</h2>
          <p>Every expression drives the eyes, lids, brows, mouth, hands and props together, so a goblin reads at 32px.</p>
        </div>
        <div className="moods">
          {EXPRESSION_IDS.map((id, i) => (
            <figure key={id} className="mood">
              <GoblinAvatar goblin={DEFAULT_CLAN[i % DEFAULT_CLAN.length]} expression={id} size="100%" idPrefix={`mood-${id}`} className="bob" style={{ animationDelay: `${-i * 0.3}s` }} />
              <figcaption>
                <b>{EXPRESSIONS[id].label}</b>
                <span>{EXPRESSIONS[id].blurb}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="sect split">
        <div className="sect-head">
          <span className="eyebrow">Wardrobe</span>
          <h2>{looks} ways to dress a goblin.</h2>
          <p>Mix heads, ears, noses, hats and beards, then add glasses, headphones, a scarf or a pipe.</p>
          <a className="btn ghost" href="./studio.html">Try the wardrobe</a>
        </div>
        <ul className="wardrobe">
          {Object.values(OPTIONS).map((o) => (
            <li key={o.label}>
              <span>{o.label}</span>
              <b>{o.color ? `${o.values.length} colors` : o.values.join(" · ")}</b>
            </li>
          ))}
        </ul>
      </section>

      <section className="sect">
        <div className="sect-head">
          <span className="eyebrow">Export</span>
          <h2>Take them anywhere.</h2>
        </div>
        <div className="exports">
          {EXPORTS.map((e) => (
            <article key={e.title} className="export">
              <h3>{e.title}</h3>
              <p>{e.body}</p>
              <pre className="code"><code>{e.code}</code></pre>
            </article>
          ))}
        </div>
        <Scenery kind="tulip" className="peek-right" style={{ "--d": "-2s" }} />
      </section>

      <Footer />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Home /></StrictMode>);
