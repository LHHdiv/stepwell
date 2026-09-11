---
title: "11 · config.ts — 进 harness 之前先把数字和工具名挡下来"
summary: "记住：非法配置 构造期 / setter 期 throw，不会写进 pi.lane.config。运行时的 retry 数字来自已经规范化的快照。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/config.ts`  
被谁调用：`createAgentHarness`、`Harness.setRetryPolicy` / `setCompactionSettings` / `setTools`。

## 本课目标

记住：非法配置 **构造期 / setter 期 throw**，不会写进 `pi.lane.config`。运行时的 retry 数字来自已经规范化的快照。

## `DEFAULT_RETRY_POLICY`

`enabled: true`，`maxRetries: 3`，`baseDelayMs: 1000`，`maxAgentDelayMs` 用 pi-ai 的 `DEFAULT_MAX_AGENT_RETRY_DELAY_MS`（规范默认 60s）。`enabled: false` 在 drive 里规范化成 `maxAttempts: 1`（见 boundary.ts）。

## 三个 validate

`validateToolNames`：同名工具 `TypeError`。主链 Agent 没有这道检查；harness 有，因为 activeToolNames 是持久化身份。

`validateRetryPolicy`：`maxRetries`、`baseDelayMs`、可选 `maxAgentDelayMs` 必须是非负安全整数；`maxRetries` 还不能是 `MAX_SAFE_INTEGER`（+1 会溢出）。失败 `RangeError`。

`validateCompactionSettings`：`reserveTokens`、`keepRecentTokens` 同样非负安全整数。

## 失败与边界

这些 throw 发生在 Session 事务之外，不会留下半份配置。已经 restore 的旧会话若磁盘上的数字当初合法、现在代码更严，restore 不重新 validate 历史 lane config——校验的是 **这次进程的 harness 配置**，不是磁盘上的 LaneConfiguration（后者只有 model / thinkingLevel / activeToolNames）。

## 下一课

[12 · context.ts](/series/pi-source/agent/253-harness-context-ts/)：每个异步方法末尾那个 `Context` 是什么。
