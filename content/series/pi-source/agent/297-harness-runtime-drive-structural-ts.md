---
title: "56 · drive/structural.ts — 压缩/导航共用一套 summary 状态机"
summary: "结构操作也是「deciding → ready → effectpending →（retrywait）→ 发表到树」。和助手生成的差别：请求是 completeSimple 摘要，不是 stream；可能一次 compaction 拆"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive/structural.ts`（约 1200 行）  
被谁调用：drive 分发 summary.* 与 `commitNavigation`；checkpoint 的阈值/overflow 准备函数。

## 本课目标

结构操作也是「deciding → ready → effect_pending →（retry_wait）→ 发表到树」。和助手生成的差别：请求是 `completeSimple` 摘要，不是 stream；可能一次 compaction 拆成 history + turn-prefix **两次**厂家调用（`request: { index, usageId }`）。

## 准备的 durable 形状

`durableCompactionPreparation` / `durableBranchPreparation` 把 Set 文件列表变成可 JSON 的数组。accept 或 checkpoint 时写入 `pi.op.preparation`。deciding 阶段读回来变成 `CompactionPreparation` / `BranchPreparation`。

## `runStructuralDecision`

`before_navigation` / `before_compaction`：decline → 发表 declined（导航不改 tip；压缩不写 compaction entry）。钩子直接给 summary/compaction → 当 fromHook 发表，不再调模型。否则 `publishStructuralReady`。

## 生成

`runStructuralGeneration`：准备模型、before_request step=compaction|branch_summary、intent effect_pending。`performStructuralAttempt` 调 `compactWithRequest` / `generateBranchSummary`，每次内部 complete 前 `publishNestedRequestIntent` 记下 usageId——崩溃后 recover 知道哪次请求不确定。

失败可 retry → summary.retry_wait。`recoverStructuralGeneration` 类似助手：不重挂，按政策合成失败或用已有部分（摘要更常直接失败/重试）。

## `publishStructuralOutcome`

compaction entry 或 branch_summary entry 插入，tip 更新。boundary：

- `finish`：操作完成（手动压缩）
- `resume_checkpoint`：回到 checkpoint continuation（阈值/overflow，run 还在）
- `commit_navigation`：再进 `navigation.ready_to_commit` 或直接在发表时改 tip（看实现 publish 路径）

`commitNavigation`：无摘要导航，校验目标仍存在、不是 source tip、根无 label，set tip（及可选 label），cleanup，navigation_end。

## `prepareCompactionThreshold` / `prepareOverflowCompaction`

阈值：settings.enabled、模型仍在、trigger 之后没有更新的 compaction、shouldCompact。overflow：尚未用过 overflowRecovery，prepareCompaction 能切。

## 失败与边界

结构请求 `deferred` 强制 false。钩子 decline 与提供现成摘要互斥（hooks.ts 已挡）。NothingToCompact 发生在 accept，进不了本文件。

## 下一课

[57 · reconcile.ts](/series/pi-source/agent/298-harness-runtime-drive-reconcile-ts/)。
