/* ── sim/workshop/diagnose.ts ───────────────────────────────────────────────
   Reading a failed run back to the player. A logic puzzle is only fair if the
   game can say which part of the circuit never did its job, so every finding
   names one signal and the tick to look at.
   --------------------------------------------------------------------------- */
import { partWorld, type World } from "./physics";
import { isWing, PARTS, type Design } from "./parts";
import { firstOn, rowStats, SNAP, type Trace } from "./trace";
import { NEST_R } from "./game";
import type { WLevel } from "./levels";

export interface Finding {
  /** why it matters: a dead signal, a stuck one, or a note on the run as a whole */
  tone: "dead" | "stuck" | "note" | "good";
  zh: string;
  en: string;
  /** the signal this is about, so the view can highlight its row */
  row?: number;
  /** the tick worth looking at */
  tick?: number;
  /** the part the player should inspect or change next */
  partId?: string;
}

const name = (d: Design, id: string, zh: boolean) => {
  const p = d.parts.find((q) => q.id === id);
  if (!p) return id;
  const same = d.parts.filter((q) => q.kind === p.kind);
  const n = same.length > 1 ? ` ${same.indexOf(p) + 1}` : "";
  return (zh ? PARTS[p.kind].name.zh : PARTS[p.kind].name.en) + n;
};

/** Distance from the core to the nearest thing the level wants, sampled at snapshots. */
function closest(l: WLevel, tr: Trace) {
  let best = Infinity, at = 0;
  const target = (w: World): [number, number] | null => {
    if (l.goal.kind === "home" && w.eaten.every(Boolean) && w.setup.nest) return [w.setup.nest.x, w.setup.nest.y];
    const i = w.setup.sugar.findIndex((_, j) => !w.eaten[j]);
    return i < 0 ? null : [w.setup.sugar[i].x, w.setup.sugar[i].y];
  };
  for (const w of tr.snaps) {
    const g = target(w);
    const core = w.parts.find((p) => p.kind === "core");
    if (!g || !core) continue;
    const [cx, cy] = partWorld(w, core);
    const dd = Math.hypot(cx - g[0], cy - g[1]);
    if (dd < best) { best = dd; at = w.t; }
  }
  return { dist: best, tick: at, home: l.goal.kind === "home" };
}

export function diagnose(l: WLevel, d: Design, tr: Trace): Finding[] {
  const out: Finding[] = [];
  const sec = (k: number) => (k / 60).toFixed(1);

  // ── dead and stuck signals ───────────────────────────────────────────────
  tr.rows.forEach((r, i) => {
    const s = rowStats(tr, i);
    const nz = name(d, r.id, true), ne = name(d, r.id, false);
    if (r.role === "wing") {
      if (s.on === 0) out.push({ tone: "dead", row: i, tick: 0, partId: r.id, zh: `${nz}一次都没扇过：接进它的神经从头到尾没通。`, en: `${ne} never beat once: no nerve into it ever carried a signal.` });
      else if (s.edges === 0 && s.off === 0 && tr.rows.filter((q) => q.role === "wing").length > 1)
        out.push({ tone: "stuck", row: i, tick: 0, partId: r.id, zh: `${nz}全程都开着：两边一样用力，它只能直飞。`, en: `${ne} was on the whole time: with both sides equal it can only fly straight.` });
    } else if (r.role === "sense") {
      if (s.on === 0 && r.kind !== "core")
        out.push({ tone: "dead", row: i, tick: 0, partId: r.id, zh: `${nz}什么都没感觉到：方向对吗？够得到吗？`, en: `${ne} never sensed anything: is it aimed right, and close enough?` });
    } else if (r.role === "brain") {
      const b = PARTS[r.kind].brain;
      if (s.on === 0 && b === "memory") out.push({ tone: "dead", row: i, tick: 0, partId: r.id, zh: `${nz}从头到尾是关的：「记住」那根线一次都没通过。`, en: `${ne} stayed off all run: its “set” nerve never fired.` });
      else if (s.edges === 0 && b === "toggle") out.push({ tone: "dead", row: i, zh: `${nz}一次都没翻过：它要的是从关变开的那一下。`, en: `${ne} never flipped: it needs an input that goes from off to on.` });
      else if (s.on === 0 && b === "gate") out.push({ tone: "dead", row: i, tick: 0, partId: r.id, zh: `${nz}一直没输出：是「全部」没同时满足吗？`, en: `${ne} never output anything: are its “all” inputs ever true together?` });
    }
  });

  // ── what the run itself says ─────────────────────────────────────────────
  if (tr.outcome === "caught") {
    const hair = tr.rows.findIndex((r) => r.kind === "hair");
    const k = hair >= 0 ? firstOn(tr, hair) : -1;
    out.unshift(k >= 0
      ? { tone: "note", row: hair, tick: k, partId: tr.rows[hair].id, zh: `蛛感毛发在 ${sec(k)} 秒就响了，但它没有躲开——那根神经接对翅膀了吗？`, en: `The spider hair fired at ${sec(k)}s but it did not turn away: is that nerve on the right wing?` }
      : { tone: "note", tick: tr.ticks - 1, zh: "它没有任何东西能感觉到蜘蛛。装一根蛛感毛发。", en: "Nothing on it can feel a spider. Fit a spider hair." });
  } else if (tr.outcome === "smashed") {
    out.unshift({ tone: "note", tick: tr.ticks - 1, zh: "撞上去太快了：让翅膀间歇地扇，而不是一直扇。", en: "It arrived too fast: beat the wings in pulses instead of holding them on." });
  } else if (tr.outcome === "timeout") {
    const c = closest(l, tr);
    if (Number.isFinite(c.dist)) {
      const near = c.dist < (c.home ? NEST_R : 1.2) * 1.8;
      out.unshift(near
        ? { tone: "note", tick: c.tick, zh: `最近的时候只差 ${c.dist.toFixed(1)} 格就够到了（${sec(c.tick)} 秒）。差一点点。`, en: `It came within ${c.dist.toFixed(1)} units at ${sec(c.tick)}s. So close.` }
        : { tone: "note", tick: c.tick, zh: `全程最近也差 ${c.dist.toFixed(1)} 格（${sec(c.tick)} 秒）：它根本没往那边去。`, en: `Its closest approach was ${c.dist.toFixed(1)} units at ${sec(c.tick)}s: it never really headed there.` });
    }
    // spinning on the spot
    let spin = 0;
    for (const w of tr.snaps) spin = Math.max(spin, Math.abs(w.w));
    if (spin > 4) out.push({ tone: "stuck", zh: "它在原地打转：翅膀左右不平衡，或者只有一边在扇。", en: "It spins on the spot: the wings are unbalanced, or only one side ever beats." });
  }

  // a broken part is worth saying out loud
  const broke = tr.events.find((e) => e.kind === "break");
  if (broke) out.push({ tone: "note", tick: broke.t, zh: `${broke.part ? PARTS[broke.part].name.zh : "一个零件"}在 ${sec(broke.t)} 秒被撞断了，之后它的信号就断了。`, en: `A ${broke.part ? PARTS[broke.part].name.en.toLowerCase() : "part"} snapped off at ${sec(broke.t)}s; its signal stopped there.` });

  if (!d.parts.some((p) => isWing(p.kind))) out.unshift({ tone: "dead", zh: "它没有翅膀。", en: "It has no wings." });

  return out.slice(0, 4);
}

/** For a run that cleared: what is still worth pushing. */
export function nextGoal(l: WLevel, gates: number, seconds: number): Finding[] {
  const out: Finding[] = [];
  const par = l.par;
  if (!par) return out;
  if (gates > par.gates)
    out.push({ tone: "note", zh: `你用了 ${gates} 个 NAND 门，标准是 ${par.gates} 个。有多余的神经吗？`, en: `You used ${gates} NAND gates; par is ${par.gates}. Any nerve you do not need?` });
  else out.push({ tone: "good", zh: `${gates} 个门，达到或好过标准（${par.gates}）。`, en: `${gates} gates: at or under par (${par.gates}).` });
  if (seconds > par.seconds)
    out.push({ tone: "note", zh: `用了 ${seconds.toFixed(1)} 秒，标准是 ${par.seconds} 秒。换大翅膀，或者少绕路。`, en: `It took ${seconds.toFixed(1)}s; par is ${par.seconds}s. Try bigger wings, or a straighter line.` });
  else out.push({ tone: "good", zh: `${seconds.toFixed(1)} 秒，达到或好过标准（${par.seconds} 秒）。`, en: `${seconds.toFixed(1)}s: at or under par (${par.seconds}s).` });
  return out;
}

export { SNAP };
