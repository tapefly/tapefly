import Link from "next/link";
import { SiteNav, SiteFooter } from "@/app/components/ui/Shell";
import HexView from "@/app/components/ui/HexView";
import { BRAIN } from "@/sim/netlist";
import { netlistBytes, bytesLength } from "@/sim/tapeout";
import { netDepth, cost } from "@/sim/compile";
import config from "@/config/tapeout.json";
import TapeoutPanel from "./TapeoutPanel";
import { serverT } from "../i18n/server";

/* What the brain is in TapeOut's terms, a panel to tape one out, and — plainly — how far the official brain has got. */

export function generateMetadata() {
  const t = serverT();
  return {
    title: t("上链 — TapeFly", "On TapeOut — TapeFly"),
    description: t("TapeFly 的大脑就是 TapeOut 电路：NAND 门，流片在 BNB Chain 上。", "TapeFly brains are TapeOut circuits: NAND gates, taped out on BNB Chain.")
  };
}

export default function TapeOutPage() {
  const t = serverT();
  const live = config.status === "live";
  const steps: [string, string, boolean][] = [
    [t("把规则编译成 NAND 门", "Compile the rules to NAND gates"), t("50 个门，9 层深，在全部 4,096 种输入上和规则逐一对过。", "50 gates, 9 deep, tested against the rules on all 4,096 inputs."), true],
    [t("写成字节", "Write the bytes"), t(`${bytesLength(BRAIN)} 字节，TapeOut 的记录格式；SHA-256 ${config.bytesSha256.slice(0, 12)}…`, `${bytesLength(BRAIN)} bytes in TapeOut's record format; SHA-256 ${config.bytesSha256.slice(0, 12)}…`), true],
    [t("买 NAND 晶体管并调用 tapeout()", "Buy NAND transistors and call tapeout()"), t("tapeout(bytes, 12, 3) 会烧掉晶体管并铸造电路。", "tapeout(bytes, 12, 3) burns the transistors and mints the circuit."), !!config.circuitId],
    [t("在链上核对每一个答案", "Check every answer on chain"), t("eval() 是免费的只读调用；把 4,096 个问题全问一遍并比对。", "eval() is a free read-only call; all 4,096 questions are asked and compared."), live],
    [t("让网站指向它", "Point the site at it"), t("config/tapeout.json 填上处理器和电路编号，网站就开始在链上抽查。", "config/tapeout.json gets the processor and circuit id, and the site starts spot-checking ticks on chain."), live]
  ];

  return (
    <main>
      <SiteNav here="/tapeout" />
      <div className="page">
        <header className="page-head">
          <p className={`status-pill ${live ? "live" : ""}`}>{live ? t("已上链", "Live on chain") : t("链上状态未同步", "On-chain status not synced")}</p>
          <h1>{t("TapeFly 建立在 TapeOut 之上", "TapeFly is built on TapeOut")}</h1>
          <p>
            {t("TapeOut 是 BNB Chain 上的一个协议，大家用 NAND 门搭电路，再把电路放上链。TapeFly 的每一颗大脑就是这样一个电路。下面是一分钟看懂 TapeOut、它对你的果蝇意味着什么，以及亲手流片的面板。",
               "TapeOut is a protocol on BNB Chain where people build circuits out of NAND gates and put them on chain. A TapeFly brain is exactly such a circuit. Here is TapeOut in one minute, what it means for your fly, and a panel to tape one out yourself.")}
          </p>
        </header>

        <section className="to-explain" aria-label={t("一分钟看懂 TapeOut", "TapeOut in one minute")}>
          <div><b>{t("NAND 门就是代币", "NAND gates are tokens")}</b><p>{t("NAND 门只有在两个输入都是 1 时才输出 0。任何计算都能用它搭出来。在 TapeOut 上，每个门是一个晶体管代币，在处理器上购买。", "A NAND gate outputs 0 only when both inputs are 1. Any computation can be built from it. On TapeOut each gate is a transistor token, bought on a processor.")}</p></div>
          <div><b>{t("流片 = 把电路放上链", "Taping out puts a circuit on chain")}</b><p>{t("设计是免费的。流片会烧掉电路用到的门代币，把电路永久存到链上，之后谁都改不了。", "Designing is free. Taping out burns the gate tokens your circuit uses and stores the circuit on chain for good. It can never be edited.")}</p></div>
          <div><b>{t("你得到一个电路 NFT", "You get a circuit NFT")}</b><p>{t("流片会铸造一个 NFT，证明这个电路归你。电路 NFT 可以在 TapeOut 的市场上买卖。", "The tape-out mints an NFT that says the circuit is yours. Circuit NFTs are bought and sold on TapeOut’s market.")}</p></div>
          <div><b>{t("任何人都能向它提问", "Anyone can ask it questions")}</b><p>{t("上链的电路可以通过免费的只读调用回答任何输入，所以谁都能自己验证它在做什么，不用相信任何人。", "A taped-out circuit answers inputs through a free, read-only call, so anyone can check what it does without trusting anybody.")}</p></div>
        </section>

        <div className="panel to-yours">
          <h2>{t("这对你的果蝇意味着什么", "What it means for your fly")}</h2>
          <ol className="checklist">
            <li className="done"><i aria-hidden>✓</i><div><b>{t("你的本能已经是一个电路", "Your instincts are already a circuit")}</b><p>{t("首页的开关会按 TapeOut 自己的格式编译成 NAND 门。你在那里看到的门数，就是流片要烧掉的晶体管数。", "The switches on the home page compile to NAND gates in TapeOut’s own format. The gate count you see there is the number of transistors a tape-out would burn.")}</p></div></li>
            <li><i aria-hidden>2</i><div><b>{t("用你自己的钱包流片", "Tape it out, from your own wallet")}</b><p>{t("用下面的面板：连接钱包，买够大脑需要的 NAND，流片。网站随后会向新电路问全部 4,096 个问题，证明它就是你的大脑。", "Use the panel below: connect a wallet, buy the NAND your brain needs, tape it out. The site then asks the new circuit all 4,096 questions to prove it is your brain.")}</p></div></li>
            <li><i aria-hidden>3</i><div><b>{t("每周冠军上链", "The weekly champion goes on chain")}</b><p>{t("第一次流片已经核对通过。第一季竞技场开赛后，每周冠军的大脑由 TapeFly 流片，电路 NFT 送给冠军。", "The first tape-out has been verified. Once the first arena season opens, each week’s champion brain is taped out by TapeFly and its circuit NFT sent to the winner.")}</p></div></li>
          </ol>
          <div className="row" style={{ marginTop: 16 }}>
            <Link className="btn primary" href="/">{t("造一颗大脑", "Build a brain")}</Link>
            <a className="btn" href="#tape-out">{t("现在流片", "Tape out now")}</a>
          </div>
        </div>

        <TapeoutPanel tapeflyProcessor={config.tapeflyProcessor} />

        <h2 className="to-official">{t(`官方大脑：${bytesLength(BRAIN)} 字节`, `The official brain: ${bytesLength(BRAIN)} bytes`)}</h2>
        <div className="stats">
          <div className="stat"><b>{BRAIN.gates.length}</b><span>{t("个 NAND 门，没有记忆单元", "NAND gates, no memory cells")}</span></div>
          <div className="stat"><b>{netDepth(BRAIN)}</b><span>{t("层深", "gates deep")}</span></div>
          <div className="stat"><b>12 → 3</b><span>{t("输入位 → 输出位", "input bits to output bits")}</span></div>
          <div className="stat"><b>{cost(BRAIN).toLocaleString()}</b><span>{t("排名成本，门数 × 层数³", "ranking cost, gates × depth³")}</span></div>
        </div>

        <div className="panel" id="bytes">
          <h2>{t("字节", "The bytes")}</h2>
          <p>{t(<>每条记录是一个 NAND：操作码 <code>00</code>，接着是它读取的两个信号。信号 0 和 1 是常量，2 到 13 是果蝇的 12 个输入位，每个门再新增一个信号。最后三个门就是答案。</>,
                <>Each record is a NAND: opcode <code>00</code>, then the two signals it reads. Signals 0 and 1 are constants, 2 to 13 are the fly&rsquo;s 12 input bits, and each gate adds one more. The last three gates are the answer.</>)}</p>
          <div style={{ marginTop: 16 }}><HexView hex={netlistBytes(BRAIN)} /></div>
        </div>

        <div className="panel">
          <h2>{t("从电路到上链", "From netlist to chain")}</h2>
          <ol className="checklist">
            {steps.map(([title, d, done], i) => (
              <li key={title} className={done ? "done" : ""}>
                <i aria-hidden>{done ? "✓" : i + 1}</i>
                <div><b>{title}</b><p>{d}</p></div>
              </li>
            ))}
          </ol>
          <pre className="cmd" style={{ marginTop: 16 }}>{`npm run tapeout -- bytes                                  # ${t("准确的调用参数", "the exact call arguments")}
npm run tapeout -- verify --processor 0x… --id <circuit>  # ${t("全部 4,096 个答案逐一比对", "all 4,096 answers, compared")}`}</pre>
        </div>

        <div className="two" style={{ marginTop: 16 }}>
          <div className="panel">
            <h2>{t("为什么这颗大脑适合上链", "Why this brain belongs there")}</h2>
            <p>{t("果蝇的每一个决定，就是向电路提一个问题：12 位输入，3 位输出。电路上链之后，任何一天的任何一步，任何人都能免费核对，因为 eval 是只读的。", "Every decision a fly makes is one question to the circuit: twelve bits in, three out. Once the circuit is on chain, any tick of any day can be checked against it by anyone, at no cost, because eval is read-only.")}</p>
            <p>{t(<>玩家的大脑也是电路。在<Link className="link" href="/build">大脑编辑器</Link>里做的任何大脑，都能用上面的面板按同样格式流片。</>,
                  <>Player brains are circuits too. Anything built in the <Link className="link" href="/build">brain editor</Link> can be taped out with the panel above, in the same format.</>)}</p>
          </div>
          <div className="panel">
            <h2>{t("如实说明", "The honest state")}</h2>
            <p>
              {live
                ? t(<>官方大脑已上链：处理器 <code>{String(config.processor)}</code>，电路 #{String(config.circuitId)}。全部 4,096 个答案与链上电路一致，<a className="link" href={`https://bscscan.com/tx/${String(config.txHash)}`} target="_blank" rel="noreferrer">查看流片交易</a>。</>, <>The official brain is live on chain: processor <code>{String(config.processor)}</code>, circuit #{String(config.circuitId)}. All 4,096 answers match the on-chain circuit. <a className="link" href={`https://bscscan.com/tx/${String(config.txHash)}`} target="_blank" rel="noreferrer">See the tape-out transaction</a>.</>)
                : t("链上状态还没有同步到网站配置；请以流片面板和链上核对结果为准。", "The on-chain status has not been synced to the site configuration yet; use the tape-out panel and on-chain verification as the source of truth.")}
            </p>
            <p>{t("TapeFly 的第一次流片已经完成并核对通过。流片面板会在每次新流片后向链上电路问完全部 4,096 个问题，并核对链上保存的字节。", "TapeFly’s first tape-out is complete and verified. After every new tape-out, the panel asks the on-chain circuit all 4,096 questions and checks the stored bytes.")}</p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
