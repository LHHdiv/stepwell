---
title: "67 · compaction/branch-summarization.ts — 离开一条岔路时带走摘要"
summary: "collectEntriesForBranchSummary：old tip 路径 id 集合 ∩ target 路径 = 最近公共祖先。从 oldTip 走到祖先（不含祖先）的条目 reverse 成时间序。这就是「走丢的那一段」。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/compaction/branch-summarization.ts`  
被谁调用：acceptNavigation(summarize)、structural 生成。

## 收集

`collectEntriesForBranchSummary`：old tip 路径 id 集合 ∩ target 路径 = 最近公共祖先。从 oldTip 走到祖先（不含祖先）的条目 reverse 成时间序。这就是「走丢的那一段」。

`prepareBranchEntries`：把条目变成消息（跳过 toolResult 单独条、custom），抽 fileOps，可按 tokenBudget 截断。已有 branch_summary 的 details 会把历史文件列表并入。

## 生成

`generateBranchSummary` 同样 completeSimple + 文件块。结果进 `branch_summary` entry，导航 commit 后新上下文在新 tip，模型靠这条摘要知道「刚才那条探索发生了什么」。

toolResult 在收集时跳过：工具输出应已反映在随后的助手文本/文件 ops 里，摘要 prompt 靠 serializeConversation 的助手侧。

## 失败与边界

oldTip null（空会话）→ 空 entries，accept 层会 InvalidNavigation（摘要需要两端非根）。缺 entry → throw corrupt。

## 下一课

内置工具从 [68 · tools/index.ts](/series/pi-source/agent/309-harness-tools-index-ts/) 起。
