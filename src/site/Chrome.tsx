import { Logo, LogoFlat } from "./Logo";
import { Scenery } from "./Scenery";

const LINKS = [
  { label: "Home", href: "./index.html" },
  { label: "Studio", href: "./studio.html" },
  { label: "Docs", href: "./docs.html" },
  { label: "Changelog", href: "./changelog.html" },
  { label: "Classic", href: "./goblins.html" },
];

export function Nav({ current }: { current: string }) {
  return (
    <nav className="nav">
      <a className="nav-brand" href="./index.html">
        <Logo size={44} />
        <span>Goblins</span>
      </a>
      <div className="nav-links">
        {LINKS.map((l) => (
          <a key={l.label} href={l.href} aria-current={l.label === current ? "page" : undefined}>
            {l.label}
          </a>
        ))}
      </div>
      <a className="nav-cta" href="./studio.html">Make a goblin</a>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-scene" aria-hidden="true">
        <Scenery kind="tree" className="fs-tree" />
        <Scenery kind="lamp" className="fs-lamp" style={{ "--d": "-2s" }} />
        <Scenery kind="flower" className="fs-flower1" style={{ "--d": "-1s" }} />
        <Scenery kind="tulip" className="fs-flower2" style={{ "--d": "-3s" }} />
        <Scenery kind="mushroom" className="fs-mush" />
        <Scenery kind="stones" className="fs-stones" />
        <Scenery kind="sign" className="fs-sign" />
      </div>
      <div className="footer-row">
        <span className="footer-brand"><LogoFlat size={28} expression="wink" /> Goblins</span>
        <span>Flat-shaded 3D avatars with gnome hats and beards. Built with three.js and React.</span>
        <span className="mono">v0.3 · Nov 2026</span>
      </div>
    </footer>
  );
}
