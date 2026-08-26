---
title: 第33讲·质量门禁：vitest-evals 轨迹打分
summary: 一个 agent 好不好，不能靠感觉。pi 用 vitest-evals 把编码智能体包成可打分 Harness，让"改一行代码是否变好"变成可重复的实验。
objectives:
  - 说出 pi 如何把 coding-agent 包装成 vitest-evals 的 Harness
  - 解释"轨迹打分"比"单轮问答测试"更适合评测智能体
  - 理解 evalHarnessTable 这种"同题多候选对比"的评测形态
tags: [pi, 评测, vitest-evals, 质量门禁]
keyPoints:
  - "pi 复用 vitest-evals 库（evals/src/pi-harness.ts:25 导入 harness），把 coding-agent 当成被测对象"
  - "createPiCodingAgentHarness（pi-harness.ts:246）把 AgentSession 包成 Harness：输入是 prompt，输出是轨迹/最终文本"
  - "评测单位是'轨迹'而非单轮回答——工具调用、重试、反思全被记录，才能量化 agent 真实能力"
  - "evalHarnessTable（harness-table.ts:157）支持'同一批题、多个候选(模型/提示)对比打分'，用于选优"
  - "PiCodingAgentInput（pi-harness.ts:28）支持 prompt 与 reload 两种输入，可模拟'多轮/恢复会话'场景"
---

前面 32 讲把 pi 拆了个遍，但有个问题一直没回答：**你怎么知道改了一行代码，agent 是变好了还是变烂了？** 靠手感不行，得有客观标尺。这一讲看 pi 的质量门禁——`vitest-evals` 轨迹打分。

## 一、先结论：把 agent 当"被测函数"

pi 的做法很聪明：它不自己造评测框架，而是复用 `vitest-evals`（基于 vitest 的评测库）。看 `packages/evals/src/pi-harness.ts:25`：

```ts
import { ... } from "vitest-evals/harness";   // 复用现成评测引擎
```

然后把自己的 `coding-agent` 包成一个 `Harness`——在 `vitest-evals` 的语境里，Harness 就是"被测系统"的标准封装：给输入、收输出、可被批量跑。

## 二、包装：AgentSession 即 Harness

看 `pi-harness.ts:246`：

```ts
export function createPiCodingAgentHarness(options?): Harness<PiCodingAgentInput, string> {
	// 内部启动一个 AgentSession，把输入 prompt 喂给它，收集轨迹与最终文本
}
```

`Harness<PiCodingAgentInput, string>` 的签名说清了契约：**输入是 `PiCodingAgentInput`，输出是 `string`**。而 `PiCodingAgentInput`（`pi-harness.ts:28`）被定义为：

```ts
type PiCodingAgentInput = string | Array<
	{ type: "prompt"; content: string } | { type: "reload" }
>;
```

这意味着评测不仅能喂"一句话"，还能喂"多轮 prompt + 中途 reload"——**模拟真实使用里的多轮对话与会话恢复**（呼应第 24 讲 SessionManager）。

内部实现（`promptAgent` 在 `:90`、`runPiCodingAgent` 在 `:109`）就是：启动 `AgentSession`（第 39 讲）、把输入逐条 `session.prompt` 进去、等它跑完、把最终文本或整条轨迹交回评测框架。

## 三、为什么评"轨迹"而不是"答案"

普通单元测试问"给输入得输出对不对"。但智能体的价值在**过程**：它调了什么工具、怎么重试、怎么从错误里恢复。pi 的 `PI_SESSION_SNAPSHOT_ARTIFACT`（`:26` 引入）把整段会话快照存成评测产物，于是打分能看：

- 是否用了正确的工具？
- 是否陷入无意义的重试循环？
- 工具失败后是绕过了还是崩了？

> **知识拓展**：这种"评测轨迹（trajectory）"的思路，源自 Agent 评测研究（如 AgentBench、τ-bench）。单轮问答测试会漏掉智能体最关键的"多步决策"能力——pi 把会话快照当 artifact，正是踩在了这个正确方向上。

## 四、同题多候选：evalHarnessTable

更有用的是对比。看 `packages/evals/src/vitest-evals/harness-table.ts:157`：

```ts
export function evalHarnessTable<TInput, TOutput>(options) { ... }
```

`evalHarnessTable` 让你把**同一批评测题**喂给**多个候选**（不同模型、不同系统提示、不同扩展组合），各自打分，排成一张表。这恰好是"选优"的利器：

- 想换模型供应商？跑 table，看哪家在同类任务上分高。
- 想调系统提示？跑 table，量化提示改动的影响。
- 想评估某个扩展？跑 table，确认它没把基线搞坏。

`EVAL_HARNESS_ITERATION_ARTIFACT`（`:10`）等产物类型，保证每次迭代的中间结果可追溯——你能在"哪次改动导致分数掉了"上精准定位。

## 五、和全系列的咬合

回看第 03 讲"自扩展哲学"：pi 越插件化，行为越依赖"装了哪些扩展"。没有评测，插件化就是失控。轨迹打分正是插件化的**刹车**——每次扩展改动，都能用 `vitest-evals` 验证"主干行为没回归"。这和第 43 讲要讲的"测试策略"是一体两面：单测保单元、轨迹评测保智能体整体质量。

## 六、试一试

1. 在 `pi-harness.ts` 里搜 `score` 或 `criteria` 或 `LLMAsJudge`，看 pi 是用"规则打分"还是"LLM 当裁判"来评轨迹（Hint：vitest-evals 常支持 LLM-as-judge）。
2. 打开 `harness-table.ts:157` 的 `evalHarnessTable`，看它的 `options` 要求你提供什么（候选列表？评分函数？题集？）。
3. 思考：如果评测用"LLM 当裁判"，评分本身会带噪声。设计评测时该怎么降低这种噪声？（提示：多次采样取平均、用确定性规则做硬门槛。）

## 下一讲预告

质量门禁讲完，我们转向下一层支撑：会话的持久化与系统的可观测性。下一讲进入 SQLite 会话仓库——看 pi 怎么把"对话历史"存进数据库，而不是一堆散文件。
