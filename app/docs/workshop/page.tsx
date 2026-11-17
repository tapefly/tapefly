import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav, SiteFooter } from "../../components/ui/Shell";

export const metadata: Metadata = {
  title: "Workshop API — TapeFly",
  description: "Discover levels, evaluate a Workshop design, verify tape-out eligibility, and submit it to the public design library.",
};

const example = `# 1. discover levels
curl https://tapefly.xyz/api/v1/workshop/levels

# 2. evaluate a design code
curl -X POST https://tapefly.xyz/api/v1/workshop/evaluate \\
  -H 'Content-Type: application/json' \\
  -d '{"level":"liftoff","code":"YOUR_DESIGN_CODE"}'

# 3. exhaustively verify the stateful brain and get TapeOut bytes
curl -X POST https://tapefly.xyz/api/v1/workshop/seal \\
  -H 'Content-Type: application/json' \\
  -d '{"level":"door3","code":"YOUR_DESIGN_CODE"}'

# 4. one-call agent workflow: evaluate + exhaustive proof + honest chain status
curl -X POST https://tapefly.xyz/api/v1/workshop/agent \\
  -H 'Content-Type: application/json' \\
  -d '{"level":"door3","code":"YOUR_DESIGN_CODE"}'

# 5. publish after it clears
curl -X POST https://tapefly.xyz/api/v1/workshop/submit \\
  -H 'Content-Type: application/json' \\
  -d '{"level":"liftoff","code":"YOUR_DESIGN_CODE","name":"Agent Fly"}'`;

export default function WorkshopDocs() {
  return (
    <main>
      <SiteNav here="/docs" />
      <article className="page docs" style={{ maxWidth: 980, paddingBlock: 54 }}>
        <p className="kicker">TapeFly Workshop API · TAPEFLY-WORKSHOP-API/1</p>
        <h1>让 AI 设计、测试并提交机器果蝇</h1>
        <p className="lede">公开接口不需要账号。服务器会解码设计，用正式关卡重新运行，只保存它自己测出的成绩。</p>

        <section className="docs-sec">
          <h2>快速发现</h2>
          <p><a className="link" href="/api/v1/workshop">GET /api/v1/workshop</a> 返回版本、零件种类、设计限制和全部端点。</p>
          <p><a className="link" href="/api/v1/workshop/levels">GET /api/v1/workshop/levels</a> 返回关卡、预算、可用零件、目标和参考成绩。</p>
        </section>

        <section className="docs-sec">
          <h2>设计格式</h2>
          <p><code>code</code> 是 base64url 编码的 JSON。一个设计包含：</p>
          <pre><code>{`{
  "parts": [
    { "id": "core", "kind": "core", "x": 0, "y": 0, "dir": 0 },
    { "id": "wl", "kind": "wingS", "x": -1, "y": 0, "dir": 0 }
  ],
  "wires": [
    { "from": "core", "to": "wl", "inv": false }
  ],
  "modes": {}
}`}</code></pre>
          <p>限制：最多 40 个零件、120 根线，坐标在 -4 到 4 的方格内，每个格子只能放一个零件，并且必须恰好有一个 core。</p>
        </section>

        <section className="docs-sec">
          <h2>评估设计</h2>
          <p><code>POST /api/v1/workshop/evaluate</code> 接收 <code>{"{ level, code }"}</code>，返回每个场景的结果、是否过关、问题、零件数、门数、记忆位和总用时。</p>
          <p>返回中的 <code>isSubmissionReady</code> 为 true 时，设计才可以通过公开设计库发布。</p>
        </section>

        <section className="docs-sec">
          <h2>上链流片资格</h2>
          <p><code>POST /api/v1/workshop/seal</code> 接收 <code>{"{ level, code }"}</code>。它不复制一份编译器，而是复用工坊正式编译结果：感官作为输入，翅膀作为输出，记忆和翻转格的状态作为额外的输入/输出位。</p>
          <p>接口会穷举最多 12 个输入位的每一种组合，并把每个翅膀和下一次状态与游戏大脑逐项比较。只有设计过关、输入位不超限、全量比较一致时，才返回 200 和 <code>eligible: true</code>。</p>
          <p>返回内容包括 TapeOut 十六进制字节、真实 SHA-256、输入/输出含义、状态寄存器映射和核对次数。未通过时返回 422，同时保留完整报告和精确问题码。这个接口只生成可验证证明，不发起钱包签名或 X Layer 交易。</p>
        </section>

        <section className="docs-sec">
          <h2>给 AI Agent 的一条完整路径</h2>
          <p><a className="link" href="/api/v1/workshop/agent">GET /api/v1/workshop/agent</a> 返回 Agent 的任务、步骤、完成条件、限制和交易边界。</p>
          <p><code>POST /api/v1/workshop/agent</code> 接收与 seal 相同的 <code>{"{ level, code }"}</code>，一次返回关卡评分、全量电路证明、TapeOut 字节和分阶段状态。Agent 只有在 <code>evaluation.isSubmissionReady</code> 与 <code>proof.eligible</code> 同时为 true 时才能声称设计已通过。</p>
          <p>返回中的 <code>onchain.ready</code> 为 false，是因为该接口只做证明，不签名、不发交易；X Layer 处理器已经配置。公开设计库发布仍是单独的 <code>/submit</code> 操作。</p>
          <p><a className="link" href="/agents">在 Agent 页面直接运行参考流程</a>，或执行 <code>npm run agent:proof</code>。</p>
        </section>

        <section className="docs-sec">
          <h2>提交设计</h2>
          <p><code>POST /api/v1/workshop/submit</code> 接收 <code>{"{ level, code, name?, parent? }"}</code>。发布成功后返回公开设计 ID、成绩和是否为重复设计。</p>
          <p>公开名称最多 24 字；客户端上报的成绩不会被接受。</p>
        </section>

        <section className="docs-sec">
          <h2>可运行示例</h2>
          <pre><code>{example}</code></pre>
          <p>仓库内还有一个完整示例：<code>npm run agent:workshop</code>。它会发现接口、评估一份参考设计，并可加 <code>-- --submit</code> 提交。</p>
        </section>

        <section className="docs-sec">
          <h2>结果稳定性</h2>
          <p>关卡模拟是确定性的。相同关卡、相同设计和相同引擎版本会产生相同结果。接口版本变化会发布新的 API 版本，不会静默改变旧结果的含义。</p>
          <div className="row">
            <Link className="btn primary" href="/workshop">打开工坊</Link>
            <a className="btn" href="/api/v1/workshop">查看 API JSON</a>
          </div>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}
