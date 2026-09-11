---
title: "49 · extensions/wrapper.ts — 扩展工具接到 Agent"
summary: "wrapToolDefinition 把 ToolDefinition 变成 AgentTool（agent-loop 只认这个）。本文件再包一层：execute 前后看 getActiveTools()，若工具自己 setActive"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/extensions/wrapper.ts`  
被谁调用：`AgentSession._refreshToolRegistry` 的 `wrapRegisteredTools`。

## 本课目标

`wrapToolDefinition` 把 ToolDefinition 变成 `AgentTool`（agent-loop 只认这个）。本文件再包一层：execute 前后看 `getActiveTools()`，若工具自己 `setActiveTools` 加了名字，把它们放进 `result.addedToolNames`，循环才能在下一轮把新工具 schema 发给模型。

若 active 集合有**删除**（`activeBefore` 不是 `activeAfter` 的子集），不加 addedToolNames，避免和「关掉工具」的语义搅在一起。

`ctxFactory` 固定为 `() => runner.createContext()`，保证扩展工具和事件 handler 拿到同一套 session。

## 和 executeToolCalls 的关系

agent-loop 调 `tool.execute(...)` 时**不传** ExtensionContext（AgentTool 签名里 ctx 可选）。wrapper 在内部补上。beforeToolCall 拦截发生在 execute 外，进不了这层。

## 下一课

[50-extensions-index.ts.md](/series/pi-source/coding-agent/555-extensions-index-ts/)：对外再导出。
