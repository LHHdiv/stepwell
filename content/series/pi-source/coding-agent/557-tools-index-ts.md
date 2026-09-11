---
title: "51 · tools/index.ts — 八件工具的工厂目录"
summary: "产品默认激活的是 read / bash / edit / write（createCodingTools）。grep/find/ls/powershell 实现都在，但要进循环必须出现在 defaultTools、--tools 或扩"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/index.ts`  
被谁调用：`AgentSession._buildRuntime` 的 `createAllToolDefinitions`；SDK 再导出 `createCodingTools` 等。

## 本课目标

产品默认激活的是 **read / bash / edit / write**（`createCodingTools`）。grep/find/ls/powershell 实现都在，但要进循环必须出现在 `defaultTools`、`--tools` 或扩展 `setActiveTools`。`allToolNames` 是这八个。

## 两套对象

`createXxxToolDefinition` → `ToolDefinition`（有 renderer、promptSnippet）。  
`createXxxTool` → `wrapToolDefinition` 后的 `AgentTool`（loop 执行面）。

AgentSession 走 definition 表，再用 `wrapRegisteredTools` 变成 AgentTool，以便注入 ExtensionContext。SDK 若直接 `createCodingTools` 得到的是不带 runner ctx 的 AgentTool。

## 工厂分组

| 函数 | 内容 |
|---|---|
| `createCodingToolDefinitions` | read, bash, edit, write |
| `createReadOnlyToolDefinitions` | read, grep, find, ls |
| `createAllToolDefinitions` | 八件，Record 按名 |
| 对应的 `create*Tools` | AgentTool 版本 |

`ToolsOptions` 可分别传给 read/bash/… 的 operations（SSH 后端）。

## 和 executeToolCalls 的关系

agent-loop 只看见 `agent.state.tools` 这份 AgentTool 数组。本文件不执行任何工具。`executionMode` 默认 undefined → 跟全局 `toolExecution`（通常并行）。内置八件都没标 sequential；并行批里 write/edit 靠 `withFileMutationQueue` 按文件互斥。

助手 `stopReason === "length"` 时 loop **不调用**任何 execute。工具内部的 truncate 是另一件事：execute 已经跑完，只是返回给模型的文本被砍。

## 下一课

[52-tools-read.ts.md](/series/pi-source/coding-agent/559-tools-read-ts/)：第一件内置工具。
