"use client";

import { useState } from "react";

export default function ReportDesign({ id, zh }: { id: string; zh: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const submit = async () => {
    const r = await fetch("/api/v1/workshop/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reason }),
    });
    setMsg(r.ok ? (zh ? "举报已提交" : "Report submitted") : (zh ? "提交失败，请稍后再试" : "Could not submit"));
    if (r.ok) setReason("");
  };
  return (
    <div className="wg-report">
      <button type="button" className="ws-ghost" onClick={() => setOpen((v) => !v)}>{zh ? "举报这个设计" : "Report this design"}</button>
      {open && (
        <div className="wg-report-box">
          <label>
            {zh ? "原因" : "Reason"}
            <textarea value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="row">
            <button type="button" className="ws-go small" disabled={reason.trim().length < 3} onClick={submit}>{zh ? "提交" : "Submit"}</button>
            {msg && <span role="status">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
