# 校准蝇 · FIDELITY PROTOCOL — 设计简报

简报日期 2026-10-17。作者注：本文是 TapeFly（onefly-nu.vercel.app）的下一阶段
产品设计文档。凡是引用外部项目的数字都标注了出处与"自报 / 未复核"状态；
凡是我们没有测过的，一律写明。本页遵守 TapeFly 的诚实传统：**能被复核的才
写进来，其余按传闻处理。**

---

## 0. 一句话

> **果蝇保真度校准协议**：任何人把一个"果蝇决策电路"（netlist）交给公共校准
> 装置，与固定的 MaleCNS 参考脑逐行对比行为吻合度，得到一份**可复核、可上
> 链、三宿主指纹**的 FIDELITY CERTIFICATE。证书不是勋章——证书就是这只蝇
> 在这个生态里的身份。
>
> **为什么是这个：** 现在整个 TapeOut 生态的果蝇角落全部停留在
> "connectome-inspired"三个字的自我叙述上。LoomEscape 自检了 2^23 行，
> NANDFLY 自报 98.9%，TapeFly 自测 4096 词真值表——**三家都做了苦工，但没
> 有任何一家被别人复核过，也没有任何两家共享同一个参考。** 这份苦工如今是
> 同行非互认的孤儿数据。本协议只做一件事：让同一套苦干进入同一张考卷。

---

## 1. 我们研究了什么（证据地图）

本轮调研读过的材料，及各自主张：

| 来源 | 性质 | 关键内容 |
|---|---|---|
| `docs/AGENTS.md`（本项目） | 一手 | Agent 通过 record.json 封印参与，无信任假设 |
| `README.md`（本项目） | 一手 | 8 条反射规则 → 50 NAND netlist，4096 词全测，逐日 hash 链 |
| `app/tapeout/page.tsx` | 一手 | 生态对照表：LoomEscape / FlyOut / BARD / Fruit Fly World |
| Bit.Fan《Inside the TapeOut ecosystem》 | 媒体 | 生态全景：NAND/LATCH 元件层、PoD、$BEM、TapeKit 31 个 DeWEB 站、339 处理器 / 8,524 电路（照抄自社区，未复核） |
| Foresight / Odaily / Panews 生态盘点 | 媒体 | 各家一句话定位与链接 |
| brucelanlan.github.io/c3s-reflex-circuits | 一手 | LoomEscape：173 NAND + 6 LATCH，16 感官位/状态位三方指纹，浏览器 / Cardputer ADV 固件 WASM / 链上 eth_call |
| wetware-labs.github.io/nandfly | 一手 | NANDFLY：661 NAND/LATCH，"98.9% vs LIF（4096 输入位）"（自报） |
| thelearningfly.com/projects/nandfly/ | 一手（评级站） | "Unrated — Nobody has read this one closely enough"（原话） |
| fruitfly.world（/essay, /race, /pitch） | 一手 | FFW-CX/0.1 24 神经元，四种脑 slot，commit-reveal 赛制，LC4 2,442 / LPLC2 1,366 突触（引自 Ache et al. 2019） |
| tapeout.link 新闻流 | 媒体 | BARD 芯片（Joooooo，970k 三值权重 Transformer，v8g 版图）；Behemoth 前史（Blonskr，2000+ 门 4 位 CPU，2.22 Hz） |

引用的两条科学锚点（不是我方测量，是文献字段）：
- **Ache et al. 2019 / MaleCNS v1.0**：Giant Fiber 视觉输入 ≈99.6% 来自
  LC4（角速度）与 LPLC2（looming）。
- **Shiu et al. 2024**：LIF + 连接组 + 递质符号可预测进食/梳理回路（经光
  遗传验证）。这是"参考脑用 LIF 是可以辩护的"这条科学依据的出处。

本文明确**不做**的解释（诚实边界，TapeFly 传统）：
- 不把 TapeFly 50 NAND 说成是 MaleCNS 的忠实转录。它是"行为学规则的最小
  决策层"，不是连接组的转录本。这份不匹配正是本协议要公开测量的东西。
- 不把 TapeOut 的链上 eval 说成"物理流片"。链上 Circuit 是 antimatter 的
  数字孪生，不是硅。硅路线（Tiny Tapeout / wafer.space）在 §8 单列。

---

## 2. 果蝇角落 · 家族树（全部公开工件）

```
               MaleCNS v1.0 (Ache et al. 2019)
        LC4 · 2,442 syn ─┐
                         ├─ 99.6% → Giant Fiber（逃逸命令神经）
        LPLC2 ·1,366 syn ┘
                 │
    ┌────────────┼──────────────┬───────────────┬──────────────┐
    ▼            ▼              ▼               ▼              ▼
LoomEscape   NANDFLY        TapeFly          Fruit Fly      FlyOut
(brucelanlan) (wetware-labs) (本项目)        World          (flyout-  )
173N+6L      661 GATES      50N·0L          FFW-CX/0.1     brain-lab
16 sensory   98.9% vs LIF   4096 词真值表   24 神经元       ·5 脑 slot
三方指纹     (自报·未复核)   逐日 hash 链    commit-reveal  概念验证
─────────────────────────────────────────────────────────────────────
验证上限   2^23 行三宿主   无             浏览器重算      无
(每家)     (自报)                         + Sepolia 种子
```

四个位置各占一角：
- **LoomEscape** 最接近"全校准"。它已经做到：同一 netlist 的字节在三台宿
  主上跑出同一指纹——这是本协议"证书可复核"部分的技术前身，我们承认这是
  站在它肩膀上。
- **NANDFLY** 第一个提出 LIF 参考 + 一致率，但评级站上无人盖章。
- **TapeFly** 第一个把 hash 链做进计时（逐日逐 tick），但基因层面"显式偏
  离了 FFW 遗传学"。校准会给出一个低于满分的分数，**这是它原本就公开承
  认的事**，而证书只是把承认变成盖章。
- **Fruit Fly World** 把"死亡来自环境"演绎最完整，但脑全部链下，自身文
  档承认 grading operator 仍被信任。

---

## 3. 六个痛点（按深度排序，前三个是能收的）

### 痛点 1：领域里没有任何人有可测量的保真度标准
LoomEscape 2^23 行自检（自报）、NANDFLY 98.9%（自报）、TapeFly 4096 词全测
（一手可复核）、Fruit Fly World 论断 death = ground truth——**四家都知
道要做行为一致性，且都做了。** 全领域唯一的外部评级站
（thelearningfly.com）自己声明"没有评分"。这不是"没人做卫生"——而是
"每一家的卫生都自己签发"。产品缺口：一张**共同考卷 + 第三方盖印**。

### 痛点 2：链上运行是"演示池"，不是"生活池"
LoomEscape 的链上样本是 4 行的 eth_call 神迹，TapeFly 的行为完全 off-chain，
NANDfly 无链上路径。**"整个生命（tick 序列 → 感官 word → 门输出 → 行为 →
死亡时刻）的 seal 落链"这件事，果蝇角落零个回答。**

### 痛点 3：全校 UI/UX 失声
整个生态（含 TapeFly 当前版）：暗底 + cyan + 表格 + hash 卡片，读讯者画像
是"工程师"，而非"看着一只蝇长大的人"。从没出现**正在思考的、会被拨动的
活生命图**。（TapeFly 的 DishCanvas 已是全校最接近的，但仍是 HUD 仪表风。
不是不可救——是只有一个方向没人选：**白纸·器官·可交互**，见 §9。）

### 痛点 4：TapeOut 经济层奖励 hashpower，不奖励 faithful
PoD 矿机的权重函数里没有任何一项是"对果蝇的忠实度"。"更活、更像 MaleCNS
的电路"在生态里没有稀缺价值。这是本协议挂进生态的位置。

### 痛点 5：证书不存在
领域内有 $BEM（资产）、有 Circuit NFT（编码）、有 TapeKit DeWEB（前端），
**没有一个"这只 circuit 在科学上路过考卷"的凭证**。评级站存在但无章、
无链、无跨项目一票。

### 痛点 6：生态名字挤占
"TapeOut"的过程已与半导体 tapeout 同名异义。（§8 里把这些列清楚，不混谈。）

---

## 4. FIDELITY PROTOCOL — 机制说明（四步走）

### 4.1 参考脑 `reference`
固定一个 **FLY-LIF/1**（ MaleCNS 约束的 leaky-integrate Giant Fiber 模块）
公开版本。参数从文献可投稿（LC4 / LPLC2 突触拓扑 + Shiu 2024 LIF 常数），
我们自己**不发明任何生物学数字**。版本号 + 内容哈希进每个证书。

### 4.2 校准集 `suite`
- **t1 · 全行**（对无 latch 纯决策层）：全部 4096 感官 word × 全部前置
  behaviour word（TapeFly 的 12 位编码确立，仍可沿用为 word 布局）。
- **t2 · 常态轨迹**（有 latch 的电路）：标准 400-tick 播放序列×若干种子。
- **t3 · looming 库**（逃逸弧专项，可选进阶）：方向/角速度/尺寸扫描，
  与 MaleCNS 的 LC4/LPLC2 输入特征对齐。

### 4.3 指纹与证书 `certificate`
沿用 TapeFly `record` 的格式（stableStringify seal，键序无关）：

```json
{
  "v": "FLY-FIDELITY/1",
  "circuit": { "name": "FFW-NAND/1", "nIn": 12, "nOut": 3, …,
               "netlist_sha256": "…" },
  "reference": { "name": "FLY-LIF/1", "sha256": "…" },
  "suite":    { "marks": "t1", "n_rows": 16384, "sha256": "…" },
  "result":   { "agreement": 0.939, "gf_recall": 1.0, "gf_latency_e95": …,
                "false_escapePragma": … },
  "hosts":    ["browser(Gold)", "node(eth_call)", "wasm(Cardputer)"],
  "seal":     "sha256(canonical json, seal omitted)"
}
```

证书三级：**种子（数据）**（browser only）→ **三宿主盖章**（≥2 宿主复核
一致）→ **链上盖章**（seal 已入 TapeOut 容器 / 链上事件，路径见 §4.5）。

### 4.4 链上锚定路径（最小风险版）
**不发明新链**。复用 LoomEscape 已示范的 eth_call + state override 模式：
TapeOut eval() 是**读**操作，不给链增重；把证书 seal（32 bytes）写入链上
事件是**读写分离**的（写的是 hash，不是重量）。gas 到底多少钱，走通一遍
再填数字，不预估。

> 与生态的接口：证书不覆盖 PoD，也不改玩家经济。它就是生态好奇心的第五
> 列——矿机还有金身，果蝇也可以有金身（正度证书）。以后 PoD 想引用这一
> 列是它的事。

### 4.5 反滥用
- **协议**面向"电路判决文档"，不面向"一点假设计算机攻击"：seal 结果锁
  进指纹，改引用版本 = 新证书。
- **没有一个可选行为叫"买证书"**——整条链路是可运行脚本，rerun 免费。

---

## 5. 第一个测试者（我们自己）

证书的第一份样本是 **FFW-NAND/1（TapeFly 自己的 50 NAND 决策层）**。
预期结果他有义务先接受：它**不是**连接组转录，对 MaleCNS LIF 参考的可能
吻合度是中档（GF 逃逸弧可能贴得上——TapeFly 的 rule #1 就是专门把 Giant
Fibre 单独编的——但 feed / pursue / curious 弧的吻合度没有理由高）。我们
**承诺不在不知道数字之前写 landing page。**

---

## 6. UI/UX 新方向（白纸 · 器官 · 可交互）

现状（全校都这样）：暗底 cyan、havoc card、mono 表格。**一切都不动 sim，
只动壳**，方向三条原则：

1. **白纸底。** 全生态都黑，我们冷白——（示例参照 fruitfly.world 的 essay
   页已部分这么做，可引用它作先例，不是孤注）。
2. **器官可视化。** 50 NAND 门不当卡片，当**一张可拨活电路图**：点击门
   → 电平传闻迸出实时发光；感官 word 从外在（键盘/滑杆）驱动；同屏**第二
   传输线** 显示 MaleCNS 参考脑在同样输入下的动作（TCALIBRATION VIEW）——
   与"默认脑"并排 decide，不一致的那一行闪烁。
3. **校准实验室 / 新生命周期**（候选 `app/calibrate/page.tsx`）：
   - 左：你**提交的 netlist**（可粘贴 / 可挑 TapeFly 自有）
   - 中：正在跑的 t1 考卷，行流滑过（像 lint，比比看 bf index）
   - 右：结果仪表——agreement 大数字 + 三宿主盖章序列 + seal
   - 底：**下发/分享/嵌入**（校准是完全公开的：任何人能 rerun，cur 命令
     直接 Print seale）。

---

## 7. 路线图（三阶段）

### 阶段 C（本报告，已完成）
生态研究 + 协议设计 + 诚实边界文档。

### 阶段 B：校准实验室 (calibration lab) 的活壳
- 纯 TS、纯前端、零外部依赖：把 TapeFly `sim/` 的 4096 word 真值设备接入
  新页面，加方向 §6。
- 无链。seal 只是本地 SHA-256，与 TapeFly record 同款。
- 里程碑：任何人打开浏览器，30 秒内看到第一份**种子级**证书。

### 阶段 A：链上盖章
- 路径请看 §4.4：LoomEscape 式 eth_call（读）+ 一个事件（写）。
- 里程碑：`npx tsx scripts/calibrate.ts --out cert.json` 读出三宿主一致
  的 FLY-FIDELITY/1，且链上能找到事件。

### 阶段 D（可选·写文献级）
- 药物录入：**果蝇标准参考 data set**的成长与她人的接入；管理系统文档
  的清共无静默（与 thelearningfly 不同：我们不拟人评级，我们将直接写
  数字到链上）。

---

## 8. 辞典 · 不要混淆的四个 "tapeout"

| 名字 | 含义 | 我们这里的处理 |
|---|---|---|
| semiconductor tapeout | GDS 交给代工厂的物理工序（MPW / Tiny Tapeout / wafer.space / Efabless 已在 2025-02 关停） | **§A / 阶段 D 的远期硅路径**，不在本协议；不在宣传页说"我们的tapeout" |
| TapeOut（协议，BSL） | NAND/LATCH 元件 + Circuit NFT + PoD + $BEM | **生态辩论对象**；锚定路径之一（eval） |
| TapeFly `/tapeout` 页 | 本项目"电路的诚实状态"页 | **建议本期改名为 `/circuit`** 或 `taped-out: no` 显式矛盾（副确定）—— 一字不改地往 §7 B 挑下 |
| "tapeout"（果蝇角落对谁的 endorsing） | LoomEscape 家族 XOR 深忆·自开放式生态 | 欢迎同标 |

---

## 9. 风险与明面债（写明不做也行，但写在明面）

1. **MaleCNS 授权与注册名引用**：无论 FLY-LIF/1 的参数还是 LC4/LPLC2 数字
   都是从文献字段来的，论文出处按学术.OrderBy 引在 cert 里，不动发明权。
2. **TapeOut 生态也是 2 个月龄**：28% 的链接已 404 或换域名。§4.4 链路径
   把 LoomEscape 的模式选为第一选项，**不是**因为它是最好，而是因为它不是
   marketing。
3. **我们只测对抗 LIF 参考，不测"跟真蝇一样"**：这是**consistency 的保真**，
   不解释为科学级 "brain fidelity"。此项在证书文本里明写，不做 hero 数字。
4. **TapeFly 自己可能得分不好看**：可能。这人也是营销的一个部分——本协议
   提出者的第一个证书就是 Lydia 测试（参考都常烂，certificate 敢扔自家）。
   landing page 若数字不好看，就按 §5 那句写下去。
5. **参考的作者和被测电路的作者重合**（2026-10-18 追加）：`FLY-LIF/0` 是
   独立写的代码，不是独立的作者。§11 的 0.8530 在外部网表进场之前，只能按
   "自家对自家的距离"引用，不能按"第三方审计"引用。成年礼 = 第一个外来
   网表（候选：NANDFLY / FFW-CX/0.1）跑同一张考卷。

---

## 10. 结语

TapeOut 生态里所有人在竞争"谁的电路跑得快、谁的挖矿白与值"。果蝇角落里
所有人在竞争"我家这个像真果蝇。" **两边都没有人真正负责"什么算是像"。**
这份工作现在没有人做，而且做完的人不需要发币、不需要买用户、不需要讲故
事——因为证书替它讲故事。TapeFly 的全部现有资产（4096 词真值表、record
seal 三方模式、lineage 谱、verify 页）都能直接转做这张考卷的考桌。

> 生态里第一个自己吃一口的，就是协议本身的第一号证书。

---

## 11. 首批结果（2026-10-18，`npm run calibrate`）

§5 的承诺先兑现了再写这一节：**数字先于任何界面存在。**

**跑的事实**
- 考卷 `t1-full`：全部 4096 个 12-bit 输入词
- 电路 `FFW-NAND/1`（50 NAND，0 latch，netlist `c1d4142a…`）vs 参考 `FLY-LIF/0`
  （draft，参数在 `sim/reference.ts` 冻结）
- 证书：`calibration/ffw-nand-1.json`，seal
  `0c24da2421f0a33a…`，任何人 `npx tsx scripts/calibrate.ts` 可复算
- 测试 45 全绿（新增 7 个钉死参考脑的语义），`npm run check` 全链路通过

**总分（是距离，不是等级）**

| 指标 | 数 |
|---|---|
| agreement | **0.8530**（3494 / 4096） |
| 分歧行 | 602，每一行都挂着"哪条规则决定的"和"哪个参考驱动决定的" |
| GF recall | 1.0000（逃逸弧 2048 行全对） |
| GF precision | 1.0000（0 次误触发） |

**分歧行的解剖（这才是数字的意义）**

| 分歧类 | 行数 | 读法 |
|---|---|---|
| wind vs danger（384/1024） | 饥饿的蝇该不该冒险 | TapeFly 规则 2 的"brave"豁免（h≥2 不躲 t=1 的威胁）；参考无状态全躲。1024−640=384 精确对上豁免窗口 |
| pursue（48/64，最分歧） | 追逐要不要饥饿条件 | TapeFly 硬连 f≥2 即追；参考要 f+h≥4。冷启动词 002（f=2,p=approach,h=0）就是它 |
| lure（112/240） | 饱蝇面对富食 | f=3,h=0：TapeFly 逼近（lure），参考不动（f+h=3<4） |
| curious（36/240） | 暗处的新鲜气味 | TapeFly 不看光；参考要求 light≥1 |
| rest/default（118/588） | 暗处冻结的阈值形状 | 两家同向，阈值差一档 |

**两条必须写死的诚实**
1. **escape 0 分歧不是发现，是体检。** TapeFly 规则 1 和参考的 gf 驱动出自同一句文献（"接触前起跳"）。1.0000 的 recall 证明的是两家共享出处，不是电路复刻了连接组——这句话在证书的 `note` 里，也在 §9.3。
2. **参考的作者和电路的作者是同一个人。** `sim/reference.ts` 是独立写的代码，不是独立的作者。真第三方检验发生在**外部网表**第一次进场那天：邀请 NANDFLY（661 门，仓库已公开）或 FFW-CX/0.1 来跑同一张考卷，那是协议的成年礼。

**这一节改变了简报什么**
- §7 的阶段 A 里"本地盖章"这半截做完了；剩下的是链上盖章（eth_call 路径）和校准实验室外壳（阶段 B 的界面）。
- §9 增加第 5 条：参考作者重合是当前协议最大的同源偏差，成年礼前所有数字按"自家对自家"引用。
