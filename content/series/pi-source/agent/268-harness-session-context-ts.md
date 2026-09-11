---
title: "27 · session/context.ts — 树上的路径 → 给模型的消息列表"
summary: "压缩 不删 entry。上下文窗口从「最近一条 compaction + 其后」开始。错误/中止/deferred 的助手消息不进模型。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/context.ts`  
被谁调用：`readBoundedContext`（drive 问模型前）；compaction 估 token。

## 本课目标

压缩 **不删 entry**。上下文窗口从「最近一条 compaction + 其后」开始。错误/中止/deferred 的助手消息不进模型。

## `buildContextEntries`

从 path 末尾向前找最近 `type === "compaction"`。没有则整段路径；有则 `[compaction, ...compaction 之后]`。更早的 compaction 和被摘要掉的消息仍在存储里，只是这次请求看不见。

## `sessionEntryToContextMessages`

| entry | 产出 |
|---|---|
| message | 若 `isContextMessage` 则 [message]；助手且 stopReason 为 error/aborted/deferred 则 [] |
| compaction | compactionSummary 消息 + retainedTail 里仍 isContextMessage 的 |
| branch_summary | 非空 summary 则一条 branchSummary 消息 |
| custom | []（留给 projector） |

## `buildSessionContext`

先 buildContextEntries，再逐条：非 custom 用上表；custom 查 `entryProjectors[customType]`，没有 projector 则跳过。

`readBoundedEntries` 扫分支时 `stopAtType: "compaction"`，所以 path 本身已经在最近压缩处停下；buildContextEntries 再处理 retainedTail 拼前缀。两层是为了「path 含历史压缩条目时」仍正确——例如 fork 拷了整棵树。

## 失败与边界

projector throw 会冒到 drive → fault。projector 必须自己守合同。deferred 助手不进上下文：模型不应看到「我还在排队」的半截回复；恢复后由 deferred 过程去 poll。

## 下一课

[28 · fork-policy.ts](/series/pi-source/agent/269-harness-session-fork-policy-ts/)：fork 时哪些 value 跟着走。
