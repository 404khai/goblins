import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoblinAvatar } from "../../goblin/react";
import { DEFAULT_CLAN, type ExpressionId } from "../../goblin/types";
import { Footer, Nav } from "../../site/Chrome";
import { Logo } from "../../site/Logo";
import { Scenery, type SceneryKind } from "../../site/Scenery";
import "../../site/site.css";
import "./changelog.css";

type Entry = {
  date: string;
  title: string;
  tag: "Site" | "Characters" | "Foundation";
  lede: string;
  items: { title: string; body: string }[];
  art?: SceneryKind;
  cameo?: [number, ExpressionId];
};

const ENTRIES: Entry[] = [
  {
    date: "2026-11-16",
    title: "A home for the goblins",
    tag: "Site",
    lede: "The goblins moved onto a floating island, with docs, a changelog and four ways to take them home.",
    items: [
      { title: "Goblin island", body: "The home page is a live 3D island with a stone path, lamps, flowers, mushrooms, fruit trees and fireflies. Bramble walks the path searching while the rest cycle through their moods." },
      { title: "SVG renderer", body: "goblinSvg draws any goblin flat and front-on from the same traits and poses as the 3D rig. It powers the logo, the docs and the exports." },
      { title: "Export SVG, PNG, JSON and React", body: "The studio exports a sticker, a 1024px PNG, a goblins/v1 JSON file, or a dependency-free .tsx with all fifteen expressions baked in." },
      { title: "Import a clan", body: "Drop a JSON file into the studio to add its goblins to your clan. Bare objects and arrays work too." },
      { title: "Bramble is the logo", body: "Visor eyes, braided beard, blue gnome hat. Rendered by the SVG renderer, so it changes when Bramble does." },
      { title: "Classic page", body: "The first single-file version is kept as Classic for reference." },
    ],
    art: "lamp",
    cameo: [2, "searching"],
  },
  {
    date: "2026-11-16",
    title: "Fifteen moods and a bigger clan",
    tag: "Characters",
    lede: "Every goblin gained brows, eyelids, a mouth and floating mitts, so expressions read from across the room.",
    items: [
      { title: "Expressions with motion", body: "Idle, happy, laughing, in love, wink, surprised, thinking, searching, confused, nervous, sad, angry, talking, sleeping and celebrate. Each one moves the head, hands and props." },
      { title: "Props", body: "Thought bubbles, a magnifying glass, a bobbing question mark, Z's, hearts, a tear, a sweat drop and star confetti." },
      { title: "More faces", body: "Four head shapes, five ear styles including round and droopy, four noses, and beady or oval eyes alongside round, wonky and visor." },
      { title: "More hats", body: "Wizard hats with a star, mushroom caps, sprout tufts and headbands join the gnome hat, beret and beanie." },
      { title: "Twelve in the clan", body: "Twelve preset goblins, each starting in a different mood. Add, remove and reroll from the studio." },
      { title: "React and TypeScript", body: "The canvas became a typed library in src/goblin and a React studio, built with Vite." },
    ],
    art: "flower",
    cameo: [8, "confused"],
  },
  {
    date: "2026-11-16",
    title: "The first goblins",
    tag: "Foundation",
    lede: "Six gnome-hatted goblins in one HTML file, toon-shaded with ink outlines and no gradients.",
    items: [
      { title: "Toon look", body: "Three-step shading and back-face outlines give flat sticker colors in 3D." },
      { title: "Eyes from the references", body: "Googly round eyes, half-lidded and angry lids, mismatched cookie eyes, happy arcs and a glowing bot visor." },
      { title: "Accessories", body: "Round glasses, shades, a monocle, a beret, a beanie, headphones, scarves, an earring and a pipe." },
    ],
    art: "mushroom",
    cameo: [0, "happy"],
  },
];

const fmt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function Changelog() {
  return (
    <div className="rails">
      <Nav current="Changelog" />
      <header className="cl-head">
        <div className="cl-head-art" aria-hidden="true">
          <Logo size={170} expression="wink" />
          <Scenery kind="flower" className="cl-h-f1" style={{ "--d": "-2s" }} />
          <Scenery kind="mushroom" className="cl-h-m" />
        </div>
        <div className="cl-head-copy">
          <h1>What's new?</h1>
          <p>Everything that has landed in Goblins, newest first.</p>
        </div>
        <Scenery kind="tree" className="cl-h-tree" />
      </header>

      <div className="cl-body">
        <nav className="cl-months" aria-label="Months">
          <b>2026</b>
          <a href="#2026-11" aria-current="true"><i />November</a>
        </nav>
        <main className="cl-entries">
          {ENTRIES.map((e, i) => {
            const sameDay = i > 0 && ENTRIES[i - 1].date === e.date;
            const continues = ENTRIES[i + 1]?.date === e.date;
            return (
              <article key={e.title} id={i === 0 ? "2026-11" : undefined} className={["cl-entry", sameDay && "same-day", continues && "continues"].filter(Boolean).join(" ")}>
                {e.art && <Scenery kind={e.art} className={`cl-peek ${i % 2 ? "left" : "right"}`} style={{ "--d": `-${i}s` }} />}
                {!sameDay && <time dateTime={e.date}>{fmt(e.date)}</time>}
                <div className="cl-title">
                  <h2>{e.title}</h2>
                  {e.cameo && <GoblinAvatar goblin={DEFAULT_CLAN[e.cameo[0]]} expression={e.cameo[1]} size={84} idPrefix={`cl-${i}`} className="cl-cameo" />}
                </div>
                <span className={`cl-tag tag-${e.tag.toLowerCase()}`}>{e.tag}</span>
                <p className="cl-lede">{e.lede}</p>
                <div className="cl-items">
                  {e.items.map((it) => (
                    <div key={it.title} className="cl-item">
                      <h3>{it.title}</h3>
                      <p>{it.body}</p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </main>
      </div>
      <Footer />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Changelog /></StrictMode>);
