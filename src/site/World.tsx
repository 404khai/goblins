import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildGoblin, disposeRig, kit } from "../goblin/build";
import { animate } from "../goblin/expressions";
import { Morpher, type MorphId } from "../goblin/morph";
import { DEFAULT_CLAN, type ExpressionId, type Goblin } from "../goblin/types";

const { toon, flat, mesh, sphere } = kit;
type V3 = [number, number, number];
const GROUND = 0;

/** A floating storybook island: a stone path, lamps, flowers, mushrooms, trees, and goblins living on it. */
function buildIsland(scene: THREE.Object3D, rand: () => number) {
  const island = new THREE.Group();
  scene.add(island);
  mesh(new THREE.CylinderGeometry(13, 12.4, 1.2, 64), toon("#86B35F"), island, [0, GROUND - 0.6, 0]);
  mesh(new THREE.CylinderGeometry(12.3, 7, 3.2, 64), toon("#8A5E3C"), island, [0, GROUND - 2.8, 0]);
  mesh(new THREE.ConeGeometry(7, 5, 48), toon("#6E4A2F"), island, [0, GROUND - 6.8, 0], null, [Math.PI, 0, 0]);
  for (const [x, z, r] of [[-5, 4, 1.4], [6, -2, 1.1], [2, 6, 0.9]] as const)
    mesh(new THREE.ConeGeometry(r, 2.4, 6), toon("#7A5236"), island, [x * 0.7, GROUND - 4.6, z * 0.6], null, [Math.PI, 0, 0]);

  // winding path
  const curve = new THREE.CatmullRomCurve3([[-11, 0, 5], [-6, 0, 2.5], [-2, 0, 4.5], [2.5, 0, 1.5], [6.5, 0, 3], [11, 0, -1]].map((p) => new THREE.Vector3(...p)));
  const stone = toon("#E6D9B6");
  const stoneGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.16, 10);
  for (let u = 0; u <= 1; u += 0.024) {
    const p = curve.getPointAt(u);
    for (const side of [-0.45, 0.45]) {
      if (rand() < 0.2) continue;
      const tan = curve.getTangentAt(u);
      const off = new THREE.Vector3(-tan.z, 0, tan.x).multiplyScalar(side + (rand() - 0.5) * 0.3);
      mesh(stoneGeo, stone, island, [p.x + off.x, GROUND + 0.05, p.z + off.z], [0.7 + rand() * 0.5, 1, 0.6 + rand() * 0.4], [0, rand() * 3, 0]);
    }
  }

  const lamp = (x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, GROUND, z);
    island.add(g);
    mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.4, 12), toon("#3A3832"), g, [0, 1.7, 0]);
    mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.25, 12), toon("#3A3832"), g, [0, 0.12, 0]);
    mesh(new THREE.BoxGeometry(0.75, 0.8, 0.75), flat("#FFD35C"), g, [0, 3.75, 0]);
    mesh(new THREE.ConeGeometry(0.65, 0.6, 4), toon("#2F4AA8"), g, [0, 4.45, 0], null, [0, Math.PI / 4, 0]);
    mesh(sphere(0.12), toon("#E0A92B"), g, [0, 4.85, 0]);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), new THREE.MeshBasicMaterial({ color: "#FFE08A", transparent: true, opacity: 0.35 }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    g.add(glow);
  };
  [[-7.5, 0.4], [-0.5, 2.3], [4.6, 0.2], [9.2, 2.2]].forEach(([x, z]) => lamp(x, z));

  const flower = (x: number, z: number, color: string, h: number) => {
    const g = new THREE.Group();
    g.position.set(x, GROUND, z);
    g.rotation.y = rand() * 6;
    island.add(g);
    mesh(new THREE.CylinderGeometry(0.04, 0.05, h, 6), toon("#2E6B46"), g, [0, h / 2, 0], null, null, false);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      mesh(sphere(0.16, 10, 8), toon(color), g, [Math.cos(a) * 0.17, h, Math.sin(a) * 0.17], [1, 0.45, 1]);
    }
    mesh(sphere(0.11, 10, 8), toon("#F2B630"), g, [0, h + 0.05, 0], null, null, false);
    g.userData.sway = rand() * 6;
    return g;
  };
  const flowers: THREE.Group[] = [];
  const colors = ["#E35D9C", "#F7F2E6", "#D8402F", "#9C86C9", "#F2B630"];
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2, r = 3 + rand() * 9.3;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const near = curve.getPoints(60).some((p) => p.distanceTo(new THREE.Vector3(x, 0, z)) < 1.4);
    if (!near) flowers.push(flower(x, z, colors[i % colors.length], 0.5 + rand() * 0.6));
  }

  const mushroom = (x: number, z: number, s: number) => {
    const g = new THREE.Group();
    g.position.set(x, GROUND, z);
    g.scale.setScalar(s);
    island.add(g);
    mesh(new THREE.CylinderGeometry(0.28, 0.36, 1, 14), toon("#F2ECDD"), g, [0, 0.5, 0]);
    const cap = mesh(new THREE.SphereGeometry(0.85, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon("#D8402F"), g, [0, 0.95, 0], [1, 0.75, 1]);
    for (const [px, py, pz] of [[0, 0.82, 0.25], [0.55, 0.5, 0.3], [-0.5, 0.55, -0.2], [0.2, 0.6, -0.55]] as V3[]) mesh(sphere(0.13, 10, 8), toon("#F7F2E6"), cap, [px, py, pz], [1, 0.4, 1], null, false);
  };
  [[-9.5, -3, 1.2], [-8.4, -4.5, 0.8], [7.5, -6, 1.4], [3, -8.5, 0.9], [-2, 9, 0.7]].forEach(([x, z, s]) => mushroom(x, z, s));

  const tree = (x: number, z: number, s: number, fruit: boolean) => {
    const g = new THREE.Group();
    g.position.set(x, GROUND, z);
    g.scale.setScalar(s);
    island.add(g);
    mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.6, 10), toon("#7A5236"), g, [0, 1.3, 0]);
    mesh(sphere(1.7), toon("#4E8C4A"), g, [0, 3.6, 0]);
    mesh(sphere(1.15), toon("#5E9E56"), g, [-1.2, 2.9, 0.4]);
    mesh(sphere(1.2), toon("#5E9E56"), g, [1.2, 3.0, -0.2]);
    if (fruit) for (const p of [[0.6, 4.3, 1.4], [-1.2, 3.4, 1.4], [1.6, 2.9, 0.9]] as V3[]) mesh(sphere(0.2, 10, 8), toon("#D8402F"), g, p);
  };
  [[-5.5, -7, 1.2, true], [1, -9.5, 1.4, false], [8.5, -3.5, 1.0, true], [-10.5, 0.5, 0.8, false]].forEach(([x, z, s, f]) => tree(x as number, z as number, s as number, f as boolean));

  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2, r = 10 + rand() * 2.2;
    mesh(new THREE.DodecahedronGeometry(0.35 + rand() * 0.4), toon("#A8A08C"), island, [Math.cos(a) * r, GROUND + 0.15, Math.sin(a) * r], [1, 0.7, 1], [rand(), rand(), rand()]);
  }

  // fireflies
  const flies: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i++) {
    const f = new THREE.Mesh(sphere(0.07, 8, 6), flat("#FFE27A"));
    f.userData.seed = [rand() * 20 - 10, 1 + rand() * 4, rand() * 16 - 8, rand() * 6];
    island.add(f);
    flies.push(f);
  }
  return { island, curve, flowers, flies };
}

// "~name" in a cycle casts that spell for the beat
const CAST: { idx: number; at: [number, number] | "walk"; cycle: (ExpressionId | `~${MorphId}`)[] }[] = [
  { idx: 0, at: [-4.2, -2.6], cycle: ["idle", "happy", "talking", "laughing"] },
  { idx: 1, at: [-8.8, -0.8], cycle: ["thinking", "~writing", "wink", "~writing"] },
  { idx: 2, at: "walk", cycle: ["searching"] },
  { idx: 4, at: [6.2, -3.4], cycle: ["sleeping", "~powering-down", "surprised", "idle"] },
  { idx: 3, at: [1.6, -4.8], cycle: ["celebrate", "~solving", "happy", "~sketching"] },
  { idx: 6, at: [-1.4, 7.2], cycle: ["love", "happy", "idle", "talking"] },
  { idx: 8, at: [9.6, 5.2], cycle: ["~listening", "nervous", "~orbit", "idle"] },
];

export function World({ clan = DEFAULT_CLAN }: { clan?: Goblin[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(6, 10, 8);
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 300);

    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const { island, curve, flowers, flies } = buildIsland(scene, rand);

    const actors = CAST.filter((c) => clan[c.idx]).map((c, k) => {
      const rig = buildGoblin(clan[c.idx]);
      rig.ring.visible = false;
      rig.root.scale.setScalar(0.62);
      if (c.at !== "walk") rig.root.position.set(c.at[0], GROUND + 2.25 * 0.62, c.at[1]);
      rig.root.rotation.y = c.at === "walk" ? 0 : -c.at[0] * 0.03;
      island.add(rig.root);
      return { rig, c, phase: k * 1.7, morph: c.cycle.some((x) => x.startsWith("~")) ? new Morpher(rig, clan[c.idx]) : null };
    });

    const pointer = new THREE.Vector2();
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.set(THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1), THREE.MathUtils.clamp(-(((e.clientY - r.top) / r.height) * 2 - 1), -1, 1));
    };
    window.addEventListener("pointermove", move);
    const fit = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h || 1;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    const rel = new THREE.Vector2();
    let raf = 0;
    const tick = () => {
      const t = reduce ? 4 : clock.getElapsedTime();
      const narrow = camera.aspect < 1;
      const dist = narrow ? 44 : camera.aspect < 1.5 ? 36 : 30;
      camera.position.set(Math.sin(pointer.x * 0.15) * dist * 0.3, 11 + pointer.y * 1.2, dist);
      camera.lookAt(0, narrow ? -2.5 : -1.2, 0);
      island.rotation.y = sin(t * 0.08) * 0.12;

      for (const a of actors) {
        const { rig, c } = a;
        const beat = c.cycle[Math.floor((t + a.phase) / 6) % c.cycle.length];
        const spell = beat.startsWith("~") ? (beat.slice(1) as MorphId) : null;
        let expr: ExpressionId = spell ? "idle" : (beat as ExpressionId);
        if (c.at === "walk") {
          const u = (Math.sin(t * 0.06) + 1) / 2;
          const p = curve.getPointAt(u);
          const tan = curve.getTangentAt(u).multiplyScalar(Math.cos(t * 0.06) >= 0 ? 1 : -1);
          rig.root.position.set(p.x, GROUND + 2.25 * 0.62 + Math.abs(Math.sin(t * 7)) * 0.12, p.z);
          rig.root.rotation.y = THREE.MathUtils.lerp(rig.root.rotation.y, Math.atan2(tan.x, tan.z) * 0.6, 0.05);
          expr = Math.floor(t / 9) % 3 === 2 ? "happy" : "searching";
        }
        rel.set(pointer.x - rig.root.position.x / 14, pointer.y);
        animate(rig, expr, t + a.phase, rel, reduce);
        if (a.morph) { a.morph.set(spell); a.morph.update(t); }
      }
      flowers.forEach((f) => (f.rotation.z = Math.sin(t * 1.4 + f.userData.sway) * 0.08));
      flies.forEach((f) => {
        const [x, y, z, s] = f.userData.seed as number[];
        f.position.set(x + Math.sin(t * 0.5 + s) * 0.8, y + Math.sin(t * 0.9 + s) * 0.4, z + Math.cos(t * 0.4 + s) * 0.8);
        f.scale.setScalar(0.6 + Math.abs(Math.sin(t * 2 + s)) * 0.8);
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    const sin = Math.sin;
    fit();
    tick();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", move);
      actors.forEach((a) => { a.morph?.dispose(); disposeRig(a.rig); });
      renderer.dispose();
    };
  }, [clan]);
  return <canvas ref={ref} className="world" aria-label="A floating island where the goblins live: a stone path, lamps, flowers, mushrooms and trees" />;
}
