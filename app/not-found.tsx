import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page" style={{ paddingBlock: 90 }}>
      <div className="panel" style={{ maxWidth: 660, margin: "0 auto", padding: 28 }}>
        <p className="kicker">404</p>
        <h1>这里没有可回放的记录</h1>
        <p className="lede">地址可能已经变化，或者这个设计从未发布。</p>
        <div className="row" style={{ marginTop: 20 }}>
          <Link className="btn primary" href="/workshop">回到工坊</Link>
          <Link className="btn" href="/workshop/gallery">看看设计库</Link>
        </div>
      </div>
    </main>
  );
}
