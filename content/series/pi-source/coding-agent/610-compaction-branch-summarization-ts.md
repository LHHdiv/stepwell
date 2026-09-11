---
title: "78 · branch-summarization.ts — 离开分支时的摘要"
summary: "压缩丢掉的是「时间上太旧」。分支摘要丢掉的是「我们不走的那条时间线」，但还想让模型知道那边做过什么。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/compaction/branch-summarization.ts`  
被谁调用：会话树导航（`/tree`、double-escape）在 leaf 跳到祖先或旁支之前。

## 本课目标

压缩丢掉的是「时间上太旧」。分支摘要丢掉的是「我们不走的那条时间线」，但还想让模型知道那边做过什么。

`collectEntriesForBranchSummary`：从 oldLeaf 走到与 target 的共同祖先，收集这条将被离开的路径。路过的 compaction 摘要当上下文留下，不在祖先处停止。

然后同样 `serializeConversation` + `completeSummarization`。结果 `appendBranchSummary`，`convertToLlm` 变成带 BRANCH_SUMMARY 标签的 user 消息。

`aborted` / `error` 字段：用户在跳转中 Esc，可以仍跳转但不写摘要。

## 失败与边界

没有 oldLeaf 或路径为空：不调模型。token 预算 `reserveTokens` 默认同样 16384。扩展 `session_before_tree` 可 cancel 整个导航，发生在本函数之前。

## 下一课

[79-project-trust.ts.md](/series/pi-source/coding-agent/613-project-trust-ts/)。
