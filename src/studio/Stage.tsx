import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildGoblin, disposeRig, type Rig } from "../goblin/build";
import { animate } from "../goblin/expressions";
import { Morpher, type SpellStyle } from "../goblin/morph";
import type { Goblin } from "../goblin/types";

export type View = "clan" | "closeup";

interface Props {
  clan: Goblin[];
  selected: number;
  view: View;
  onSelect: (i: number) => void;
  onView: (v: View) => void;
  circle: boolean;
  spellStyle: SpellStyle;
}

interface Actor { rig: Rig; key: string; home: THREE.Vector3; spin: number; morph?: Morpher }

const traitKey = ({ name, expression, morph, ...traits }: Goblin) => JSON.stringify(traits);

export default function Stage({ clan, selected, view, onSelect, onView, circle, spellStyle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ clan, selected, view, onSelect, onView, circle, spellStyle });
  live.current = { clan, selected, view, onSelect, onView, circle, spellStyle };
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 300);
    scene.add(new THREE.AmbientLight(0xffffff, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(4, 6, 8);
    scene.add(sun);

    let actors: Actor[] = [];
    const camPos = new THREE.Vector3(0, 0, 30), camLook = new THREE.Vector3();
    const camPosT = camPos.clone(), camLookT = camLook.clone();
    camera.position.copy(camPos);

    const sync = () => {
      const list = live.current.clan;
      actors.slice(list.length).forEach((a) => { scene.remove(a.rig.root); disposeRig(a.rig); });
      actors = list.map((g, i) => {
        const key = traitKey(g);
        const prev = actors[i];
        if (prev && prev.key === key) return prev;
        const rig = buildGoblin(g);
        if (prev) { prev.morph?.dispose(); rig.root.position.copy(prev.rig.root.position); rig.root.rotation.y = prev.spin; scene.remove(prev.rig.root); disposeRig(prev.rig); }
        rig.root.userData.idx = i;
        scene.add(rig.root);
        return { rig, key, home: prev?.home ?? new THREE.Vector3(), spin: prev?.spin ?? 0 };
      });
      layout(!actors.some((a) => a.home.lengthSq() > 0));
    };
    syncRef.current = sync;

    const layout = (snap = false) => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const aspect = w / h;
      const n = actors.length;
      const cols = aspect > 1.25 ? 4 : aspect > 0.8 ? 3 : 2;
      const rows = Math.ceil(n / cols);
      const dx = 4.3, dy = 5.6;
      actors.forEach((a, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const inRow = Math.min(cols, n - r * cols);
        a.home.set((c - (inRow - 1) / 2) * dx, ((rows - 1) / 2 - r) * dy, 0);
        if (snap) a.rig.root.position.copy(a.home);
      });
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      const t = Math.tan(THREE.MathUtils.degToRad(15));
      const fit = (wd: number, ht: number) => Math.max(ht / (2 * t), wd / (2 * t * aspect));
      const sel = actors[live.current.selected];
      if (live.current.view === "closeup" && sel) {
        camLookT.copy(sel.home).add(new THREE.Vector3(0, 0.2, 0));
        camPosT.copy(camLookT).add(new THREE.Vector3(0, 0.3, fit(5.6, 6.2)));
      } else {
        camLookT.set(0, 0, 0);
        camPosT.set(0, 0.6, fit(cols * dx + 0.6, rows * dy + 0.4));
      }
      if (snap) { camPos.copy(camPosT); camLook.copy(camLookT); }
    };

    const resize = () => { renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); layout(); };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // pointer: eyes follow, click selects, drag spins a goblin
    const ndc = new THREE.Vector2(), ray = new THREE.Raycaster();
    let drag: { idx: number; x: number; y: number; moved: boolean } | null = null;
    const toNdc = (e: { clientX: number; clientY: number }) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    };
    const hitIndex = () => {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(actors.map((a) => a.rig.root), true)[0];
      let o: THREE.Object3D | null = hit?.object ?? null;
      while (o && o.userData.idx === undefined) o = o.parent;
      return o ? (o.userData.idx as number) : -1;
    };

    // zoom gestures: pinch/scroll out from a close-up shows the clan; in from the clan opens the goblin under the cursor
    let zoomAcc = 0, zoomLock = 0;
    const zoom = (delta: number) => {
      if (performance.now() < zoomLock) return;
      zoomAcc += delta;
      const { view, selected } = live.current;
      if (zoomAcc > 60 && view === "closeup") {
        live.current.onView("clan");
      } else if (zoomAcc < -60 && view === "clan") {
        const i = hitIndex();
        live.current.onSelect(i >= 0 ? i : selected);
        live.current.onView("closeup");
      } else return;
      zoomAcc = 0;
      zoomLock = performance.now() + 600;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      toNdc(e);
      zoom(e.ctrlKey ? e.deltaY * 4 : e.deltaY); // ctrl+wheel is a trackpad pinch
    };

    const touches = new Map<number, { x: number; y: number }>();
    let pinchStart = 0;
    const spread = () => {
      const [a, b] = [...touches.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const down = (e: PointerEvent) => {
      toNdc(e);
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) { pinchStart = spread(); drag = null; return; }
      drag = { idx: hitIndex(), x: e.clientX, y: e.clientY, moved: false };
      if (drag.idx >= 0) canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      toNdc(e);
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2 && pinchStart) {
        const ratio = spread() / pinchStart;
        if (ratio < 0.8 || ratio > 1.25) { zoom(ratio < 1 ? 999 : -999); pinchStart = spread(); }
        return;
      }
      if (!drag || drag.idx < 0) { canvas.style.cursor = hitIndex() >= 0 ? "pointer" : "default"; return; }
      const dxp = e.clientX - drag.x;
      if (Math.abs(dxp) > 4) drag.moved = true;
      if (drag.moved) { actors[drag.idx].spin += dxp * 0.012; drag.x = e.clientX; canvas.style.cursor = "grabbing"; }
    };
    const up = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinchStart = 0;
      if (drag && !drag.moved && drag.idx >= 0) {
        live.current.onSelect(drag.idx);
        live.current.onView("closeup");
      }
      drag = null;
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    const point = new THREE.Vector3(), rel = new THREE.Vector2();
    let raf = 0;
    const tick = () => {
      const t = clock.getElapsedTime();
      layout();
      camPos.lerp(camPosT, 0.08);
      camLook.lerp(camLookT, 0.08);
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      ray.setFromCamera(ndc, camera);
      const d = ray.ray.direction;
      point.copy(d).multiplyScalar((4 - ray.ray.origin.z) / d.z).add(ray.ray.origin);
      const { clan, selected } = live.current;
      actors.forEach((a, i) => {
        const root = a.rig.root;
        root.position.lerp(a.home, 0.1);
        const on = i === selected;
        root.scale.setScalar(THREE.MathUtils.lerp(root.scale.x, on && live.current.view === "clan" ? 1.08 : 0.94, 0.12));
        if (!drag || drag.idx !== i) a.spin *= 0.94;
        root.rotation.y = a.spin;
        a.rig.ring.visible = on;
        rel.set(THREE.MathUtils.clamp((point.x - root.position.x) / 6, -1, 1), THREE.MathUtils.clamp((point.y - root.position.y) / 6, -1, 1));
        animate(a.rig, clan[i].expression, t + i * 0.37, rel, reduce);
        const spell = clan[i].morph ?? null;
        if (spell && !a.morph) a.morph = new Morpher(a.rig, clan[i]);
        if (a.morph) { a.morph.circle = live.current.circle; a.morph.style = live.current.spellStyle; a.morph.set(spell); a.morph.update(t); }
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    sync();
    resize();
    layout(true);
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      actors.forEach((a) => disposeRig(a.rig));
      renderer.dispose();
    };
  }, []);

  useEffect(() => syncRef.current(), [clan]);

  return <canvas ref={canvasRef} className="stage-canvas" aria-label="Lineup of 3D goblin avatars" />;
}
