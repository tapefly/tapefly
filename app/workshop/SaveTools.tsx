"use client";

import { useRef, useState } from "react";
import { decodeDesign, encodeDesign } from "@/sim/workshop/codec";
import type { WSave } from "./store";
import type { T } from "../evo/text";

function normalize(input: unknown): WSave | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<WSave>;
  if (!raw.designs || typeof raw.designs !== "object" || !raw.best || typeof raw.best !== "object") return null;
  const designs: WSave["designs"] = {};
  for (const [level, value] of Object.entries(raw.designs)) {
    try {
      const design = decodeDesign(encodeDesign(value as never));
      if (design) designs[level] = design;
    } catch {
      // Skip a malformed design instead of rejecting the whole save.
    }
  }
  const best: WSave["best"] = {};
  for (const [level, value] of Object.entries(raw.best)) {
    if (!value || typeof value !== "object") continue;
    const v = value as { cost?: unknown; gates?: unknown; seconds?: unknown };
    if ([v.cost, v.gates, v.seconds].every((n) => typeof n === "number" && Number.isFinite(n))) {
      best[level] = { cost: v.cost as number, gates: v.gates as number, seconds: v.seconds as number };
    }
  }
  return { designs, best, sound: raw.sound !== false };
}

export default function SaveTools({ save, update, t }: {
  save: WSave;
  update: (f: (s: WSave) => WSave) => void;
  t: T;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const exportSave = () => {
    const blob = new Blob([JSON.stringify({ version: "TAPEFLY-WEB-SAVE/1", savedAt: new Date().toISOString(), save }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tapefly-save-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMsg(t("存档已导出", "Save exported"));
    setTimeout(() => setMsg(""), 1800);
  };
  const importSave = async (picked: File | undefined) => {
    if (!picked) return;
    try {
      const parsed = JSON.parse(await picked.text());
      const next = normalize(parsed?.save ?? parsed);
      if (!next) throw new Error("invalid");
      update(() => next);
      setMsg(t("存档已导入", "Save imported"));
    } catch {
      setMsg(t("这个文件不是有效的 TapeFly 存档", "This is not a valid TapeFly save"));
    } finally {
      if (file.current) file.current.value = "";
      setTimeout(() => setMsg(""), 2400);
    }
  };
  return (
    <>
      <button type="button" className="ws-mini" onClick={exportSave}>{t("导出存档", "Export save")}</button>
      <button type="button" className="ws-mini" onClick={() => file.current?.click()}>{t("导入存档", "Import save")}</button>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void importSave(e.target.files?.[0])} />
      {msg && <span className="ws-save-msg" role="status">{msg}</span>}
    </>
  );
}
