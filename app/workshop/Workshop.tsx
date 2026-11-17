"use client";

/* TapeFly Workshop: build a fly from parts, wire its senses to its wings, let
   it go. The wiring is a NAND circuit, the same kind TapeOut tapes out. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { WLEVELS, type WLevel } from "@/sim/workshop/levels";
import { coreOnly, isSink, isSource, isWing, looseParts, massProps, designCost, PARTS, type Design, type PartKind, type Wire } from "@/sim/workshop/parts";
import { gradeDesign, goalMet, type WOutcome } from "@/sim/workshop/game";
import { gateOrder } from "@/sim/workshop/brain";
import ChipView from "./ChipView";
import { compileWiring } from "@/sim/workshop/compile";
import { makeWorld, step, type World } from "@/sim/workshop/physics";
import { useLang } from "../i18n/client";
import { sfx, setSound } from "../evo/sound";
import { GifWriter, adaptivePalette } from "../evo/gif";
import type { T } from "../evo/text";
import BuildCanvas from "./BuildCanvas";
import FlyCanvas, { drawWorld, type FlyLog } from "./FlyCanvas";
import Timeline from "./Timeline";
import ReplayStage from "./ReplayStage";
import DuelView from "./DuelView";
import { runTrace, worldAt, type Trace } from "@/sim/workshop/trace";
import { diagnose, nextGoal, type Finding } from "@/sim/workshop/diagnose";
import { encodeDesign, decodeDesign } from "@/sim/workshop/codec";
import { C, drawArena, drawCube, drawGlassSugar, drawNest, drawPart, drawSpider, drawSugar, newFx } from "./wdraw";
import { mergeBest, useWSave, type WSave } from "./store";
import { track } from "../lib/telemetry";
import SaveTools from "./SaveTools";
import type { SealReport } from "@/sim/workshop/seal";

const CircuitClaimButton = dynamic(() => import("@/app/claims/CircuitClaimButton"), { ssr: false });

type SealResult = {
  level: string;
  engine: string;
  seal: SealReport;
  bytes: string;
  byteEncoding: "hex";
  error?: string;
};

/* ── small pieces ──────────────────────────────────────────────────────────── */

function PartIcon({ kind, size = 46 }: { kind: PartKind; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    const g = cv.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.translate(isWing(kind) ? size * 0.28 : size / 2, size / 2);
    drawPart(g, kind, kind === "antenna" || kind === "hair" || kind === "nose" ? 1 : 0, size * (isWing(kind) ? 0.42 : 0.62), { side: 1, time: 0, on: kind === "memory" || kind === "clock" });
  }, [kind, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />;
}

function Thumb({ level }: { level: WLevel }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const S = level.setups[0];
    const W = cv.clientWidth || 260, H = cv.clientHeight || 120;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = Math.min(W / S.w, H / S.h);
    g.fillStyle = C.bench; g.fillRect(0, 0, W, H);
    g.translate((W - S.w * c) / 2, (H - S.h * c) / 2);
    drawArena(g, S, c, S.w * c, S.h * c);
    if (S.nest) drawNest(g, S.nest.x * c, S.nest.y * c, c, 0);
    S.sugar.forEach((s) => (S.fragile !== undefined ? drawGlassSugar(g, s.x * c, s.y * c, c, 0) : drawSugar(g, s.x * c, s.y * c, c, 0, 0.9)));
    S.cubes.forEach(([x, y]) => drawCube(g, x * c, y * c, 0, c));
    S.spiders.forEach((s) => drawSpider(g, s.x * c, s.y * c, c, 0, 0));
    g.fillStyle = "#e23b45";
    g.beginPath(); g.arc(S.start.x * c, S.start.y * c, c * 0.6, 0, Math.PI * 2); g.fill();
  }, [level]);
  return <canvas ref={ref} className="ws-thumb" aria-hidden />;
}

const PROBLEM: Record<string, [string, string]> = {
  loose: ["有零件没连到核心上（红框）", "Some parts are not joined to the core (red outline)"],
  budget: ["超出零件预算", "Over the parts budget"],
  logic: ["这一关还没有“反过来”和“全部”", "Inverted wires and ‘all’ are not unlocked yet"],
  wiring: ["这一关还不能接线", "Wiring is not unlocked yet"],
  loop: ["逻辑块绕成了一个圈：圈里的块读作“关”。要用记忆格把圈隔开。", "Logic blocks form a loop; blocks in it read as off. Break the loop with a memory cell."]
};

/** The numbered levels (the sandbox is not one). */
const LEVELS = WLEVELS.filter((l) => l.chapter > 0);
const CHAPTERS: [number, string, string, string, string][] = [
  [1, "第一章 · 反射", "Chapter 1 · Reflexes", "感官直接连翅膀：看见、摸到、感觉到，马上反应。", "Senses wired straight to wings: see, touch, feel, react."],
  [2, "第二章 · 记忆", "Chapter 2 · Memory", "记忆格让果蝇记住发生过的事：吃过了没有、该不该回家。", "Memory cells let the fly remember: has it eaten, is it time to go home."],
  [3, "第三章 · 数数与节拍", "Chapter 3 · Counting and rhythm", "翻转格数数，节拍器打拍子：计数器和分频器，都是用 NAND 搭的。", "Toggles count and the metronome keeps time: counters and dividers, all built from NAND."]
];
const SANDBOX_ARENAS: [string, string][] = [["花园", "Garden"], ["糖塔", "Tower"], ["走廊", "Corridor"], ["迷宫", "Maze"]];

/** Two badges per level, each against the level's own par: a small brain, and a fast run. */
export function medalsFor(l: WLevel, gates: number, seconds: number) {
  if (!l.par) return { brain: false, speed: false, both: false };
  const brain = gates <= l.par.gates, speed = seconds <= l.par.seconds;
  return { brain, speed, both: brain && speed };
}

function goalText(l: WLevel, t: T) {
  const n = l.setups.length > 1 ? t(`（${l.setups.length} 个场景都要过）`, ` (all ${l.setups.length} setups)`) : "";
  const g = l.goal;
  if (g.kind === "free") return t("沙盒：没有目标，随便飞", "Sandbox: no goal, just fly");
  if (g.kind === "knock") return t(`目标：${l.seconds} 秒内撞倒 ${g.n} 块方糖`, `Goal: knock over ${g.n} cubes in ${l.seconds} s`);
  if (g.kind === "home") return t(`目标：${l.seconds} 秒内吃到糖，再回到窝里${n}`, `Goal: eat the sugar and get back to the nest within ${l.seconds} s${n}`);
  if (g.stay) return t(`目标：吃到糖，然后安全待满 ${g.stay} 秒${n}`, `Goal: eat the sugar, then stay safe for ${g.stay} s${n}`);
  return t(`目标：${l.seconds} 秒内吃到${g.any ? "一块" : ""}糖${n}`, `Goal: reach the sugar within ${l.seconds} s${n}`);
}

/** A design in a link: JSON, base64url (shared with the server, see sim/workshop/codec). */
export { encodeDesign, decodeDesign };

/* ── the level screen ──────────────────────────────────────────────────────── */

function LevelView({ level, save, update, t, onExit, onNext, shared, rival, parentId, portalMode }: { level: WLevel; save: WSave; update: (f: (s: WSave) => WSave) => void; t: T; onExit: () => void; onNext: (() => void) | null; shared: Design | null; rival: Design | null; parentId: string | null; portalMode: boolean }) {
  const index = LEVELS.indexOf(level);
  const sandbox = level.goal.kind === "free";
  const [design, setDesign] = useState<Design>(() => shared ?? save.designs[level.id] ?? level.start ?? coreOnly());
  const [history, setHistory] = useState<Design[]>([]);
  const [tool, setTool] = useState<PartKind | null>(level.parts.includes("wingS") ? "wingS" : level.parts[0]);
  const [mode, setMode] = useState<"place" | "wire" | "erase">("place");
  const [selected, setSelected] = useState<string | null>(null);
  const [wireFrom, setWireFrom] = useState<string | null>(null);
  const [view, setView] = useState<"build" | "fly" | "duel">("build");
  const [setup, setSetup] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [log, setLog] = useState<FlyLog[]>([]);
  const [hud, setHud] = useState<{ t: number; eaten: number; knocked: number }>({ t: 0, eaten: 0, knocked: 0 });
  const [ended, setEnded] = useState<WOutcome | null>(null);
  const [hints, setHints] = useState(0);
  const [results, setResults] = useState(false);
  const [gifBusy, setGifBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(shared ? t("已载入分享的设计", "Loaded a shared design") : null);
  const [chipOpen, setChipOpen] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [scrub, setScrub] = useState(0);
  const [hiRow, setHiRow] = useState<number | undefined>(undefined);
  const [hideVerdict, setHideVerdict] = useState(false);
  const [sealResult, setSealResult] = useState<SealResult | null>(null);
  const [sealBusy, setSealBusy] = useState(false);
  const [sealErr, setSealErr] = useState<string | null>(null);
  const live = useRef<World | null>(null);

  const trackEvent = portalMode ? () => {} : track;
  useEffect(() => { trackEvent("level_open", { level: level.id }); }, [level.id]);
  useEffect(() => { update((s) => ({ ...s, designs: { ...s.designs, [level.id]: design } })); }, [design, level.id, update]);
  useEffect(() => { if (!toast) return; const h = setTimeout(() => setToast(null), 1800); return () => clearTimeout(h); }, [toast]);
  useEffect(() => {
    if (!results || portalMode) return;
    let cancelled = false;
    setSealResult(null);
    setSealErr(null);
    setSealBusy(true);
    fetch("/api/v1/workshop/seal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: level.id, code: encodeDesign(design) })
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as SealResult | null;
        if (!payload?.seal) throw new Error("seal response missing");
        if (!cancelled) setSealResult(payload);
      })
      .catch(() => { if (!cancelled) setSealErr(t("无法完成全量核对，请稍后再试。", "The full seal check could not be completed. Please try again.")); })
      .finally(() => { if (!cancelled) setSealBusy(false); });
    return () => { cancelled = true; };
  }, [results, level.id, design, t]);

  const edit = useCallback((d: Design) => { setHistory((h) => [...h.slice(-40), design]); setDesign(d); }, [design]);
  const toggleChip = () => setChipOpen((open) => { trackEvent("chip_viewed", { level: level.id, opened: !open }); return !open; });
  const undo = () => { const p = history[history.length - 1]; if (!p) return; setHistory((h) => h.slice(0, -1)); setDesign(p); };

  const mp = useMemo(() => massProps(design.parts), [design]);
  const cost = designCost(design);
  const chipInfo = useMemo(() => compileWiring(design), [design]);
  const gates = chipInfo.gates.length;
  const bits = chipInfo.state.length;
  const loose = useMemo(() => looseParts(design), [design]);
  const grade = useMemo(() => (view === "fly" ? gradeDesign(level, design) : null), [view, level, design]);
  const workshopClaimLevels = useMemo(() => {
    const ids = LEVELS.filter((candidate) =>
      !!save.best[candidate.id] ||
      (candidate.id === level.id && !!grade?.cleared && grade.problems.length === 0)
    ).slice(0, 3);
    return ids.flatMap((candidate) => {
      const candidateDesign = candidate.id === level.id ? design : save.designs[candidate.id];
      return candidateDesign ? [{ level: candidate.id, code: encodeDesign(candidateDesign) }] : [];
    });
  }, [save.best, save.designs, level.id, design, grade]);
  const sel = design.parts.find((p) => p.id === selected);

  const nextId = (k: PartKind) => { let i = 1; while (design.parts.some((p) => p.id === `${k}${i}`)) i++; return `${k}${i}`; };

  const onCell = (x: number, y: number) => {
    const at = design.parts.find((p) => p.x === x && p.y === y);
    if (mode === "erase") {
      if (at && at.kind !== "core") {
        sfx.click();
        edit({ parts: design.parts.filter((p) => p !== at), wires: design.wires.filter((w) => w.from !== at.id && w.to !== at.id), modes: Object.fromEntries(Object.entries(design.modes).filter(([k]) => k !== at.id)) });
      }
      return;
    }
    if (mode === "wire") {
      if (!at) { setWireFrom(null); return; }
      if (wireFrom && wireFrom !== at.id && isSink(at.kind)) {
        setSelected(at.id);
        const i = design.wires.findIndex((w) => w.from === wireFrom && w.to === at.id);
        sfx.click();
        if (i >= 0) { edit({ ...design, wires: design.wires.filter((_, j) => j !== i) }); return; }
        const wire: Wire = { from: wireFrom, to: at.id, inv: false };
        const trial = { ...design, wires: [...design.wires, wire] };
        if (gateOrder(trial).loop.size) { setToast(t(PROBLEM.loop[0], PROBLEM.loop[1])); return; }
        // The heartbeat is always on: in "any" mode it would drown out the new signal,
        // so the first real nerve into a wing replaces it.
        const beat = isWing(at.kind) && wireFrom !== "core" && (design.modes[at.id] ?? "any") === "any" && design.wires.some((w) => w.from === "core" && w.to === at.id && !w.inv);
        const kept = beat ? design.wires.filter((w) => !(w.from === "core" && w.to === at.id)) : design.wires;
        edit({ ...design, wires: [...kept, wire] });
        if (beat) setToast(t("心跳线拆掉了：心跳一直开着，会盖过新接的信号", "Heartbeat wire removed: it is always on and would drown out the new signal"));
        return;
      }
      if (isSource(at.kind)) { sfx.click(); setWireFrom(at.id === wireFrom ? null : at.id); setSelected(at.id); return; }
      setSelected(at.id);
      return;
    }
    if (at) { setSelected(at.id); return; }
    if (!tool) return;
    if (cost + PARTS[tool].cost > level.budget) { setToast(t("零件预算不够了", "Not enough budget for that part")); return; }
    const id = nextId(tool);
    const dir = PARTS[tool].aims ? (x < 0 ? 7 : x > 0 ? 1 : 0) : 0;
    sfx.click();
    edit({
      parts: [...design.parts, { id, kind: tool, x, y, dir }],
      wires: isWing(tool) ? [...design.wires, { from: "core", to: id, inv: false }] : design.wires,
      modes: design.modes
    });
    trackEvent("part_placed", { level: level.id, kind: tool });
    setSelected(id);
  };

  const toMemory = (w: Wire) => PARTS[design.parts.find((p) => p.id === w.to)?.kind ?? "body"].brain === "memory";
  /** clicking a nerve's badge: plain ↔ NOT; into a memory cell, set → NOT set → reset → NOT reset */
  const onWire = (i: number) => {
    if (!level.logic) { setToast(t("这一关还不能把导线变成“反过来”", "Inverted wires are not unlocked here")); return; }
    sfx.click();
    trackEvent("wire_changed", { level: level.id });
    edit({ ...design, wires: design.wires.map((w, j) => {
      if (j !== i) return w;
      if (!toMemory(w)) return { ...w, inv: !w.inv };
      const reset = w.port === "reset";
      if (!w.inv) return { ...w, inv: true };
      return reset ? { from: w.from, to: w.to, inv: false } : { from: w.from, to: w.to, inv: false, port: "reset" as const };
    }) });
  };

  const rotate = useCallback(() => {
    if (!sel || !PARTS[sel.kind].aims) return;
    sfx.click();
    edit({ ...design, parts: design.parts.map((p) => (p === sel ? { ...p, dir: (p.dir + 1) % 8 } : p)) });
  }, [sel, design, edit]);

  const mirror = () => {
    const taken = new Set(design.parts.map((p) => `${p.x},${p.y}`));
    const add = design.parts.filter((p) => p.x !== 0 && !taken.has(`${-p.x},${p.y}`)).map((p) => ({ ...p, id: p.id + "m", x: -p.x, dir: (8 - p.dir) % 8 }));
    if (!add.length) return;
    const extra = add.reduce((s, p) => s + PARTS[p.kind].cost, 0);
    if (cost + extra > level.budget) { setToast(t("镜像后会超出预算", "Mirroring would go over budget")); return; }
    const wires = [...design.wires];
    for (const w of design.wires) {
      const f = add.find((p) => p.id === w.from + "m"), to = add.find((p) => p.id === w.to + "m");
      if (f || to) wires.push({ ...w, from: f ? f.id : w.from, to: to ? to.id : w.to });
    }
    sfx.click();
    edit({ parts: [...design.parts, ...add], wires, modes: { ...design.modes, ...Object.fromEntries(add.filter((p) => design.modes[p.id.slice(0, -1)]).map((p) => [p.id, design.modes[p.id.slice(0, -1)]])) } });
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (view === "build") {
        if (e.key === "r" || e.key === "R") rotate();
        else if ((e.key === "Delete" || e.key === "Backspace") && sel && sel.kind !== "core") { onCellErase(sel.id); }
        else if ((e.ctrlKey || e.metaKey) && e.key === "z") undo();
        else if (e.key === " ") { e.preventDefault(); fly(); }
        else if (e.key === "Escape") { setWireFrom(null); setChipOpen(false); }
      } else if (e.key === " ") { e.preventDefault(); restart(); }
      else if (e.key === "Escape") back();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const onCellErase = (id: string) => edit({ parts: design.parts.filter((p) => p.id !== id), wires: design.wires.filter((w) => w.from !== id && w.to !== id), modes: design.modes });

  const clearReplay = () => { setTrace(null); setHiRow(undefined); setScrub(0); setHideVerdict(false); };
  const fly = () => { sfx.click(); trackEvent("flight_started", { level: level.id }); setView("fly"); setSetup(0); setLog([]); setEnded(null); clearReplay(); setRunKey((k) => k + 1); };
  const restart = () => { setLog([]); setEnded(null); clearReplay(); setRunKey((k) => k + 1); };
  const back = () => { setView("build"); setEnded(null); setResults(false); clearReplay(); };
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?l=${level.id}&d=${encodeDesign(design)}`;
    try { await navigator.clipboard.writeText(url); trackEvent("share_created", { level: level.id }); setToast(t("链接已复制：发给朋友，打开就是你的果蝇", "Link copied: whoever opens it gets your fly")); }
    catch { window.history.replaceState(null, "", url); setToast(t("没能自动复制：链接已放进地址栏，手动复制即可", "Could not copy: the link is now in the address bar")); }
  };

  const challenge = async () => {
    const url = `${window.location.origin}${window.location.pathname}?l=${level.id}&vs=${encodeDesign(design)}`;
    try { await navigator.clipboard.writeText(url); setToast(t("挑战链接已复制：谁打开，谁就要用自己的果蝇来打你这只", "Challenge link copied: whoever opens it has to beat this fly with their own")); }
    catch { window.history.replaceState(null, "", url); setToast(t("没能自动复制：链接已放进地址栏", "Could not copy: the link is now in the address bar")); }
  };

  // publish to the workshop gallery: the server re-runs the design and keeps only what it measured
  const [pubOpen, setPubOpen] = useState(false);
  const [pubName, setPubName] = useState("");
  const [pubBusy, setPubBusy] = useState(false);
  const [pubDone, setPubDone] = useState<{ id: string; existed: boolean } | null>(null);
  const [pubErr, setPubErr] = useState<string | null>(null);
  const publish = async () => {
    setPubBusy(true); setPubErr(null);
    try {
      const r = await fetch("/api/v1/workshop/designs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level: level.id, code: encodeDesign(design), name: pubName, parent: parentId }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.design) { setPubDone({ id: j.design.id, existed: !!j.existed }); trackEvent("publish_succeeded", { level: level.id, existed: !!j.existed }); sfx.click(); }
      else if (r.status === 422 && /clear/.test(j.error ?? "")) setPubErr(t("这个设计还没过关：先放飞，过关后才能发布。", "This design does not clear the level yet: fly it and clear it first."));
      else if (r.status === 422) setPubErr(t("这个设计不符合这一关的规则（零件、预算或接线）。", "This design breaks the level's rules (parts, budget or wiring)."));
      else if (r.status === 429) setPubErr(t("发布得太频繁了，过几分钟再试。", "Too many publishes. Try again in a few minutes."));
      else setPubErr(t("发布失败，请稍后再试。", "Publishing failed. Please try again later."));
    } catch { setPubErr(t("连不上服务器，请稍后再试。", "Could not reach the server. Please try again later.")); }
    setPubBusy(false);
  };
  const pubUrl = pubDone ? `${typeof window === "undefined" ? "" : window.location.origin}/workshop/d/${pubDone.id}` : "";
  const copyPub = async () => {
    try { await navigator.clipboard.writeText(pubUrl); setToast(t("链接已复制", "Link copied")); }
    catch { setToast(t("没能自动复制，请手动选中链接", "Could not copy: select the link by hand")); }
  };

  // record a clear
  useEffect(() => {
    if (sandbox || !grade?.cleared || grade.problems.length) return;
    update((s) => ({ ...s, best: { ...s.best, [level.id]: mergeBest(s.best[level.id], { cost: grade.cost, gates: grade.gates, seconds: Math.round(grade.seconds * 10) / 10 }) } }));
  }, [grade, level.id, update]);

  const exportGif = async () => {
    setGifBusy(true);
    await new Promise((r) => setTimeout(r, 30));
    try {
      const S = level.setups[setup];
      const c = Math.max(14, Math.floor(560 / S.w));
      const W = S.w * c, H = S.h * c + 30;
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const g = cv.getContext("2d", { willReadFrequently: true })!;
      const finished = (w: World) => goalMet(level, w) || w.caught >= 0 || w.smashed;
      const paint = (w: World, fx: ReturnType<typeof newFx>, k: number) => {
        drawWorld(g, w, fx, c, k * 16, W, S.h * c);
        g.fillStyle = "#06191e"; g.fillRect(0, S.h * c, W, 30);
        g.font = "600 13px sans-serif"; g.textBaseline = "middle";
        g.fillStyle = "#f2b64b"; g.textAlign = "left"; g.fillText(`TapeFly Workshop · ${t(level.title.zh, level.title.en)}`, 8, S.h * c + 15);
        g.fillStyle = "#e8f0eb"; g.textAlign = "right"; g.fillText(t(`${cost} 零件 · ${gates} 门${bits ? ` · ${bits} 位` : ""} · ${(k / 60).toFixed(1)} 秒`, `${cost} parts · ${gates} gates${bits ? ` · ${bits} bits` : ""} · ${(k / 60).toFixed(1)} s`), W - 8, S.h * c + 15);
        return g.getImageData(0, 0, W, H).data;
      };
      // how long the run actually is decides the frame rate, so a long clip
      // stays small enough to post: 20 fps for short runs, down to 10 for long ones
      const lengthOf = () => {
        const w = makeWorld(S, design);
        let k = 0;
        while (!finished(w) && k < level.seconds * 60) { step(w); k++; }
        return k;
      };
      const total = lengthOf();
      const every = total > 1500 ? 6 : total > 900 ? 5 : total > 600 ? 4 : 3;
      const run = (each: (w: World, fx: ReturnType<typeof newFx>, k: number, done: boolean) => void) => {
        const w = makeWorld(S, design);
        const fx = newFx();
        let done = false, k = 0;
        while (!done && k < level.seconds * 60) {
          step(w); k++;
          if (k % every === 0) fx.trail.push([w.x, w.y]);
          done = finished(w);
          if (k % every === 0 || done) each(w, fx, k, done);
        }
      };
      const samples: Uint8ClampedArray[] = [];
      const at = new Set([every, Math.floor(total / 6 / every) * every, Math.floor(total / 2 / every) * every, Math.floor((total * 5) / 6 / every) * every]);
      run((w, fx, k, done) => { if (at.has(k) || done) samples.push(paint(w, fx, k)); });
      const gw = new GifWriter(W, H, adaptivePalette(samples, ["#06191e", "#e23b45", "#b99cff", "#73f5c1", "#ffffff", "#f2b64b", "#2a1f1a"]));
      // pass 2: the real frames
      run((w, fx, k, done) => gw.frame(paint(w, fx, k), done ? 160 : Math.round((every / 60) * 100)));
      const blob = new Blob([gw.finish()], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `tapefly-workshop-${level.id}.gif`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setToast(t("GIF 已导出", "GIF saved"));
    } catch { setToast(t("导出失败", "Export failed")); }
    setGifBusy(false);
  };

  const sealJson = () => sealResult ? JSON.stringify(sealResult, null, 2) : "";
  const copySeal = async () => {
    try { await navigator.clipboard.writeText(sealJson()); setToast(t("流片报告已复制", "Seal report copied")); }
    catch { setToast(t("没能自动复制", "Could not copy automatically")); }
  };
  const downloadSeal = () => {
    if (!sealResult) return;
    const url = URL.createObjectURL(new Blob([sealJson()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tapefly-${level.id}-seal.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const sealProblem = (problem: string) => {
    if (problem === "not-cleared") return t("设计还没有通过这一关", "The design does not clear this level");
    if (problem === "verification-incomplete") return t("全量核对没有完成", "The exhaustive check did not complete");
    if (problem.startsWith("too-many-inputs:")) return t(`输入位太多（${problem.slice(16)}）`, `Too many inputs (${problem.slice(16)})`);
    if (problem.startsWith("mismatch:")) return t(`第 ${problem.slice(9)} 个输入字与游戏大脑不一致`, `Input word ${problem.slice(9)} does not match the game brain`);
    if (problem === "loose") return t("有零件没有接到核心", "A part is not joined to the core");
    if (problem === "budget") return t("超出零件预算", "Over the parts budget");
    if (problem === "logic") return t("使用了这一关尚未解锁的逻辑", "The design uses logic that is not unlocked");
    if (problem === "wiring") return t("使用了这一关尚未解锁的接线", "The design uses wiring that is not unlocked");
    if (problem === "loop") return t("逻辑块形成了回路", "The logic blocks form a loop");
    if (problem.startsWith("part:")) return t(`这一关不能使用 ${problem.slice(5)}`, `This level does not allow ${problem.slice(5)}`);
    return problem;
  };

  const balance = Math.abs(mp.cx) < 0.05 ? t("居中", "centred") : mp.cx < 0 ? t(`偏左 ${Math.round(Math.abs(mp.cx) * 100)}%`, `left ${Math.round(Math.abs(mp.cx) * 100)}%`) : t(`偏右 ${Math.round(mp.cx * 100)}%`, `right ${Math.round(mp.cx * 100)}%`);
  const turn = Math.abs(mp.torque) < 0.5 ? t("全开时：直飞", "All wings on: straight") : mp.torque > 0 ? t("全开时：往右拐", "All wings on: turns right") : t("全开时：往左拐", "All wings on: turns left");
  const thrustPct = Math.min(100, (mp.thrust / Math.max(1, mp.mass * 6)) * 100);
  const wingInputs = sel && isSink(sel.kind) ? design.wires.filter((w) => w.to === sel.id) : [];
  const namerFor = useCallback((d: Design) => (id: string) => {
    const p = d.parts.find((q) => q.id === id);
    if (!p) return id;
    const same = d.parts.filter((q) => q.kind === p.kind);
    const n = same.length > 1 ? ` ${same.indexOf(p) + 1}` : "";
    return t(PARTS[p.kind].name.zh, PARTS[p.kind].name.en) + n + (p.kind === "core" ? t("·心跳", " · heartbeat") : "");
  }, [t]);
  const nameOf = useCallback((id: string) => namerFor(design)(id), [namerFor, design]);

  /* ── replay: once a run has ended, the arena, the HUD and the chip all read
        from the recorded trace at whatever tick the timeline is scrubbed to ── */
  const replaying = !!(ended && trace);
  const scrubWorld = useMemo(() => (replaying && trace ? worldAt(trace, scrub) : null), [replaying, trace, scrub]);
  const shown = replaying && trace
    ? { t: scrub / 60, eaten: trace.events.filter((e) => e.kind === "eat" && e.t <= scrub).length, knocked: trace.events.filter((e) => e.kind === "knock" && e.t <= scrub).length }
    : hud;
  const findings: Finding[] = useMemo(() => {
    if (!trace || !ended) return [];
    return ended === "cleared" && grade?.cleared && !grade.problems.length
      ? nextGoal(level, grade.gates, grade.seconds)
      : diagnose(level, design, trace);
  }, [trace, ended, level, design, grade]);
  const jump = (f: Finding, i: number) => { setHiRow(hiRow === (f.row ?? -1 - i) ? undefined : f.row); if (f.tick !== undefined) setScrub(f.tick); };
  const primaryFinding = findings.find((f) => f.partId) ?? findings.find((f) => f.tone !== "good") ?? findings[0];
  const inspectFinding = (f: Finding) => {
    trackEvent("diagnosis_opened", { level: level.id, has_tick: f.tick !== undefined, has_part: !!f.partId });
    if (f.tick !== undefined) setScrub(f.tick);
    if (f.row !== undefined) setHiRow(f.row);
    setHideVerdict(true);
  };
  const reviseFinding = (f: Finding) => {
    trackEvent("diagnosis_to_edit", { level: level.id, has_part: !!f.partId });
    if (f.partId) setSelected(f.partId);
    back();
  };

  if (view === "duel" && rival) {
    return (
      <div className="ws-level">
        <DuelView
          level={level}
          mine={design}
          theirs={rival}
          myName={t("你的果蝇", "Your fly")}
          theirName={t("挑战者", "The challenger")}
          t={t}
          nameOf={namerFor}
          onBack={() => setView("build")}
        />
      </div>
    );
  }

  return (
    <div className="ws-level">
      <header className="ws-bar">
        <button type="button" className="ws-ghost" onClick={view === "fly" ? back : onExit}>← {view === "fly" ? t("回去改", "Back to build") : t("关卡", "Levels")}</button>
        <div className="ws-title">
          <span className="ch">{sandbox ? t("工坊 · 沙盒", "Workshop · sandbox") : t(`工坊 · 第 ${level.chapter} 章 · 第 ${index + 1} 关`, `Workshop · chapter ${level.chapter} · level ${index + 1}`)}</span>
          <h1>{t(level.title.zh, level.title.en)}</h1>
        </div>
        <span className="ws-goal">{goalText(level, t)}</span>
        <span className={`ws-budget ${cost > level.budget ? "over" : ""}`}>{t("零件", "Parts")} <b>{cost}</b> / {level.budget}</span>
      </header>

      {rival && view === "build" && (
        <div className="ws-rival">
          <b>{t("有人向你挑战", "Someone has challenged you")}</b>
          <span>{t("同一关、同一个场地，看谁的果蝇做得更好。", "Same level, same arena: whose fly does better?")}</span>
          <button type="button" className="ws-go small" onClick={() => setView("duel")}>{t("开始对决", "Start the duel")}</button>
        </div>
      )}

      {view === "build" ? (
        <div className="ws-main">
          <aside className="ws-tray">
            <div className="ws-modes" role="radiogroup" aria-label={t("工具", "Tool")}>
              <button type="button" role="radio" aria-checked={mode === "place"} className={mode === "place" ? "on" : ""} onClick={() => { setMode("place"); setWireFrom(null); }}>{t("放零件", "Place")}</button>
              {level.wiring && <button type="button" role="radio" aria-checked={mode === "wire"} className={mode === "wire" ? "on wire" : "wire"} onClick={() => setMode("wire")}>{t("接神经", "Wire")}</button>}
              <button type="button" role="radio" aria-checked={mode === "erase"} className={mode === "erase" ? "on erase" : "erase"} onClick={() => { setMode("erase"); setWireFrom(null); }}>{t("拆", "Remove")}</button>
            </div>
            <div className="ws-parts">
              {level.parts.map((k) => (
                <button key={k} type="button" className={`ws-part ${tool === k && mode === "place" ? "on" : ""}`} onClick={() => { setTool(k); setMode("place"); sfx.click(); }} title={t(PARTS[k].info.zh, PARTS[k].info.en)}>
                  <PartIcon kind={k} />
                  <span className="nm">{t(PARTS[k].name.zh, PARTS[k].name.en)}</span>
                  <span className="cost">{PARTS[k].cost}</span>
                </button>
              ))}
            </div>
            <p className="ws-tip">
              {mode === "wire"
                ? t("先点一个感官（绿点），再点一个翅膀（紫点）：连上或断开。点导线中间的圆点，可以把它变成“反过来”。", "Click a sensor (green dot), then a wing (purple dot) to connect or disconnect. Click a nerve's middle badge to invert it.")
                : mode === "erase"
                  ? t("点一个零件把它拆掉。核心拆不掉。", "Click a part to remove it. The core stays.")
                  : t("点空格子放零件，点零件选中它。R 转方向，空格放飞，Ctrl+Z 撤销。", "Click an empty cell to place, a part to select it. R turns it, Space flies, Ctrl+Z undoes.")}
            </p>
          </aside>

          <section className="ws-center">
            <BuildCanvas design={design} ghostKind={tool} mode={mode} selected={selected} wireFrom={wireFrom} onCell={onCell} onWire={onWire} />
          </section>

          <aside className="ws-side">
            {level.id === "liftoff" && (() => {
              // First-run coach for the first level: one step at a time, with the classic mistake named.
              const wings = design.parts.filter((p) => isWing(p.kind)).length;
              const steps = wings === 0
                ? t("① 左边工具栏点「小翅膀」，再点核心左边的空格。", "1. Pick “Small wing” in the tray, then click a free cell left of the core.")
                : wings === 1
                  ? t("② 只装了一边：它会原地打转。再在核心右边放一个一样的小翅膀。", "2. One wing only: it will spin in place. Put the same wing on the right of the core.")
                  : t("③ 左右各一个。点「放飞 ▶」（或按空格）看它飞向糖。", "3. One on each side. Press “Fly ▶” (or Space) and watch it head for the sugar.");
              return <div className="ws-coach" role="note"><b>{t("新手引导", "First steps")}</b><p>{steps}</p></div>;
            })()}
            <div className="ws-brief">
              <p>{t(level.brief.zh, level.brief.en)}</p>
              {level.hints.slice(0, hints).map((h, i) => <p key={i} className="hint"><i>{t(`提示 ${i + 1}`, `Hint ${i + 1}`)}</i>{t(h.zh, h.en)}</p>)}
              {hints < level.hints.length && <button type="button" className="ws-link" onClick={() => setHints((h) => h + 1)}>{t(`给个提示（${hints + 1}/${level.hints.length}）`, `Show a hint (${hints + 1}/${level.hints.length})`)}</button>}
            </div>
            <div className="ws-stats">
              <div className="row"><span>{t("推力 / 重量", "Thrust / weight")}</span><b>{mp.thrust} / {mp.mass.toFixed(1)}</b></div>
              <div className="bar"><span style={{ width: `${thrustPct}%` }} /></div>
              <div className="row"><span>{t("左右平衡", "Balance")}</span><b className={Math.abs(mp.cx) > 0.25 ? "warn" : ""}>{balance}</b></div>
              <div className="row"><span>{t("飞行倾向", "Tendency")}</span><b>{turn}</b></div>
              <div className="row"><span>{t("大脑", "Brain")}</span><b>{t(`${gates} 个 NAND 门${bits ? ` · ${bits} 位记忆` : ""}`, `${gates} NAND gates${bits ? ` · ${bits} bits` : ""}`)}</b></div>
            </div>
            {sel && (
              <div className="ws-inspect">
                <div className="hd"><b>{t(PARTS[sel.kind].name.zh, PARTS[sel.kind].name.en)}</b>{PARTS[sel.kind].aims && <button type="button" className="ws-mini" onClick={rotate}>{t("转方向 R", "Turn R")}</button>}</div>
                <p>{t(PARTS[sel.kind].info.zh, PARTS[sel.kind].info.en)}</p>
                {isSink(sel.kind) && (
                  <>
                    <div className="ins">
                      {wingInputs.length === 0 && <span className="none">{isWing(sel.kind) ? t("没有神经接进来：不会扇。", "No nerves in: it will not beat.") : t("还没有神经接进来。", "No nerves in yet.")}</span>}
                      {wingInputs.map((w) => (
                        <span key={w.from + (w.port ?? "")} className={`in ${w.inv ? "inv" : ""} ${w.port === "reset" ? "reset" : ""}`}>
                          {sel.kind === "memory" && (
                            <button type="button" className="port" title={t("切换：记住 / 忘掉", "Switch: set / reset")} onClick={() => edit({ ...design, wires: design.wires.map((x) => (x === w ? (w.port === "reset" ? { from: w.from, to: w.to, inv: w.inv } : { ...w, port: "reset" as const }) : x)) })}>
                              {w.port === "reset" ? t("忘掉", "reset") : t("记住", "set")}
                            </button>
                          )}
                          {w.inv ? t("反过来 · ", "NOT · ") : ""}{nameOf(w.from)}
                          <button type="button" aria-label={t("断开", "Disconnect")} onClick={() => edit({ ...design, wires: design.wires.filter((x) => x !== w) })}>×</button>
                        </span>
                      ))}
                    </div>
                    {level.logic && wingInputs.length > 1 && sel.kind !== "memory" && (
                      <div className="ws-anyall" role="radiogroup">
                        <button type="button" className={(design.modes[sel.id] ?? "any") === "any" ? "on" : ""} onClick={() => edit({ ...design, modes: { ...design.modes, [sel.id]: "any" } })}>{t("任意一个 = 或", "Any = OR")}</button>
                        <button type="button" className={design.modes[sel.id] === "all" ? "on" : ""} onClick={() => edit({ ...design, modes: { ...design.modes, [sel.id]: "all" } })}>{t("全部 = 而且", "All = AND")}</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="ws-actions">
              <button type="button" className="ws-ghost" onClick={undo} disabled={!history.length}>{t("撤销", "Undo")}</button>
              <button type="button" className="ws-ghost" onClick={mirror}>{t("左右镜像", "Mirror")}</button>
              <button type="button" className="ws-ghost" onClick={() => edit(level.start ?? coreOnly())}>{t("清空", "Clear")}</button>
              <button type="button" className="ws-ghost" onClick={toggleChip}>{t("芯片视图", "Chip view")}</button>
              <button type="button" className="ws-ghost" onClick={challenge}>{t("挑战朋友", "Challenge a friend")}</button>
            <button type="button" className="ws-ghost" onClick={share}>{t("分享链接", "Share link")}</button>
              {!portalMode && <button type="button" className="ws-ghost" onClick={() => { setPubOpen(true); setPubDone(null); setPubErr(null); }}>{t("发布到工坊", "Publish")}</button>}
            </div>
            {gateOrder(design).loop.size > 0 && <p className="ws-warn">{t(PROBLEM.loop[0], PROBLEM.loop[1])}</p>}
            {loose.size > 0 && <p className="ws-warn">{t(PROBLEM.loose[0], PROBLEM.loose[1])}</p>}
            <button type="button" className="ws-go" onClick={fly}>{t("放飞 ▶", "Fly ▶")}</button>
          </aside>
        </div>
      ) : (
        <div className="ws-main fly">
          <section className="ws-center">
            {level.setups.length > 1 && (
              <div className="ws-tabs">
                {level.setups.map((_, i) => (
                  <button key={i} type="button" className={`${i === setup ? "on" : ""} ${sandbox ? "" : grade?.runs[i].outcome === "cleared" ? "pass" : "fail"}`} onClick={() => { setSetup(i); restart(); }}>
                    {sandbox ? t(SANDBOX_ARENAS[i][0], SANDBOX_ARENAS[i][1]) : <><i>{grade?.runs[i].outcome === "cleared" ? "✓" : "✗"}</i>{t(`场景 ${i + 1}`, `Setup ${i + 1}`)}</>}
                  </button>
                ))}
              </div>
            )}
            <div className="ws-stage">
              {replaying ? (
                <ReplayStage level={level} setup={setup} trace={trace} tick={scrub} t={t} />
              ) : (
                <FlyCanvas
                  level={level}
                  design={design}
                  setup={setup}
                  runKey={runKey}
                  speed={speed}
                  sound={save.sound}
                  t={t}
                  onEnd={(o) => {
                    setEnded(o);
                    trackEvent("flight_ended", { level: level.id, outcome: o });
                    // the run is deterministic, so record it again headless: that trace is
                    // what the timeline scrubs through and what the diagnosis reads
                    try { const tr = runTrace(level, design, setup); setTrace(tr); setScrub(tr.ticks - 1); } catch { setTrace(null); }
                    if (o === "cleared" && grade?.cleared && !grade.problems.length) setTimeout(() => setResults(true), 1400);
                  }}
                  onStart={() => { setLog([]); setEnded(null); }}
                  onLog={(l) => setLog((x) => [...x.slice(-7), l])}
                  onTick={(w: World) => { live.current = w; setHud({ t: w.t / 60, eaten: w.eaten.filter(Boolean).length, knocked: w.knocked }); }}
                />
              )}
              <div className="ws-hud">
                <span><small>{t("时间", "Time")}</small><b>{shown.t.toFixed(1)}</b><em>/ {level.seconds}</em></span>
                {level.goal.kind === "knock" ? <span><small>{t("撞倒", "Knocked")}</small><b>{shown.knocked}</b><em>/ {level.goal.n}</em></span> : level.goal.kind === "free" ? <span><small>{t("糖", "Sugar")}</small><b>{shown.eaten}</b></span> : <span><small>{t("糖", "Sugar")}</small><b>{shown.eaten}</b><em>/ {level.goal.kind === "eat" && level.goal.any ? 1 : level.setups[setup].sugar.length}</em></span>}
                {level.goal.kind === "home" && <span><small>{t("然后", "Then")}</small><b>⌂</b><em>{t("回窝", "home")}</em></span>}
                {replaying && <span className="rew"><small>{t("回放", "Replay")}</small><b>⏮</b><em>{t("可拖动", "scrubbable")}</em></span>}
              </div>
              {ended && ended !== "cleared" && !hideVerdict && (
                <div className={`ws-verdict ${sandbox ? "good" : "bad"}`} role="status">
                  <b>{ended === "caught" ? t("被蜘蛛逮住了", "The spider got it") : ended === "smashed" ? t("玻璃糖碎了", "The glass sugar shattered") : sandbox ? t("一分钟到", "A minute is up") : t("时间到", "Out of time")}</b>
                  <span>{ended === "caught" ? t("蜘蛛今晚加餐。", "The spider eats well tonight.") : ended === "smashed" ? t("撞上去太快了。", "It hit too fast.") : sandbox ? t("换个场地，或者回去改改再飞。", "Try another arena, or change something and fly again.") : t("它没能完成目标。", "It did not make it.")}{!sandbox && t("下面的时序图是这一次飞行的完整记录，拖到出问题的那一刻看看。", " The timeline below is the full record of this run: drag to the moment it went wrong.")}</span>
                  {primaryFinding && (
                    <div className="ws-verdict-fix">
                      <small>{t("下一次先试这一处", "TRY THIS NEXT")}</small>
                      <span>{t(primaryFinding.zh, primaryFinding.en)}</span>
                      <div>
                        {primaryFinding.tick !== undefined && (
                          <button type="button" className="ws-ghost" onClick={() => inspectFinding(primaryFinding)}>
                            {t(`定位到 ${(primaryFinding.tick / 60).toFixed(1)} 秒`, `Inspect ${(primaryFinding.tick / 60).toFixed(1)}s`)}
                          </button>
                        )}
                        {primaryFinding.partId && (
                          <button type="button" className="ws-ghost" onClick={() => reviseFinding(primaryFinding)}>
                            {t(`回去改 ${nameOf(primaryFinding.partId)}`, `Change ${nameOf(primaryFinding.partId)}`)}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    {!sandbox && <button type="button" className="ws-ghost" onClick={() => { trackEvent("replay_opened", { level: level.id }); setHideVerdict(true); }}>{t("看回放", "Inspect the run")}</button>}
                    <button type="button" className="ws-ghost" onClick={restart}>{t("再飞一次", "Fly again")}</button>
                    <button type="button" className="ws-go small" onClick={back}>{t("回去改", "Back to build")}</button>
                  </div>
                </div>
              )}
              {ended === "cleared" && !results && (
                <div className="ws-verdict good" role="status">
                  <b>{grade?.cleared ? t("过关！", "Cleared!") : t("这个场景过了", "This setup passes")}</b>
                  <span>{grade?.cleared ? "" : t("还有别的场景没过，点上面的标签看看。", "Other setups still fail; pick one above.")}</span>
                </div>
              )}
            </div>
            {replaying && trace && trace.rows.length > 0 && (
              <Timeline trace={trace} tick={scrub} onScrub={setScrub} highlight={hiRow} t={t} nameOf={nameOf} />
            )}
            {chipOpen && <ChipView design={design} world={scrubWorld ?? live.current} tick={replaying ? scrub : hud.t} t={t} nameOf={nameOf} />}
          </section>
          <aside className="ws-side">
            {findings.length > 0 && (
              <div className="ws-findings">
                <div className="hd">{ended === "cleared" ? t("还能再压一压", "Still worth pushing") : t("诊断", "Diagnosis")}</div>
                {findings.map((f, i) => (
                  <button key={i} type="button" className={`fd ${f.tone} ${f.row !== undefined && hiRow === f.row ? "on" : ""}`} onClick={() => jump(f, i)} disabled={f.row === undefined && f.tick === undefined}>
                    <i aria-hidden>{f.tone === "dead" ? "○" : f.tone === "stuck" ? "≡" : f.tone === "good" ? "✓" : "!"}</i>
                    <span>{t(f.zh, f.en)}</span>
                    {f.tick !== undefined && <em>{(f.tick / 60).toFixed(1)}s</em>}
                  </button>
                ))}
                {ended !== "cleared" && <p className="fine">{t("点一条，时序图就跳到那一刻，芯片视图也跟着亮。", "Click one: the timeline jumps to that tick and the chip view lights up with it.")}</p>}
              </div>
            )}
            <div className="ws-log">
              <div className="hd">{t("发生了什么", "What happened")}</div>
              {log.length === 0 && <p className="none">{t("起飞……", "Taking off…")}</p>}
              {log.map((l, i) => <p key={i} className={l.tone}><i>{l.t.toFixed(1)}s</i>{l.text}</p>)}
            </div>
            {!replaying && (
              <div className="ws-speed">
                {[0.5, 1, 2, 4].map((s) => <button key={s} type="button" className={speed === s ? "on" : ""} onClick={() => setSpeed(s)}>{s}×</button>)}
              </div>
            )}
            {replaying && trace && (
              <div className="ws-speed scrub">
                <button type="button" onClick={() => setScrub(0)} title={t("回到起飞", "Back to launch")}>⏮</button>
                <button type="button" onClick={() => setScrub(Math.max(0, scrub - 6))}>−0.1s</button>
                <button type="button" onClick={() => setScrub(Math.min(trace.ticks - 1, scrub + 6))}>+0.1s</button>
                <button type="button" onClick={() => setScrub(trace.ticks - 1)} title={t("跳到结尾", "Jump to the end")}>⏭</button>
              </div>
            )}
            <div className="ws-actions">
              <button type="button" className="ws-ghost" onClick={restart}>{t("重飞 ␣", "Replay ␣")}</button>
              <button type="button" className="ws-ghost" onClick={exportGif} disabled={gifBusy}>{gifBusy ? t("生成中…", "Rendering…") : t("导出 GIF", "Export GIF")}</button>
              <button type="button" className={`ws-ghost ${chipOpen ? "on" : ""}`} onClick={toggleChip}>{t("芯片视图", "Chip view")}</button>
            </div>
            <button type="button" className="ws-go" onClick={back}>{t("回去改", "Back to build")}</button>
          </aside>
        </div>
      )}

      {chipOpen && view === "build" && (
        <div className="ws-modal" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setChipOpen(false); }}>
          <div className="ws-card wide">
            <ChipView design={design} world={null} tick={0} t={t} nameOf={nameOf} />
            <div className="acts"><button type="button" className="ws-go small" onClick={() => setChipOpen(false)}>{t("关闭", "Close")}</button></div>
          </div>
        </div>
      )}
      {results && grade && (
        <div className="ws-modal" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setResults(false); }}>
          <div className="ws-card">
            <p className="ch">{t(`第 ${level.chapter} 章 · 第 ${index + 1} 关`, `Chapter ${level.chapter} · level ${index + 1}`)}</p>
            <h2>{t(`${level.title.zh}，过关！`, `${level.title.en}: cleared`)}</h2>
            <p className="lesson">{t(level.lesson.zh, level.lesson.en)}</p>
            <div className="ws-scores">
              <div><b>{grade.cost}</b><span>{t("零件", "parts")}</span>{save.best[level.id] && <em>{t(`最好 ${save.best[level.id].cost}`, `best ${save.best[level.id].cost}`)}</em>}</div>
              <div className={level.par && grade.gates <= level.par.gates ? "met" : ""}><b>{grade.gates}</b><span>{bits ? t(`NAND 门 · ${bits} 位`, `NAND gates · ${bits} bits`) : t("NAND 门", "NAND gates")}</span>{level.par && <em>{t(`标准 ${level.par.gates}`, `par ${level.par.gates}`)}</em>}</div>
              <div className={level.par && grade.seconds <= level.par.seconds ? "met" : ""}><b>{grade.seconds.toFixed(1)}</b><span>{t("秒", "seconds")}</span>{level.par && <em>{t(`标准 ${level.par.seconds}`, `par ${level.par.seconds}`)}</em>}</div>
            </div>
            {level.par && (() => {
              const m = medalsFor(level, grade.gates, grade.seconds);
              return (
                <div className="ws-medals">
                  <span className={m.brain ? "on" : ""}>◉ {t("小脑袋", "Small brain")}</span>
                  <span className={m.speed ? "on" : ""}>➤ {t("快", "Fast")}</span>
                  <span className={m.both ? "on gold" : ""}>★ {t("两项全达标", "Both pars")}</span>
                </div>
              );
            })()}
            {findings.length > 0 && (
              <ul className="ws-push">{findings.map((f, i) => <li key={i} className={f.tone}>{t(f.zh, f.en)}</li>)}</ul>
            )}
            {!portalMode && <div className={`ws-seal ${sealResult?.seal.eligible ? "ok" : sealResult ? "blocked" : ""}`}>
              <div className="hd">
                <span>{t("上链流片资格", "Tape-out eligibility")}</span>
                <b>{sealBusy ? t("全量核对中…", "Checking every input…") : sealResult?.seal.eligible ? t("可上链流片", "Eligible for tape-out") : sealResult ? t("暂不可上链流片", "Not yet eligible") : t("等待核对", "Waiting for the check")}</b>
              </div>
              {sealBusy && <p>{t("服务器正在把每一种感官与记忆状态都跑一遍。", "The server is checking every sensor and state-bit combination.")}</p>}
              {sealErr && <p className="bad">{sealErr}</p>}
              {sealResult && (
                <>
                  <div className="facts">
                    <span>{t("输入 / 输出", "Inputs / outputs")} <b>{sealResult.seal.nIn} / {sealResult.seal.nOut}</b></span>
                    <span>{t("记忆位", "State bits")} <b>{sealResult.seal.state.length}</b></span>
                    <span>{t("NAND 门", "NAND gates")} <b>{sealResult.seal.gates}</b></span>
                    <span>{t("已核对", "Checked")} <b>{sealResult.seal.checkedInputs.toLocaleString()}</b></span>
                    <span>{t("字节哈希", "Byte hash")} <b>{sealResult.seal.bytesSha256.slice(0, 16)}…</b></span>
                  </div>
                  {sealResult.seal.problems.length > 0 && (
                    <ul>{sealResult.seal.problems.map((problem) => <li key={problem}>{sealProblem(problem)}</li>)}</ul>
                  )}
                  <div className="acts">
                    <button type="button" className="ws-ghost" onClick={copySeal}>{t("复制流片报告", "Copy seal report")}</button>
                    <button type="button" className="ws-ghost" onClick={downloadSeal}>{t("下载 JSON", "Download JSON")}</button>
                  </div>
                  <p className="note">{t("这是本地可验证证明，本身不会发起 X Layer 交易。确认处理器与费用后，可在流片面板用你的钱包发起真实流片。", "This is the local verifiable proof and does not itself send a transaction. After reviewing the processor and fee, you can start a real tape-out from the tape-out panel with your wallet.")}</p>
                </>
              )}
            </div>}
            {!portalMode && (
              <p className={`ws-claim-progress ${workshopClaimLevels.length >= 3 ? "ready" : ""}`}>
                {workshopClaimLevels.length >= 3
                  ? t("已累计通关 3 关：可以领取工坊纪念电路 NFT。", "Three levels cleared: the Workshop commemorative circuit NFT can be claimed.")
                  : t(`累计通关 3 关即可领取纪念 NFT；还差 ${Math.max(0, 3 - workshopClaimLevels.length)} 关。`, `Clear three levels total to claim the commemorative NFT; ${Math.max(0, 3 - workshopClaimLevels.length)} more to go.`)}
              </p>
            )}
            {!portalMode && workshopClaimLevels.length >= 3 && (
              <CircuitClaimButton payload={{ mode: "workshop", levels: workshopClaimLevels }} />
            )}
            <p className="fine">{portalMode ? t("三个分数各自都能刷：更少的零件、更少的门、更快。试着找到这一关最简洁、最稳定的大脑。", "Each score can be pushed on its own: fewer parts, fewer gates, faster. Find the simplest, most reliable brain for this level.") : t("三个分数各自都能刷：更少的零件、更少的门、更快。你接的神经是一块真的 NAND 电路；只有上面显示“可上链流片”时，字节才通过了全量核对。", "Each score can be pushed on its own: fewer parts, fewer gates, faster. Your nerves are a real NAND circuit; the bytes pass only when the seal check above says “Eligible for tape-out”.")}</p>
            <div className="acts">
              <button type="button" className="ws-ghost" onClick={() => setResults(false)}>{t("继续优化", "Keep improving")}</button>
              {!portalMode && <button type="button" className="ws-ghost" onClick={() => { setResults(false); setPubOpen(true); setPubDone(null); setPubErr(null); }}>{t("发布到工坊", "Publish")}</button>}
              <button type="button" className="ws-ghost" onClick={exportGif} disabled={gifBusy}>{gifBusy ? t("生成中…", "Rendering…") : t("导出 GIF", "Export GIF")}</button>
              {onNext ? <button type="button" className="ws-go small" onClick={onNext}>{t("下一关 →", "Next level →")}</button> : <button type="button" className="ws-go small" onClick={onExit}>{t("回到关卡", "Back to levels")}</button>}
            </div>
          </div>
        </div>
      )}
      {!portalMode && pubOpen && (
        <div className="ws-modal" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setPubOpen(false); }}>
          <div className="ws-card">
            <h2>{t("发布到工坊", "Publish to the workshop")}</h2>
            {!pubDone ? (
              <>
                <p className="fine">{t("服务器会把这个设计重新跑一遍，记下它自己量出来的秒数、门数和零件花费。别人可以载入它、和它对决、在它上面改。", "The server re-runs this design and records the time, gates and part cost it measures itself. Others can load it, duel it and build on it.")}</p>
                {parentId && <p className="fine">{t("这个设计是从别人的设计改来的：会记下来源，但成绩只算你这一版自己跑出来的。", "This design was derived from another: its source is recorded, but only the score this version runs counts.")}</p>}
                <label className="ws-field">
                  <span>{t("给它起个名字", "Name it")}</span>
                  <input type="text" maxLength={24} value={pubName} onChange={(e) => setPubName(e.target.value)} placeholder={t("比如：三连撞", "e.g. Triple bump")} />
                </label>
                {pubErr && <p className="ws-warn">{pubErr}</p>}
                <div className="acts">
                  <button type="button" className="ws-ghost" onClick={() => setPubOpen(false)}>{t("取消", "Cancel")}</button>
                  <button type="button" className="ws-go small" onClick={publish} disabled={pubBusy}>{pubBusy ? t("服务器在跑…", "The server is running it…") : t("发布", "Publish")}</button>
                </div>
              </>
            ) : (
              <>
                <p className="fine">{pubDone.existed ? t("一模一样的设计已经有人发布过了，这是它的页面。", "This exact design was already published. Here is its page.") : t("发布好了。这是它的页面：", "Published. Here is its page:")}</p>
                <input className="ws-link-box" readOnly value={pubUrl} onFocus={(e) => e.currentTarget.select()} />
                <div className="acts">
                  <button type="button" className="ws-ghost" onClick={copyPub}>{t("复制链接", "Copy link")}</button>
                  <a className="ws-go small" href={`/workshop/d/${pubDone.id}`}>{t("去看看", "Open it")}</a>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {toast && <div className="ws-toast" role="status">{toast}</div>}
    </div>
  );
}

/* ── the shell ─────────────────────────────────────────────────────────────── */

export default function Workshop({ portalMode = false }: { portalMode?: boolean } = {}) {
  const { lang, t, setLang } = useLang();
  const [save, update] = useWSave();
  const [levelId, setLevelId] = useState<string | null>(null);
  const [shared, setShared] = useState<Design | null>(null);
  const [rival, setRival] = useState<Design | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      const q = new URLSearchParams(window.location.search);
      const l = q.get("l");
      setLevelId(l && WLEVELS.some((x) => x.id === l) ? l : null);
      const d = q.get("d");
      setShared(d ? decodeDesign(d) : null);
      const v = q.get("vs");
      setRival(v ? decodeDesign(v) : null);
      const f = q.get("from");
      setParentId(f && /^[0-9a-f]{12}$/.test(f) ? f : null);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  useEffect(() => setSound(save.sound), [save.sound]);
  const go = (id: string | null) => { window.history.pushState(null, "", id ? `?l=${id}` : window.location.pathname); setLevelId(id); setShared(null); setRival(null); setParentId(null); window.scrollTo(0, 0); };
  /** a level is open if it is one of the first two, follows a cleared level, or was cleared; the sandbox is always open; a shared link opens its level */
  const open = (l: WLevel) => {
    if (l.chapter === 0) return true;
    const i = LEVELS.indexOf(l);
    return i < 2 || !!save.best[LEVELS[i - 1].id] || !!save.best[l.id];
  };
  const level = levelId ? WLEVELS.find((l) => l.id === levelId) : undefined;
  const cleared = LEVELS.filter((l) => save.best[l.id]).length;
  const workshopClaimLevels = LEVELS
    .filter((l) => save.best[l.id] && save.designs[l.id])
    .slice(0, 3)
    .map((l) => ({ level: l.id, code: encodeDesign(save.designs[l.id]) }));

  const tools = (
    <div className="ws-top">
      <SaveTools save={save} update={update} t={t} />
      <button type="button" className="ws-mini" onClick={() => update((s) => ({ ...s, sound: !s.sound }))}>{save.sound ? t("声音 开", "Sound on") : t("声音 关", "Sound off")}</button>
      <button type="button" className="ws-mini" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>{lang === "zh" ? "EN" : "中文"}</button>
    </div>
  );

  if (level && (open(level) || shared)) {
    const i = LEVELS.indexOf(level);
    const next = i >= 0 ? LEVELS[i + 1] : undefined;
    return (
      <main className="ws">
        {tools}
        <LevelView key={level.id + (shared ? ":shared" : "") + (rival ? ":vs" : "")} level={level} save={save} update={update} t={t} shared={shared} rival={rival} parentId={shared ? parentId : null} onExit={() => go(null)} onNext={next ? () => go(next.id) : null} portalMode={portalMode} />
      </main>
    );
  }

  const card = (l: WLevel) => {
    const i = LEVELS.indexOf(l);
    const b = save.best[l.id];
    const ok = open(l);
    const prev = i > 0 ? LEVELS[i - 1] : undefined;
    const fresh = l.parts.filter((k) => !(prev?.parts ?? []).includes(k));
    return (
      <li key={l.id}>
        <button type="button" className={`ws-lcard ${b ? "done" : ""} ${l.chapter === 0 ? "sandbox" : ""}`} disabled={!ok} onClick={() => { sfx.click(); go(l.id); }}>
          <Thumb level={l} />
          <span className="i">{l.chapter === 0 ? "∞" : i + 1}</span>
          <span className="tt">{t(l.title.zh, l.title.en)}</span>
          <span className="new">{l.chapter === 0 ? t("全部零件 · 4 个场地 · 没有目标", "All parts · 4 arenas · no goal") : <>{t("新零件：", "New: ")}{fresh.map((k) => t(PARTS[k].name.zh, PARTS[k].name.en)).join(t("、", ", ")) || "—"}{l.logic && !prev?.logic ? t("、反过来 / 全部", ", NOT / ALL") : ""}</>}</span>
          {b ? (
            <span className="best">
              {t(`${b.cost} 零件 · ${b.gates} 门 · ${b.seconds} 秒`, `${b.cost} parts · ${b.gates} gates · ${b.seconds} s`)}
              {l.par && (() => { const m = medalsFor(l, b.gates, b.seconds); return <i className="md">{m.both ? "★" : m.brain ? "◉" : m.speed ? "➤" : ""}</i>; })()}
            </span>
          ) : <span className="state">{ok ? t("可以玩", "Open") : t("先过上一关", "Clear the one before")}</span>}
        </button>
      </li>
    );
  };

  return (
    <main className="ws ws-map">
      {tools}
      <header className="ws-hero">
        <p className="kick">TapeFly · {t("工坊", "Workshop")}</p>
        <h1>{t("用零件搭一只机器果蝇。", "Build a robot fly from parts.")}</h1>
        <p className="lede">{t("翅膀装在哪，它就往哪歪；眼睛接到哪只翅膀，它就往哪转。你接的神经就是它的大脑，也是一块真的 NAND 芯片：从反射，到记忆，到计数器。", "Where you mount a wing decides how it leans; which wing an eye is wired to decides where it turns. Your nerves are its brain and a real NAND chip: from reflexes, to memory, to counters.")}</p>
        <p className="progress">{t(`已过 ${cleared} / ${LEVELS.length} 关`, `${cleared} / ${LEVELS.length} levels cleared`)}</p>
        {!portalMode && (
          <p className={`ws-claim-progress ${workshopClaimLevels.length >= 3 ? "ready" : ""}`}>
            {workshopClaimLevels.length >= 3
              ? t("已累计通关 3 关：可以领取工坊纪念电路 NFT。", "Three levels cleared: the Workshop commemorative circuit NFT can be claimed.")
              : t(`累计通关 3 关即可领取纪念 NFT；还差 ${Math.max(0, 3 - workshopClaimLevels.length)} 关。`, `Clear three levels total to claim the commemorative NFT; ${Math.max(0, 3 - workshopClaimLevels.length)} more to go.`)}
          </p>
        )}
        {!portalMode && workshopClaimLevels.length >= 3 && (
          <CircuitClaimButton payload={{ mode: "workshop", levels: workshopClaimLevels }} />
        )}
        {!portalMode && <p><a className="ws-link" href="/workshop/gallery">{t("看看大家发布的设计和每关排行 →", "See what players published and each level's board →")}</a></p>}
      </header>
      {CHAPTERS.map(([ch, zh, en, dzh, den]) => (
        <section key={ch} className="ws-chapter">
          <h2>{t(zh, en)}</h2>
          <p>{t(dzh, den)}</p>
          <ol className="ws-levels">{LEVELS.filter((l) => l.chapter === ch).map(card)}</ol>
        </section>
      ))}
      <section className="ws-chapter">
        <h2>{t("沙盒", "Sandbox")}</h2>
        <p>{t("所有零件都在，随便搭，搭好了用“分享链接”发给朋友。", "Every part, no rules. Build anything and send it with ‘Share link’.")}</p>
        <ol className="ws-levels">{WLEVELS.filter((l) => l.chapter === 0).map(card)}</ol>
      </section>
      <p className="ws-foot">{portalMode ? t("进度只保存在当前浏览器。", "Progress is saved in this browser.") : <>{t("进度只存在这个浏览器里，不需要钱包。", "Progress lives in this browser; no wallet needed.")} <a href="/docs">{t("查看开发者文档", "Read the developer docs")}</a></>}</p>
    </main>
  );
}
