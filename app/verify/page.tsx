"use client";

/* Verify a record. Paste a fly's day — the JSON from /api/v1/fly or any transcript
   of ticks — and this page recomputes the chain with the same canonical-JSON rule
   the engine uses, in your browser, and tells you exactly where it first diverges.
   Nothing is uploaded: the hash runs here. */

import { useState } from "react";
import { SiteNav, SiteFooter } from "@/app/components/ui/Shell";
import { stableStringify, recordHash, chainHash, GENESIS } from "@/sim/hash";
import { useLang } from "@/app/i18n/client";

type AnyRecord = Record<string, unknown>;

interface Result {
  records: number;
  final: string;
  expected: string | null;
  ok: boolean;
  firstBad: number | null;
  providedChain: boolean;
}

function check(text: string, expectedText: string): Result | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { error: `not JSON: ${(e as Error).message}` };
  }

  const obj = parsed as AnyRecord;
  const records: AnyRecord[] = Array.isArray(parsed)
    ? (parsed as AnyRecord[])
    : ((obj.trace as AnyRecord[]) ?? (obj.ticks as AnyRecord[]) ?? null)!;
  if (!records || !Array.isArray(records)) {
    return { error: "expected an array of ticks, or an object with `trace`/`ticks`" };
  }

  const chain: string[] | null = Array.isArray(obj.chain) ? (obj.chain as string[]) : null;
  const expected = expectedText.trim() || (typeof obj.hash === "string" ? (obj.hash as string) : null);

  let prev = GENESIS;
  let firstBad: number | null = null;
  records.forEach((r, i) => {
    const h = recordHash(r);
    const c = chainHash(prev, h);
    if (chain && firstBad === null && chain[i] !== c) firstBad = i;
    prev = c;
  });

  return {
    records: records.length,
    final: prev,
    expected,
    ok: expected === null ? firstBad === null : prev === expected && firstBad === null,
    firstBad,
    providedChain: !!chain
  };
}

const SAMPLE = `{"date":"2026-10-16","name":"mossy-wren","hash":"<paste the hash here>","trace":[ ... ]}`;

export default function VerifyPage() {
  const [text, setText] = useState("");
  const [expected, setExpected] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t: tt } = useLang();

  function run(t = text) {
    setRes(null);
    setErr(null);
    const r = check(t, expected);
    if ("error" in r) setErr(r.error);
    else setRes(r);
  }

  async function sample() {
    setLoading(true);
    try {
      const d = new Date().toISOString().slice(0, 10);
      const day = await (await fetch(`/api/v1/fly/${d}?compact=1`)).json();
      const name = typeof day.champion === "string" ? day.champion : day.champion?.name;
      const rec = await (await fetch(`/api/v1/fly/${d}/${name}`)).text();
      setText(rec);
      run(rec);
    } catch (e) {
      setErr(tt(`示例加载失败：${(e as Error).message}`, `could not load a sample: ${(e as Error).message}`));
    }
    setLoading(false);
  }

  return (
    <main>
      <SiteNav here="/verify" />
      <div className="page">
        <header className="page-head">
          <h1>{tt("核查一条记录", "Verify a record")}</h1>
          <p>
            {tt("果蝇的一天是一条哈希链：每一步先算哈希，再和前一步折在一起。粘贴一条记录，这个页面会用引擎同样的规范 JSON 规则，在你的浏览器里重建这条链。什么都不会发出去。",
                "A fly’s day is a hash chain: each tick is hashed, then folded into the one before. Paste a record and this page rebuilds the chain here, with the same canonical-JSON rule the engine uses. Nothing is sent anywhere.")}
          </p>
        </header>

        <div className="panel">
          <div className="row between">
            <h3>{tt("记录", "The record")}</h3>
            <button className="btn small" onClick={sample} disabled={loading}>{loading ? tt("加载中…", "Loading…") : tt("载入今天的冠军", "Load today’s champion")}</button>
          </div>
          <textarea className="field" spellCheck={false} rows={10} placeholder={SAMPLE} value={text} onChange={(e) => setText(e.target.value)} style={{ marginTop: 12 }} />
          <div className="verify-row">
            <input className="field" spellCheck={false} placeholder={tt("期望的最终哈希（可选；不填就从记录里取）", "Expected final hash (optional; taken from the record if left out)")} value={expected} onChange={(e) => setExpected(e.target.value)} />
            <button className="btn primary" onClick={() => run()} disabled={!text.trim()}>{tt("核查", "Check it")}</button>
          </div>
        </div>

        {err && (
          <div className="panel verdict bad">
            <h2>{tt("读不了", "Can’t read it")}</h2>
            <p>{err}</p>
          </div>
        )}

        {res && (
          <div className={`panel verdict ${res.ok ? "ok" : "bad"}`}>
            <h2>{res.ok ? tt("封存完好，每一步都对得上。", "Sealed. Every tick checks out.") : tt("这条记录对不上。", "This record does not match.")}</h2>
            <p>{tt(`在这个浏览器里重建了 ${res.records} 步。`, `${res.records} ticks rebuilt in this browser.`)}</p>
            {res.firstBad !== null && <p className="bad-text">{tt(`链条第一次断在第 ${res.firstBad} 步。从这一步往后都不可信。`, `The chain first breaks at tick ${res.firstBad}. Every tick from there on is suspect.`)}</p>}
            {res.expected === null && <p>{tt("没给期望的哈希，所以这里只是重新推导了一遍记录。", "No expected hash was given, so this only re-derives the record.")}</p>}
            <p className="r-label" style={{ marginTop: 12 }}>{tt("重建结果", "Rebuilt")}</p>
            <code className={`hash ${res.ok ? "ok" : "bad"}`}>{res.final}</code>
            {res.expected && (<><p className="r-label" style={{ marginTop: 8 }}>{tt("期望值", "Expected")}</p><code className="hash">{res.expected}</code></>)}
          </div>
        )}

        <div className="panel">
          <h3>{tt("你在核查什么", "What you are checking")}</h3>
          <p>
            {tt(<>规则在 <code>sim/hash.ts</code> 里：先用 SHA-256 对 <code>canonical(tick)</code> 求哈希，再算 <code>SHA-256({"{"} p: 前一个, r: 这一个 {"}"})</code>。求哈希前键会排序，所以调换 JSON 字段顺序不会改变哈希；例如 <code>{stableStringify({ b: 1, a: 2 })}</code>。记录来自 <code>/api/v1/fly/&#123;date&#125;/&#123;name&#125;</code>。</>,
                <>The rule lives in <code>sim/hash.ts</code>: <code>canonical(tick)</code> is hashed with SHA-256, then <code>SHA-256({"{"} p: previous, r: this {"}"})</code>. Keys are sorted before hashing, so reordering JSON fields cannot change a hash; for example <code>{stableStringify({ b: 1, a: 2 })}</code>. Records come from <code>/api/v1/fly/&#123;date&#125;/&#123;name&#125;</code>.</>)}
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
