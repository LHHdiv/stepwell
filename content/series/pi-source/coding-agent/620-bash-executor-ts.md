---
title: "83 · bash-executor.ts — 用户感叹号跑命令"
summary: "实现：operations.exec + 边收边 onChunk（已剥 ANSI、二进制、\\r）。超 50KB 开始写 tmp pi-bash-.log。abort 返回 cancelled: true，不 throw。其它 exec "
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/bash-executor.ts`  
被谁调用：`AgentSession.executeBash`（交互 `!ls`、RPC）。**不是**模型 bash 工具。

## 差别

| | bash 工具 | executeBashWithOperations |
|---|---|---|
| 谁调 | 模型 toolCall | 用户 |
| 截断 | OutputAccumulator 2000 行/50KB | 内存滚动 100KB，返回 truncateTail 50KB |
| 退出码非 0 | throw → isError toolResult | 返回 `exitCode`，由调用方做 BashExecutionMessage |
| PI_* env | 工具层加 | 取决于传入的 operations |

实现：`operations.exec` + 边收边 `onChunk`（已剥 ANSI、二进制、`\r`）。超 50KB 开始写 tmp `pi-bash-*.log`。abort 返回 `cancelled: true`，不 throw。其它 exec 错误 throw。

`!!cmd` 的 `excludeFromContext` 在 Session 层设，本文件不管。

## 下一课

[84-cache-stats.ts.md](/series/pi-source/coding-agent/623-cache-stats-ts/)。
