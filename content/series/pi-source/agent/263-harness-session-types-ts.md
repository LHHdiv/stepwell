---
title: "22 · session/types.ts — 对话树、13 个叶子、Storage 合同"
summary: "能默写：entry 四种、OperationState.at 十三值、accept 写入的 meta 与每次转换覆盖的 state 为何分开、Session.mutate 为什么禁止在回调里再调公开 writer。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/types.ts`  
被谁调用：session 实现、runtime drive、公开类型。

## 本课目标

能默写：entry 四种、`OperationState.at` 十三值、accept 写入的 meta 与每次转换覆盖的 state 为何分开、Session.mutate 为什么禁止在回调里再调公开 writer。

## Entry 树

`EntryType = "message" | "compaction" | "branch_summary" | "custom"`。每条有 `id`、`parentId`、`seq`、`timestamp`。`NewEntry` 在 commit 前没有 seq/timestamp，storage 分配。

compaction 存 `retainedTail`（最近若干 AgentMessage）和 `tokensBefore`。这不是删历史：旧 entry 仍在树上，context 构建从最近一条 compaction 开始（课 27）。

`EntryProjector`：custom entry → 可选 AgentMessage[]。没有 projector 的 custom 对模型不可见，但仍在树上。

## Operation

`OperationMeta` 写一次：id、lane、sourceTipId、startedAt、intent（run 的 promptEntryIds / compaction 说明 / navigation 目标）。

`Control` 正交于 `at`：`running` 或 `cancel_requested`。取消不换叶子，reconcile 按当前叶子收尾。

`OperationState` 13 个叶子，discriminant 是 `at`：

```text
starting
checkpoint
assistant.ready | assistant.effect_pending | assistant.retry_wait
tools
deferred.suspended | deferred.effect_pending
summary.deciding | summary.ready | summary.effect_pending | summary.retry_wait
navigation.ready_to_commit
```

`operationScopeOf` 只拷 `control` / `settings` / `latestAssistantEntryId`，构造下一叶子时展开。

工具子状态机嵌在 `ToolsOperation.batch.calls[]`：`planned` → `effect_pending`（带 replay）→ `outcome_ready` → `completed`。sourceIndex 是助手 content 数组下标，不是「第几个工具」序号。

`CheckpointData.continuation`：`need_assistant` 或 `may_finish`。checkpoint 是 run 的枢纽：inbox、阈值压缩、是否结束都在这里决定。

`SummaryTask.boundary`：摘要完成后去哪——`resume_checkpoint` / `finish` / `commit_navigation`。同一套 summary 过程服务手动压缩、阈值压缩、overflow、带摘要的导航。

## 三仓库写入

`Write = EntryWrite | UsageWrite | ValueWrite | ListWrite`。`CommitResult` 给 firstSeq、每条 seq、timestamp、事后 stats。

`Storage`：commit + 查询。`scanBranch` 必须有 start。list 有 cursor。close。

`Session` 在 Storage 上加：metadata、idGenerator、mutate 互斥、branch CRUD、便捷 setValue。`mutate` 注释：**回调里调公开 Session writer 会排到回调后面 → 死锁**。只用传入的 mutator，且 commit 零或一次。

`SessionRepo`：create / open / list / delete / fork。fork 的 `scope: "branch" | "tree"`。branch fork 可 `position: "before" | "at"`。

## 失败与边界

`SettledAssistantMessage` 排除 `stopReason: "pending"`。Session 拒绝把 pending 助手写成 entry（课 26）。

durable 状态是 **完全替换** 的 `pi.op.state`，不是 journal。恢复只读当前叶子，不重放历史转换。

## 下一课

[23 · values.ts](/series/pi-source/agent/264-harness-session-values-ts/)：所有 `pi.*` 地址的字典。
