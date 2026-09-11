---
title: "76 · compaction.ts — 上下文摘要"
summary: "压缩 = 再调一次模型，把旧消息变成 compaction 条目。SessionManager 负责把结果 appendCompaction 并让 buildSessionContext 丢掉前缀。本文件计算：该不该压、从哪切开、摘要词"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/compaction/compaction.ts`（约 1000 行）  
被谁调用：`AgentSession._checkCompaction` / `/compact`；纯函数，不写 JSONL。

## 本课目标

压缩 = 再调一次模型，把旧消息变成 `compaction` 条目。SessionManager 负责把结果 `appendCompaction` 并让 `buildSessionContext` 丢掉前缀。本文件计算：该不该压、从哪切开、摘要词。

## 触发 `shouldCompact`

`enabled` 且 `contextTokens > contextWindow - reserveTokens`。默认 `reserveTokens=16384`，`keepRecentTokens=20000`。token 优先用最后一条成功 assistant 的 `usage.totalTokens`，后面的消息用 chars/4 估。

`stopReason===length` 时 AgentSession 也会当「必须压」。loop 的 `shouldStopAfterTurn` 让本轮 prompt 结束，Session 再 compact + continue。

## `prepareCompaction`

在当前 leaf 路径上：

1. 找到上一次 compaction 作为边界
2. `findCutPoint`：从尾往前留大约 `keepRecentTokens`，切在**回合边界**（用户消息）上；若单回合太大则 `isSplitTurn`，前缀另做一份摘要
3. 抽出 `messagesToSummarize`、可选 `turnPrefixMessages`、文件操作集合
4. 路径最后已是 compaction 或没有可摘要消息 → undefined（noop）

## `compact`

`generateSummary`：`convertToLlm` → `serializeConversation` → 专用 SUMMARIZATION_SYSTEM_PROMPT（「不要继续对话」）→ `completeSimple` / 传入的 `streamFn`。可带 previousSummary 做增量。split turn 再跑 TURN_PREFIX 提示，两段拼起来。

`details`：readFiles / modifiedFiles，供下次迭代。`fromHook` 在 Session 层若扩展自己生成摘要时才标。

## 失败与边界

abort 随 signal。摘要模型用当前会话模型（或设置里的 compaction 覆盖，在 AgentSession 不在本文件）。失败文案 `getSummarizationFailure`。不在这里改 agent.state.messages——Session 压缩完 reload 上下文。

## 下一课

[77-compaction-utils.ts.md](/series/pi-source/coding-agent/608-compaction-utils-ts/)。
