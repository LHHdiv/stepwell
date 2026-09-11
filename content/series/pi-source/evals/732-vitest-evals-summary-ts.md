---
title: "07 · vitest-evals/summary.ts — pass-rate lift 和配对 delta"
summary: "这是评测「有没有变好」的算术，不是模型调用。读完应能指出：什么叫 eligible pair、score≥1 才算 pass、token/latency/cost 为何要求双方都是 scored、diagnostics 有哪些 reas"
tags: [pi, evals]
---
源码：`packages/evals/src/vitest-evals/summary.ts`  
核心导出：`summarizeHarnessComparisons`、`formatHarnessComparisonReport`  
被谁调用：`EvalHarnessReporter.onTestRunEnd`。

## 本课目标

这是评测「有没有变好」的算术，不是模型调用。读完应能指出：什么叫 eligible pair、score≥1 才算 pass、token/latency/cost 为何要求双方都是 scored、diagnostics 有哪些 reason。

## 观察值

reporter 把每条测试收成 `HarnessObservation`：evalSet/groupKey/harness/baseline/candidates/repetition，可选 totalTokens/totalMs/estimatedCostUsd，以及 outcome：

- `scored` + score
- `unscored`（过了但没 judge 分）
- `errored` / `skipped` / `pending`

`extensions.eval.ts` 设了 judge 且 `judgeThreshold: null`，所以 vitest 状态 passed 仍有 avgScore，outcome 是 scored。

## 分组

按 evalSet 聚合。baseline 名取观察里的 `observation.baseline`（表生成时写死）。candidates 按表里的 index 排序。group 的 map 键是 `JSON.stringify([file, testName, groupKey])`——同一 evalSet 里不同测试文件不会误配对。

## diagnostics

每个 group × 每个 harness：

- 0 条观察 → `missing-observation`
- \>1 条 → `duplicate-observation`
- errored → `harness-error`
- unscored → `missing-score`
- 其它非 scored → `unscorable-outcome`

这些行出现在报表底部黄色 “Incomplete observations”。**不**从 comparisons 里删掉整个 evalSet。

## 配对统计

`pairObservations`：双方都恰好 1 条观察才成 pair（哪怕是 errored）。然后：

**correctness**：只统计双方都 `scored` 的 pair。pass = `score >= 1`。lift = candidatePassRate - baselinePassRate（`toPrecision(15)` 再 Number，减轻 0.1-0.2 那种二进制毛刺）。另计 wins/ties。

**token / ms / cost**：同样要求双方 scored，且该度量是有限数。meanDelta = candidateMean - baselineMean。缺测度量 → eligiblePairs 少，报表标 unavailable 或灰色覆盖率 `(n/m pairs)`。

`totalPairs` 是 group 数（该 candidate 比较的分母），不是 eligible。coverage 让你看见「5 次重复只有 3 次双方都打了分」。

## `formatHarnessComparisonReport`

没有 comparisons 则返回 `""`（reporter 不打印空块）。有则 bold 标题，每个 evalSet 下列 Baseline / Candidate / Pass rate（pp）/ Tokens / Latency / Est. cost。正 lift 绿色（正确率越高越好），token/latency/cost 的正 delta 红色（越低越好）。`styleText` 来自 `node:util`。

## 失败与边界

- 不把 diagnostics 当 vitest fail。比较是观察。
- 多个 candidate 各自只对 baseline，candidate 之间不算。
- `preciseDifference` 处理 0.1+0.2。不要自己用原始浮点比相等。

## 下一课

把上述东西接到 vitest reporter：[08-vitest-evals.reporter.ts.md](/series/pi-source/evals/733-vitest-evals-reporter-ts/)。
