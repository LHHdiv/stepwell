---
title: "64 · execution/tools.ts — 校验、拦截、执行、finalize，不含磁盘"
summary: "PreparedToolCall → ClearedToolCall 或 ImmediateToolOutcome（kind=immediate，isError，不碰外部）。ExecutedToolCall → FinalizedToo"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/execution/tools.ts`  
被谁调用：drive/tools.ts。主链 loop 有一份平行逻辑（prepare 校验、before/after），这是 harness 工具签名版本。

## 阶段类型

`PreparedToolCall` → `ClearedToolCall` 或 `ImmediateToolOutcome`（kind=immediate，isError，不碰外部）。`ExecutedToolCall` → `FinalizedToolCall`。

## 函数

`prepareToolCall`：按名找工具；`prepareArguments`；`validateToolArguments`。找不到/校验失败 → immediate 错误文本。

`applyBeforeToolDecision`：block → immediate（可 terminate）。替换 args 再校验，失败也 immediate。

`executeToolCall`：`gate.admit`；onUpdate 在 promise settle 后 `acceptingUpdates=false`。execute **throw 收成 isError 文本**，与 AgentTool 合同「失败 throw」对齐。

`finalizeToolCall`：after_tool 字段覆盖。`createToolResultMessage` 填 timestamp=now（物化时 entry 的 timestamp 仍是 commit 的）。

`toolResultFromMessage`：从已 staged 的 ToolResultMessage 还原 AgentToolResult（watch 快照用）。

## 失败与边界

immediate 路径没有 effect_pending，崩溃不会重跑一个「从未开始」的未知工具名。length 截断在 drive/tools 更早变成 truncatedOutcome，不进 execute。

## 下一课

压缩算法：[65 · compaction.ts](/series/pi-source/agent/306-harness-compaction-compaction-ts/)。
