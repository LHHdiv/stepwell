---
title: "06 · vitest-evals/harness-table.ts — baseline vs candidates 的笛卡尔行"
summary: "describe.for(table)(\"$name\", ({ harness }) => describeEval(..., { harness })) 需要一个数组：每个元素是「某 harness 的第 r 次重复」。本文件生成它，"
tags: [pi, evals]
---
源码：`packages/evals/src/vitest-evals/harness-table.ts`  
核心导出：`evalHarnessTable`、`deriveEvalGroupKey`、`parseEvalHarnessIterationArtifact`  
被谁调用：`extensions.eval.ts`；reporter 解析 iteration artifact 才能做配对统计。

## 本课目标

`describe.for(table)("$name", ({ harness }) => describeEval(..., { harness }))` 需要一个数组：每个元素是「某 harness 的第 r 次重复」。本文件生成它，并在每次 `harness.run` 时写入 iteration 元数据，好让不同文件、不同 prompt 的 run 能配对。

## artifact 形状

```ts
{
  schemaVersion: 1,
  evalSet,          // 人类可读，如 "Pi extension authoring system prompt"
  groupKey,         // JSON.stringify([inputKey, repetition])
  harness,          // 本行 harness.name
  baseline,         // 对照名
  candidates,       // 处理组名列表（不含 baseline）
  repetition,       // 从 1 起
}
```

`groupKey` 让「同一 input、同一 repetition」下 baseline 与 candidate 能找到彼此。inputKey：若 input 是带非空字符串 `id` 的对象用 id，否则对 canonical JSON 做 sha256。canonical 拒绝非有限数、循环、稀疏数组、非 plain 对象。

## `evalHarnessTable`

两种 options：`candidate` 单处理，或 `candidates` 数组。`repetitions` 默认 1。校验：evalSet 非空、至少一个 candidate、所有 harness 名唯一、repetitions 正整数。

展开顺序：外层 repetition 1..n，内层 `[baseline, ...candidates]`。extensions.eval 重复 1、两个 harness，得到两行，`describe.for` 跑两次套件。

## `withIterationArtifact`

包一层 `run`：先 `setArtifact(EVAL_HARNESS_ITERATION_ARTIFACT, artifact)`（此时 groupKey 已能从 input 算），再调原 harness。成功则把 artifact 合并进 `run.artifacts`。失败若 error 上挂了 partial HarnessRun（vitest-evals 的 `getHarnessRunFromError`），同样合并再 throw——reporter 对 errored 观察仍能配对出「这次 candidate 炸了」。

## 失败与边界

- 名字必须稳定：改 harness.name 会让历史 `.eval` 对不上，lift 报表把它们当不同集合。
- `parseEvalHarnessIterationArtifact` 任何字段不对就 `undefined`。reporter 会跳过，不进比较（那次 run 仍进 `runs.jsonl`）。
- 本文件不跑模型。纯数据。单元测试在 `test/vitest-evals/harness-table.test.ts`。

## 下一课

lift 怎么算：[07-vitest-evals.summary.ts.md](/series/pi-source/evals/732-vitest-evals-summary-ts/)。
