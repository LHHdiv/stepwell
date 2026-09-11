---
title: "64 · tool-definition-wrapper.ts — ToolDefinition ↔ AgentTool"
summary: "wrapToolDefinition 拷贝 name/label/description/parameters/constrainedSampling/prepareArguments/executionMode，execute 若没收"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/tool-definition-wrapper.ts`  
被谁调用：每个 `createXxxTool`；扩展 wrapper；AgentSession 把 SDK 传入的裸 AgentTool 填回 definition 表。

## 映射

`wrapToolDefinition` 拷贝 name/label/description/parameters/constrainedSampling/prepareArguments/executionMode，execute 若没收到 ctx 则 `ctxFactory()`。

`createToolDefinitionFromAgentTool` 反向：没有 promptSnippet/renderer。AgentSession 的 `baseToolsOverride` 走这条，内部登记仍 definition-first。

## 和 executeToolCalls 的关系

loop 调的是 AgentTool.execute。Definition 上的 renderCall 不会被 loop 看见。`prepareArguments` 在 **prepareToolCall**（校验前）由 agent-core 调用，必须返回符合 schema 的对象。

## 下一课

[65-tools-edit-diff.ts.md](/series/pi-source/coding-agent/585-tools-edit-diff-ts/)。
