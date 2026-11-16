import { useEffect, useRef, useState } from "react";
import { download, fileBase, fromJSON, toJSON, toPNG, toReact, toSVG } from "../goblin/export";
import { GoblinAvatar } from "../goblin/react";
import { Nav } from "../site/Chrome";
import Stage, { type View } from "./Stage";
import { EXPRESSIONS, EXPRESSION_IDS } from "../goblin/expressions";
import { DEFAULT_CLAN, NAMES, OPTIONS, randomGoblin, type ExpressionId, type Goblin } from "../goblin/types";

const STORE = "goblins.v2";

function load(): Goblin[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? "null");
    if (Array.isArray(v) && v.length) return v;
  } catch {}
  return DEFAULT_CLAN;
}

export default function App() {
  const [clan, setClan] = useState<Goblin[]>(load);
  const [sel, setSel] = useState(0);
  const [view, setView] = useState<View>("clan");
  const g = clan[sel];

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(clan)); } catch {}
  }, [clan]);

  const update = (patch: Partial<Goblin>) => setClan((c) => c.map((x, i) => (i === sel ? { ...x, ...patch } : x)));
  const setExpression = (expression: ExpressionId, all = false) =>
    setClan((c) => c.map((x, i) => (all || i === sel ? { ...x, expression } : x)));

  const addGoblin = () => {
    const used = new Set(clan.map((x) => x.name));
    const name = NAMES.find((n) => !used.has(n)) ?? `Goblin ${clan.length + 1}`;
    setClan((c) => [...c, randomGoblin({ id: `g${Date.now()}`, name, expression: "idle" })]);
    setSel(clan.length);
  };
  const removeGoblin = () => {
    if (clan.length <= 1) return;
    setClan((c) => c.filter((_, i) => i !== sel));
    setSel((s) => Math.max(0, s - 1));
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const say = (msg: string) => { setNote(msg); setTimeout(() => setNote(""), 2600); };
  const base = fileBase(g.name);
  const snippet = `<GoblinAvatar goblin={${base.replace(/-./g, (m) => m[1].toUpperCase())}} expression="${g.expression}" size={96} />`;
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); say(`Copied ${what}`); } catch { say("Copy blocked here. Select the text and copy it."); }
  };
  const importFile = async (f?: File) => {
    if (!f) return;
    try {
      const list = fromJSON(await f.text());
      setClan((c) => [...c, ...list]);
      setSel(clan.length);
      say(`Imported ${list.length} goblin${list.length > 1 ? "s" : ""}`);
    } catch (e) { say((e as Error).message); }
  };

  return (
    <div className="studio-page">
    <Nav current="Studio" />
    <div className="app">
      <section className="stage">
        <Stage clan={clan} selected={sel} view={view} onSelect={setSel} onView={setView} />
        <header className="brand">
          <h1>Goblins</h1>
          <p>Avatar bundle · {clan.length} in the clan</p>
        </header>
        <div className="viewtoggle" role="group" aria-label="Camera">
          {(["clan", "closeup"] as View[]).map((v) => (
            <button key={v} type="button" className="chip" aria-pressed={view === v} onClick={() => setView(v)}>
              {v === "clan" ? "Whole clan" : "Close-up"}
            </button>
          ))}
        </div>
        <p className="hint">Click a goblin for a close-up · pinch or scroll out for the clan · drag to spin</p>
      </section>

      <aside className="panel">
        <div className="who">
          <input id="name" aria-label="Goblin name" maxLength={16} value={g.name} onChange={(e) => update({ name: e.target.value })} />
          <span className="tag">
            no. {String(sel + 1).padStart(2, "0")} / {String(clan.length).padStart(2, "0")}
          </span>
        </div>

        <div className="group">
          <div className="grouphead">
            <h2>Expression</h2>
            <button type="button" className="link" onClick={() => setExpression(g.expression, true)}>
              Everyone does this
            </button>
          </div>
          <div className="chips">
            {EXPRESSION_IDS.map((id) => (
              <button key={id} id={`expr-${id}`} type="button" className="chip" aria-pressed={g.expression === id} onClick={() => setExpression(id)}>
                {EXPRESSIONS[id].label}
              </button>
            ))}
          </div>
          <p className="blurb">{EXPRESSIONS[g.expression].blurb}</p>
        </div>

        {(Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]).map((k) => {
          const o = OPTIONS[k];
          if (o.dependsOn && g[o.dependsOn[0]] === o.dependsOn[1]) return null;
          return (
            <div className="group" key={k}>
              <h2>{o.label}</h2>
              <div className="chips">
                {o.values.map((v) => {
                  const on = o.multi ? g.extras.includes(v) : g[k] === v;
                  const toggle = () =>
                    update(o.multi ? { extras: on ? g.extras.filter((x) => x !== v) : [...g.extras, v] } : ({ [k]: v } as Partial<Goblin>));
                  return o.color ? (
                    <button key={v} id={`opt-${k}-${v.slice(1)}`} type="button" className="sw" style={{ background: v }} aria-label={`${o.label} ${v}`} aria-pressed={on} onClick={toggle} />
                  ) : (
                    <button key={v} id={`opt-${k}-${v}`} type="button" className="chip" aria-pressed={on} onClick={toggle}>
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="group export-box">
          <div className="grouphead">
            <h2>Export {g.name}</h2>
            <GoblinAvatar goblin={g} size={44} hands={false} props={false} idPrefix="studio-thumb" />
          </div>
          <div className="exp-grid">
            <button type="button" className="chip" onClick={() => { download(`${base}.svg`, toSVG(g), "image/svg+xml"); say("Saved SVG"); }}>SVG</button>
            <button type="button" className="chip" onClick={async () => { download(`${base}.png`, await toPNG(g)); say("Saved PNG"); }}>PNG</button>
            <button type="button" className="chip" onClick={() => { download(`${base}.json`, toJSON(g), "application/json"); say("Saved JSON"); }}>JSON</button>
            <button type="button" className="chip" onClick={() => { download(`${base[0].toUpperCase()}${base.slice(1).replace(/-./g, (m) => m[1].toUpperCase())}.tsx`, toReact(g)); say("Saved React component"); }}>React .tsx</button>
            <button type="button" className="chip" onClick={() => copy(toSVG(g), "SVG markup")}>Copy SVG</button>
            <button type="button" className="chip" onClick={() => copy(toJSON(g), "JSON")}>Copy JSON</button>
          </div>
          <pre className="snippet"><code>{snippet}</code></pre>
          <div className="exp-grid">
            <button type="button" className="chip" onClick={() => { download("goblin-clan.json", toJSON(clan), "application/json"); say("Saved the whole clan"); }}>Clan JSON</button>
            <button type="button" className="chip" onClick={() => fileRef.current?.click()}>Import JSON…</button>
            <input id="import-json" ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          <p className="note" role="status">{note}</p>
        </div>

        <div className="actions">
          <button type="button" className="btn" onClick={() => update(randomGoblin(g))}>
            Reroll this one
          </button>
          <button type="button" className="btn ghost" onClick={addGoblin}>
            Add a goblin
          </button>
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={removeGoblin} disabled={clan.length <= 1}>
            Remove {g.name}
          </button>
          <button type="button" className="btn ghost" onClick={() => { setClan(DEFAULT_CLAN); setSel(0); }}>
            Reset clan
          </button>
        </div>
      </aside>
    </div>
    </div>
  );
}
