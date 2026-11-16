import * as THREE from "three";
import type { Rig } from "./build";
import { ACT_MOTION } from "./acts";
import { ACT_KINDS, EXPRESSION_IDS, EXPRESSION_META, STILLS, type ActKind, type EyeMode, type ExpressionMeta, type MouthKind, type Pose, type PropKind, type Still } from "./poses";
import type { ExpressionId } from "./types";

interface Out {
  pos: THREE.Vector3;
  rot: THREE.Vector3;
  look: THREE.Vector2 | null;
  hands: THREE.Vector3[];
  mouth: number;
  squash: number;
  /** Extra lid per eye [left, right] on top of the pose, for winks and squints. */
  squint: [number, number];
}

export interface Expression extends ExpressionMeta {
  motion: (t: number, o: Out, r: Rig) => void;
}

export type { Pose, EyeMode, Still };
export { EXPRESSION_IDS, STILLS };

const sin = Math.sin, abs = Math.abs, cos = Math.cos;
const pulse = (t: number, period: number, len: number) => (t % period) < len;

export const EXPRESSIONS: Record<ExpressionId, Expression> = {
  idle: {
    ...EXPRESSION_META.idle,
    motion: (t, o) => {
      o.pos.y = sin(t * 1.6) * 0.06;
      o.squash = 1 + sin(t * 1.6) * 0.015;
      o.hands.forEach((h, i) => (h.y += sin(t * 1.6 + i) * 0.05));
    },
  },
  happy: {
    ...EXPRESSION_META.happy,
    motion: (t, o, r) => {
      const b = abs(sin(t * 4));
      o.pos.y = b * 0.18;
      o.squash = 0.96 + b * 0.06;
      o.rot.z = sin(t * 4) * 0.06;
      o.hands.forEach((h, i) => { h.y += 0.3 + b * 0.2; h.x *= 1.05; h.z += 0.1 * i; });
      orbit(r.props.sparkles, t, 1.6, r.top * 0.4);
    },
  },
  laughing: {
    ...EXPRESSION_META.laughing,
    motion: (t, o) => {
      o.pos.y = abs(sin(t * 14)) * 0.07 + 0.05;
      o.rot.x = -0.22 + sin(t * 14) * 0.03;
      o.mouth = 1.1 + abs(sin(t * 14)) * 0.35;
      o.hands[0].set(-0.55, -1.15 + abs(sin(t * 14)) * 0.05, 0.85);
      o.hands[1].set(0.55, -1.15 + abs(cos(t * 14)) * 0.05, 0.85);
    },
  },
  love: {
    ...EXPRESSION_META.love,
    motion: (t, o, r) => {
      o.rot.z = sin(t * 1.8) * 0.14;
      o.pos.x = sin(t * 1.8) * 0.08;
      o.hands[0].set(-0.75, -0.55, 0.85);
      o.hands[1].set(0.75, -0.55, 0.85);
      r.props.hearts.children.forEach((h, i) => {
        const k = (t * 0.45 + i / 3) % 1;
        h.position.set(sin(k * 9 + i * 2) * 0.5 + (i - 1) * 0.55, k * 1.6, 0);
        h.scale.setScalar((i === 0 ? 1 : i === 1 ? 0.8 : 0.65) * Math.min(1, (1 - k) * 4) * (1 + sin(t * 8) * 0.06));
      });
    },
  },
  wink: {
    ...EXPRESSION_META.wink,
    motion: (t, o) => {
      const k = (t % 2.4) / 2.4;
      o.rot.z = -0.12;
      o.rot.x = k < 0.15 ? sin((k / 0.15) * Math.PI) * 0.15 : 0;
      o.hands[1].set(1.05, -0.4 + sin(t * 3) * 0.04, 0.75);
    },
  },
  surprised: {
    ...EXPRESSION_META.surprised,
    motion: (t, o, r) => {
      const k = (t % 3) / 3;
      const jolt = k < 0.1 ? sin((k / 0.1) * Math.PI) : 0;
      o.pos.y = 0.12 + jolt * 0.3;
      o.squash = 1.04 - jolt * 0.08;
      o.mouth = 1 + jolt * 0.4;
      o.hands[0].set(-1.3, -0.05 + jolt * 0.2, 0.6);
      o.hands[1].set(1.3, -0.05 + jolt * 0.2, 0.6);
      r.props.exclaim.scale.setScalar(k < 0.1 ? k * 10 : 1);
      r.props.exclaim.rotation.z = sin(t * 10) * 0.08;
    },
  },
  thinking: {
    ...EXPRESSION_META.thinking,
    motion: (t, o, r) => {
      // eyes up and roaming, one squinted; the head drifts around as the idea forms
      o.look = new THREE.Vector2(0.55 + sin(t * 0.9) * 0.35, 0.7 + sin(t * 1.3) * 0.15);
      o.rot.z = 0.1 + sin(t * 0.6) * 0.06;
      o.rot.y = 0.15 + sin(t * 0.7) * 0.3;
      o.rot.x = -0.1 + sin(t * 1.1) * 0.08;
      o.squint = frac(t / 7) < 0.8 ? [0, 0.7] : [0.7, 0];
      o.hands[1].set(0.35, -1.0 + abs(sin(t * 5)) * 0.06, 1.05);
      r.props.dots.children.forEach((d, i) => {
        const k = ((t * 0.9) % 3) - i * 0.5;
        d.scale.setScalar(THREE.MathUtils.clamp(k * 3, 0, 1) * (1 + sin(t * 3 + i) * 0.06));
      });
    },
  },
  searching: {
    ...EXPRESSION_META.searching,
    motion: (t, o, r) => {
      const s = sin(t * 1.3);
      const step = Math.round(s * 2) / 2; // pupils snap between spots
      o.look = new THREE.Vector2(step, -0.15);
      o.rot.y = s * 0.45;
      o.pos.z = 0.1;
      o.pos.x = s * 0.15;
      o.hands[1].set(0.4 + s * 0.85, -0.35, 1.25);
      o.hands[0].set(-0.9, -1.15, 0.55);
      r.props.magnifier.rotation.z = -s * 0.25;
    },
  },
  confused: {
    ...EXPRESSION_META.confused,
    motion: (t, o, r) => {
      // scratch the head, then give up and look around for someone who knows
      const q = frac(t / 6);
      if (q < 0.4) {
        o.rot.z = 0.2 + sin(t * 1.2) * 0.05;
        o.look = new THREE.Vector2(sin(t * 0.7) * 0.4, 0.3);
        o.hands[1].set(1.1, 0.55 + abs(sin(t * 12)) * 0.08, 0.3);
      } else {
        const k = (q - 0.4) / 0.6, sweep = sin(k * Math.PI * 2.5);
        o.rot.y = sweep * 0.55;
        o.rot.z = 0.06;
        o.look = new THREE.Vector2(sweep, 0.05);
        o.pos.y = abs(sin(t * 3)) * 0.03;
        o.hands[0].set(-1.0, -0.9, 0.6);
        o.hands[1].set(1.0, -0.9, 0.6);
      }
      r.props.question.rotation.z = sin(t * 2) * 0.2;
      r.props.question.position.y = r.top + 0.15 + sin(t * 2.4) * 0.08;
    },
  },
  nervous: {
    ...EXPRESSION_META.nervous,
    motion: (t, o, r) => {
      o.pos.x = sin(t * 38) * 0.015;
      o.look = new THREE.Vector2(pulse(t, 1.4, 0.7) ? -0.8 : 0.8, -0.1);
      o.mouth = 1 + sin(t * 20) * 0.15;
      o.hands[0].set(-0.3, -1.15, 0.95);
      o.hands[1].set(0.3, -1.15, 0.95);
      const k = (t * 0.5) % 1;
      r.props.sweat.position.y = 0.45 - k * 0.5;
      r.props.sweat.scale.setScalar(Math.min(1, (1 - k) * 4));
    },
  },
  sad: {
    ...EXPRESSION_META.sad,
    motion: (t, o, r) => {
      o.look = new THREE.Vector2(0, -0.8);
      o.rot.x = 0.2;
      o.pos.y = -0.12 + sin(t * 0.9) * 0.03;
      o.squash = 0.97;
      o.hands.forEach((h) => { h.y = -1.45; h.x *= 0.85; });
      const k = (t * 0.4) % 1;
      r.props.tear.position.y = 0.14 - 0.22 - k * 0.7;
      r.props.tear.scale.setScalar(Math.min(1, k * 6, (1 - k) * 4));
    },
  },
  angry: {
    ...EXPRESSION_META.angry,
    motion: (t, o) => {
      const fit = pulse(t, 2, 0.6);
      o.pos.x = fit ? sin(t * 45) * 0.04 : 0;
      o.rot.x = 0.1;
      o.squash = fit ? 0.97 : 1;
      o.hands[0].set(-1.25, -0.6 + (fit ? sin(t * 30) * 0.08 : 0), 0.55);
      o.hands[1].set(1.25, -0.6 + (fit ? cos(t * 30) * 0.08 : 0), 0.55);
    },
  },
  talking: {
    ...EXPRESSION_META.talking,
    motion: (t, o) => {
      o.mouth = 0.25 + abs(sin(t * 9) * sin(t * 3.1)) * 1.1;
      o.rot.z = sin(t * 1.7) * 0.06;
      o.rot.y = sin(t * 0.9) * 0.15;
      o.pos.y = abs(sin(t * 4.5)) * 0.03;
      o.hands[0].set(-1.15, -0.85 + sin(t * 3) * 0.2, 0.75);
      o.hands[1].set(1.15, -0.95 + cos(t * 2.4) * 0.25, 0.75);
    },
  },
  sleeping: {
    ...EXPRESSION_META.sleeping,
    motion: (t, o, r) => {
      const breath = sin(t * 1.2);
      o.rot.x = 0.25;
      o.rot.z = 0.14;
      o.pos.y = -0.15 + breath * 0.05;
      o.squash = 1 + breath * 0.03;
      o.mouth = 0.6 + (breath + 1) * 0.35;
      o.hands.forEach((h) => (h.y = -1.5));
      r.props.zzz.children.forEach((z, i) => {
        const k = (t * 0.35 + i / 3) % 1;
        z.position.set(k * 0.9 + sin(k * 6) * 0.15, k * 1.6, 0);
        z.scale.setScalar((0.6 + k * 0.6) * Math.min(1, (1 - k) * 4, k * 8));
      });
    },
  },
  celebrate: {
    ...EXPRESSION_META.celebrate,
    motion: (t, o, r) => {
      const k = abs(sin(t * 4.5));
      o.pos.y = k * 0.55;
      o.squash = k < 0.15 ? 0.9 : 1.03;
      o.rot.y = sin(t * 2.25) * 0.3;
      o.hands[0].set(-1.15, 0.9 + k * 0.6, 0.3);
      o.hands[1].set(1.15, 0.9 + k * 0.6, 0.3);
      // confetti flutters down around the jumping goblin
      r.props.confetti.children.forEach((c) => {
        const [sx, sz, ph] = c.userData.seed as number[];
        const fall = frac(t * 0.32 + ph);
        c.position.set((sx - 0.5) * 4.4 + sin(t * 2 + ph * 9) * 0.25, 3.4 - fall * 5.6, (sz - 0.5) * 1.6 + 0.6);
        c.rotation.set(t * 3 + ph * 7, t * 2 + sx * 5, t * 4 + sz * 3);
      });
    },
  },
  serious: {
    ...EXPRESSION_META.serious,
    motion: (t, o) => {
      // almost still: a slow breath and the occasional slight nod
      o.pos.y = sin(t * 1.0) * 0.015;
      o.rot.x = 0.06 + (frac(t / 6) < 0.08 ? sin((frac(t / 6) / 0.08) * Math.PI) * 0.08 : 0);
    },
  },
  ...(Object.fromEntries(ACT_KINDS.map((k) => [k, { ...EXPRESSION_META[k], motion: ACT_MOTION[k] as unknown as Expression["motion"] }])) as Record<ActKind, Expression>),
};

const frac = (x: number) => x - Math.floor(x);

function orbit(g: THREE.Group, t: number, radius: number, y: number) {
  g.children.forEach((c, i) => {
    const a = t * 0.8 + (i / g.children.length) * Math.PI * 2;
    c.position.set(cos(a) * radius, y + sin(a * 2) * 0.35, sin(a) * radius * 0.5 + 0.3);
    c.rotation.z = t * 2 + i;
    c.scale.setScalar((0.8 + (i % 2) * 0.4) * (0.75 + abs(sin(t * 3 + i)) * 0.4));
  });
}

const out: Out = { pos: new THREE.Vector3(), rot: new THREE.Vector3(), look: null, hands: [new THREE.Vector3(), new THREE.Vector3()], mouth: 1, squash: 1, squint: [0, 0] };
const L = THREE.MathUtils.lerp;

/** Drive one goblin for a frame. `pointer` is the cursor direction relative to this goblin, roughly -1…1. */
export function animate(r: Rig, id: ExpressionId, t: number, pointer: THREE.Vector2, reduce: boolean) {
  const ex = EXPRESSIONS[id] ?? EXPRESSIONS.idle;
  const st = r.state;

  // discrete changes when the expression switches
  if (st.expr !== id) {
    st.expr = id;
    r.eyes.forEach((e, i) => {
      const m = ex.pose.eyes[i];
      const patched = !!e.open.userData.patched; // an eyepatch covers this eye whatever the mood
      e.open.visible = m === "open" && !patched;
      e.happy.visible = m === "happy" && !patched;
      e.closed.visible = m === "closed" && !patched;
    });
    (Object.keys(r.mouths) as MouthKind[]).forEach((k) => (r.mouths[k].visible = k === ex.pose.mouth));
    (Object.keys(r.props) as PropKind[]).forEach((k) => (r.props[k].visible = !!ex.props?.includes(k)));
    // groups that live outside their prop (floating digits, sound rings) follow their owner's visibility
    r.root.children.forEach((o) => { if (o.userData.owner) o.visible = (o.userData.owner as THREE.Object3D).visible; });
    // a carried tool keeps the mitts out; an expression that needs the hands puts it away
    r.hands.forEach((h, i) => (h.visible = !!ex.hands || !!r.tool || (i === 1 && r.hook)));
    if (r.tool) r.tool.visible = !ex.hands;
  }

  out.pos.set(0, 0, 0);
  out.rot.set(0, 0, 0);
  out.look = null;
  const rest = !ex.hands && r.toolHands ? r.toolHands : r.handHome;
  out.hands[0].copy(rest[0]);
  out.hands[1].copy(rest[1]);
  out.mouth = 1;
  out.squash = 1;
  out.squint = [0, 0];
  ex.motion(reduce ? 0 : t, out, r);

  // body
  const k = 0.14;
  const h = r.head;
  h.position.set(L(h.position.x, out.pos.x, k * 2), L(h.position.y, out.pos.y, k * 2), L(h.position.z, out.pos.z, k));
  // idle goblins turn toward the cursor; scripted ones keep their own heading
  const yaw = out.rot.y !== 0 ? out.rot.y : out.look ? 0 : pointer.x * 0.35;
  const pitch = out.look ? 0 : -pointer.y * 0.15;
  h.rotation.x = L(h.rotation.x, out.rot.x + pitch, k);
  h.rotation.y = L(h.rotation.y, yaw, k);
  h.rotation.z = L(h.rotation.z, out.rot.z, k);
  const sq = L(h.scale.y, out.squash, 0.3);
  h.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  r.hands.forEach((hand, i) => hand.position.lerp(out.hands[i], 0.18));

  // face
  st.lid = L(st.lid, ex.pose.lid, 0.2);
  st.tilt = L(st.tilt, ex.pose.tilt, 0.2);
  st.pupil = L(st.pupil, ex.pose.pupil, 0.2);
  st.squint = [L(st.squint?.[0] ?? 0, out.squint[0], 0.15), L(st.squint?.[1] ?? 0, out.squint[1], 0.15)];
  const bl = ex.pose.browL ?? ex.pose.brow;
  const target = [bl[0], bl[1], ex.pose.brow[0], ex.pose.brow[1]];
  st.brow = st.brow.map((v, i) => L(v, target[i], 0.2));

  const look = out.look ?? pointer;
  if (!reduce && t > st.nextBlink) { st.blinkUntil = t + 0.13; st.nextBlink = t + 2.5 + Math.random() * 3.5; }
  const blinking = t < st.blinkUntil;

  r.eyes.forEach((e, i) => {
    e.g.scale.y = L(e.g.scale.y, blinking && e.open.visible ? 0.1 : 1, 0.5);
    e.look.obj.position.set(e.look.base.x + look.x * e.look.range, e.look.base.y + look.y * e.look.range, e.look.base.z);
    if (e.pupil) e.pupil.scale.set(st.pupil, st.pupil, 0.5);
    if (e.lid) {
      const lid = Math.min(1, Math.max(0, st.lid + (st.squint?.[i] ?? 0)));
      e.lid.rotation.x = -1.45 * (1 - lid);
      e.lid.rotation.z = e.side * st.tilt;
      e.lid.visible = lid > 0.02;
      e.white.scale.setScalar(1);
    }
    if (!e.pupil && e.white instanceof THREE.Mesh && e.white.geometry.type === "BoxGeometry") {
      e.white.scale.y = 1 - Math.max(0, st.lid) * 0.6; // visor squint
      e.white.rotation.z = e.side * st.tilt * 0.6;
    }
    // wide eyes for surprise
    const wide = 1 + Math.max(0, -st.lid) * 1.2;
    e.open.scale.set(wide, wide, 1);
  });
  r.brows.forEach((b, i) => {
    const lift = st.brow[i * 2], slant = st.brow[i * 2 + 1];
    b.obj.position.y = b.base.y + lift;
    b.obj.rotation.z = b.side * slant;
  });
  r.mouth.scale.set(1 + (out.mouth - 1) * 0.3, L(r.mouth.scale.y, out.mouth, 0.35), 1);
}
