---
title: "65 · compaction/compaction.ts — 切点、摘要请求、不删树"
summary: "DEFAULTCOMPACTIONSETTINGS：enabled、reserveTokens=16384、keepRecentTokens=20000。shouldCompact：contextTokens > window - re"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/compaction/compaction.ts`  
被谁调用：lane.accept compaction、checkpoint 阈值、overflow、structural 生成。coding-agent 现行压缩有自己的一份，算法同源思路。

## 设置

`DEFAULT_COMPACTION_SETTINGS`：enabled、reserveTokens=16384、keepRecentTokens=20000。`shouldCompact`：contextTokens > window - reserve。

token：优先最后一条有效助手 usage 的 `calculateContextTokens`，其后消息用 `estimateTokens`（约 4 字符 1 token，图 4800 字符）。

## `findCutPoint`

合法切点：user/assistant/custom/bash/branchSummary 等，**不是** toolResult 中间（避免把工具结果和助手拆开）。从末尾累加 token 到 keepRecent，再对齐到切点。若切在非 user，向前找 turn 起点 → `isSplitTurn`：turn 前缀单独摘要，后缀进 retainedTail。

## `prepareCompaction`

路径空或最后已是 compaction → undefined（NothingToCompact）。有旧 compaction：用它的 retainedTail 做虚拟前缀再切。产出 messagesToSummarize / turnPrefixMessages / retainedTail / fileOps / previousSummary。

## 生成

`SUMMARIZATION_SYSTEM_PROMPT`：只输出结构化摘要，禁止接着聊天。用户侧 prompt 要求 Goal / Constraints / Progress / Decisions 等固定标题。

`compact` / `compactWithRequest`：history 一次 completeSimple；split turn 再对 prefix 用 `TURN_PREFIX_SUMMARIZATION_PROMPT`。`cacheRetention: "none"`、独立 sessionId。失败 `CompactionError`。

`completeSimpleWithRetries` 走 pi-ai `retryAssistantCall`，与 run 的 assistant.retry_wait 是另一套（摘要内部重试，不一定把 operation 打成 retry_wait——structural 外层还有自己的 retry_wait）。

## 失败与边界

压缩从不 delete entry。模型看到的窗口变了，磁盘树完整。这是合规删除只能走「精确改写」的原因。

## 下一课

[66 · compaction/utils.ts](/series/pi-source/agent/307-harness-compaction-utils-ts/)。
