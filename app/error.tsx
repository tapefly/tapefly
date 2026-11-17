"use client";

import { useEffect } from "react";
import { track } from "./lib/telemetry";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    track("client_error", { message: error.message.slice(0, 240), digest: error.digest ?? null });
  }, [error]);

  return (
    <main className="page" style={{ paddingBlock: 80 }}>
      <div className="panel" style={{ maxWidth: 720, margin: "0 auto", padding: 28 }}>
        <p className="kicker">TapeFly</p>
        <h1>这个页面暂时没有飞起来</h1>
        <p className="lede">错误已经被记录。你的浏览器本地设计不会因为刷新而丢失。</p>
        <div className="row" style={{ marginTop: 20 }}>
          <button type="button" className="btn primary" onClick={reset}>再试一次</button>
          <a className="btn" href="/workshop">回到工坊</a>
          <a className="btn" href="/support">联系支持</a>
        </div>
      </div>
    </main>
  );
}
