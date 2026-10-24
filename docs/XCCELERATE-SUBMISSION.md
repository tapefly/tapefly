# OKX Xccelerate — TapeFly submission copy

Prepared: 24 October 2026

## Form fields

| Field | Value |
| --- | --- |
| Full Name | Richard |
| Nationality | `[TO FILL]` |
| Team name | TapeFly |
| Telegram handle | `[TO FILL]` |
| Team contact email | `ritsuyan4763@gmail.com` |
| Team size | 2, confirm before submission |
| GitHub repository | <https://github.com/tapefly/tapefly> |
| Demo video | <https://tapefly.xyz/tapefly-demo.mp4> |

## Team background — English

```text
TapeFly is an independent team focused on turning opaque on-chain circuits into consumer products people can understand, play and verify. The team owns product design, Next.js and TypeScript engineering, deterministic simulation, NAND circuit compilation, automated testing, on-chain verification and production deployment.

TapeFly is founded by Richard, a previous second-prize winner in an X Layer hackathon. The team continued shipping after the event and now operates a live consumer product, a complete NAND compiler, exhaustive verification tools and an open-source repository.

TapeFly is already live at tapefly.xyz with a Chinese-first bilingual interface. Players can watch a deterministic daily fly world, adjust instincts, write rules, compile a NAND brain, challenge friends and compare results on a weekly season board.

Our official brain uses 50 NAND gates with 12 inputs and 3 outputs. It is already taped out as TapeOut Circuit #1 on the TapeFly processor. The on-chain netlist exactly matches the committed 350-byte source, and TapeOut's free read-only eval function returns the same output as the local simulation for all 4,096 possible inputs.

The source is MIT licensed, with 95/95 tests passing and both GitHub CI and CodeQL green. The production dependency audit reports zero advisories. We want verification to be part of the product experience: players can see why a character made a decision, developers can rerun the complete test suite, and anyone can verify the deployed circuit through a public RPC.

For Xccelerate, we are extending this proven loop to X Layer: taping out the brain there, using public X Layer block data as the daily world seed, and operating one free arena shared by human- and AI-designed brains.
```

## Team background — 中文

```text
TapeFly 是一个独立团队，专注于把难以理解的链上电路变成普通人愿意玩、能够验证的消费级产品。团队负责产品设计、Next.js 与 TypeScript 工程、确定性模拟、NAND 电路编译、自动化测试、链上验证和生产部署。

TapeFly 由 Richard 创立。Richard 曾在 X Layer 黑客松获得二等奖，并且在比赛之后继续把项目做成真实上线产品，完成了 NAND 编译器、全量验证工具和开源仓库。

TapeFly 已经上线，网址是 tapefly.xyz。官网使用中文优先的双语界面：玩家可以观看每天固定的果蝇世界，调整本能、编写规则、编译自己的 NAND 大脑、和朋友对战，并查看每周赛季排行榜。

我们的官方大脑由 50 个 NAND 门组成，输入为 12 位、输出为 3 位。它已经在 TapeFly 处理器上流片为 TapeOut Circuit #1。链上保存的网表与仓库提交的 350 字节完全一致，TapeOut 免费的 eval 只读调用在全部 4,096 种可能输入上都返回了与本地模拟相同的结果。

项目采用 MIT 开源许可，当前测试为 95/95 通过，GitHub CI 与 CodeQL 均通过，生产依赖审计为 0 个漏洞。我们希望验证不只停留在技术演示：玩家能够看到角色为什么做出某个决定，开发者能够重新运行全部检查，任何人都能连接 RPC 自行验证链上电路。

在 Xccelerate 中，我们计划把这套已经验证过的产品能力扩展到 X Layer，包括在 X Layer 上流片大脑、使用 X Layer 公开区块数据生成每日世界种子，以及为玩家和 AI 智能体提供同一套免费的竞技场。
```

## Elevator pitch — English

```text
TapeFly is a verifiable behavior game built on TapeOut, founded by Richard after his previous second-prize win in an X Layer hackathon.

Today, on-chain AI agents and game characters are still mostly black boxes: users see an action but cannot determine why the deployed system chose it. TapeOut makes circuits permanent and recomputable, but designing and understanding those circuits still requires specialist knowledge. TapeFly connects the two by turning a complete decision layer into a playable character.

We begin with a fruit fly. Six senses — food, threat, light, novelty, hunger and the previous move — become a 12-bit input. A 50-gate NAND circuit returns a move and an escape reflex. The day is deterministic: the same date produces the same world, transcript and hash on every machine. Because there are exactly 4,096 possible inputs, anyone can verify the complete truth table.

The official brain is already live as TapeOut Circuit #1. The on-chain netlist matches the public 350-byte source, and all 4,096 free read-only eval results matched the local simulation. The product is live, the source is MIT licensed, and the repository has 95 passing tests, green CI and CodeQL, and zero npm audit advisories.

The player experience is deliberately simple. A player flips four instincts or writes readable rules; TapeFly compiles them into NAND gates, checks every possible input and turns the result into a character that can be replayed, shared and challenged. Players can watch a day, build a brain, race a friend, compare results on a weekly season board and optionally tape out a circuit they own. Play and verification remain free. There is no betting, yield promise or pay-to-win mechanic.

Our long-term vision is a public arena for verifiable behavior where humans and AI agents design small inspectable brains that can be tested, compared, recombined and owned. TapeFly starts with reflexes because they are small enough to check completely. The same primitive can later expand to more senses, actions, species, memory and composable circuits.

For Xccelerate, we are bringing this loop to X Layer. We will tape out the fly brain on X Layer, use public X Layer block data as the daily world seed, expose the same open agent API, and operate one free arena for human- and AI-designed brains. TapeOut provides permanent recomputable hardware; TapeFly provides the consumer game and proof experience around it.
```

## Elevator pitch — 中文

```text
TapeFly 是一个建立在 TapeOut 上、能够完整复盘角色行为的游戏，由 Richard 创立。Richard 曾在 X Layer 黑客松获得二等奖。

今天，大多数链上 AI 智能体和游戏角色仍然是黑盒。用户只能看到结果，却无法知道已经部署的系统为什么做出这个决定。另一方面，TapeOut 让电路可以永久保存、免费复算，但普通人读不懂电路，也不会为了一个技术演示专门学习 NAND 门。TapeFly 要做的，就是把这两端连接起来：把完整的决策层变成一只有名字、能玩、能验证的果蝇。

我们从果蝇开始。食物、危险、光线、新奇度、饥饿和上一步行为这六种感觉组成 12 位输入；一个 50 门的 NAND 电路返回移动方向和逃逸反射。每天的世界完全确定：同一个日期，在任何机器上都会得到同一个培养皿、同一份行动记录和同一个哈希。输入空间只有 4,096 种情况，因此玩家和评审不需要抽查几个样本，可以直接检查完整真值表。

官方大脑已经作为 TapeOut Circuit #1 真实流片。链上保存的 350 字节网表与公开源码完全一致，全部 4,096 次免费 eval 只读调用也与本地模拟逐一相同。产品已经上线，源码采用 MIT 许可，仓库当前通过 95 项测试，CI 和 CodeQL 均为绿色，生产依赖审计为 0 个漏洞。

玩家入口保持简单。玩家不需要学习芯片设计，只要拨动四个本能开关，或者写几行能够看懂的规则。TapeFly 会把规则编译成 NAND 门，在全部输入上自动检查，再把它变成一只有名字、能重放、能分享、能对战的果蝇。玩家可以观察每天的世界、设计大脑、挑战朋友、参加每周赛季，并选择用自己的钱包把大脑流片成一颗真正拥有的电路 NFT。游戏和验证保持免费，不做下注、不承诺收益、不设置付费获胜。

我们的长期愿景不只是一只果蝇。TapeFly 想成为“可验证行为”的公共竞技场：人类和 AI 智能体都能设计小型、可检查、可比较、可组合、可拥有的行为大脑。果蝇反射只是一个合适的起点，因为它足够小，能够把每一种可能都完整证明。未来可以扩展更多感觉、更多动作、不同物种、记忆和电路组合。

在 Xccelerate 中，我们计划把这套闭环带到 X Layer：在 X Layer 上流片果蝇大脑，使用公开的 X Layer 区块数据生成每天的世界种子，开放同一套智能体 API，并举办一个免费竞技场，让人类设计和 AI 设计的果蝇大脑同场比较。TapeOut 提供永久、可复算的链上硬件；TapeFly 提供面向普通用户的产品体验和验证入口。
```

## Short bilingual version

Use only if the form has a strict character limit.

```text
TapeFly 由 Richard 创立，Richard 曾在 X Layer 黑客松获得二等奖。TapeFly 把 NAND 电路变成可玩果蝇。官方大脑只有 50 个 NAND 门、12 位输入和 3 位输出，全部 4,096 种决策都可以在 TapeOut 上免费复算。官方大脑已流片为 TapeOut Circuit #1，链上网表、350 字节源文件和全部答案均已验证一致。玩家可以免费观察、设计、对战和参加赛季，再选择是否把大脑流片成自己拥有的电路。

TapeFly is a playable fruit fly whose entire decision layer is a 50-gate NAND circuit, founded by Richard after his previous X Layer hackathon second-prize win. All 4,096 possible decisions can be verified. The official brain is live as TapeOut Circuit #1 with matching bytes and complete eval results. Players can watch, build, race and join weekly seasons for free, then optionally own their circuit.

TapeOut provides permanent recomputable hardware; TapeFly provides the consumer game, compiler and proof experience. For Xccelerate, we will bring the same verified loop to X Layer using real TapeOut circuits, public X Layer block data, an open agent API and one free arena for human- and AI-designed brains.
```

## Submission links

```text
GitHub:
https://github.com/tapefly/tapefly

Organization:
https://github.com/tapefly

Live product:
https://tapefly.xyz

Circuit #1 proof:
https://tapefly.xyz/tapeout

Release:
https://github.com/tapefly/tapefly/releases/tag/v0.1.0
```

## Before submitting

- Fill nationality and Telegram handle.
- Confirm whether the team has two people.
- The one-minute-fifty-eight-second demo uses Chinese narration and is recorded from [DEMO.md](./DEMO.md).
- Verify the hosted video opens without permission and remains below three minutes.
- Do not describe X Layer as live before its processor, circuit ID, transaction
  and exhaustive verification are public.
