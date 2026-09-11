---
title: "46 · extensions/types.ts — 扩展合同"
summary: "扩展是 export default function (pi: ExtensionAPI) { ... }。本文件是那份 pi 能做什么的清单。实现在 loader（如何 import）和 runner（如何 emit）。不必一次背全"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/extensions/types.ts`（约 1800 行，几乎全是类型）  
被谁调用：loader 执行工厂时传入 `ExtensionAPI`；runner 按这些事件名 emit。

## 本课目标

扩展是 `export default function (pi: ExtensionAPI) { ... }`。本文件是那份 `pi` 能做什么的清单。实现在 loader（如何 import）和 runner（如何 emit）。不必一次背全事件，按生命周期分组。

## 工厂与运行时

`ExtensionFactory` 收到 `ExtensionAPI`。`ExtensionRuntime` 是加载期共享可变状态：已登记的 tool/command/flag、pending provider、flagValues、eventBus。多个扩展文件共享**一个** runtime，所以后加载的 `registerCommand("foo")` 会覆盖诊断里的 collision。

`LoadExtensionsResult`：`extensions[]`、`errors[]`、`runtime`。

## `ToolDefinition`

产品工具和扩展工具同一形状：

- `parameters`：TypeBox schema，agent-loop 的 `prepareToolCall` 拿去校验
- `execute(toolCallId, params, signal, onUpdate, ctx)`：真正副作用
- `prepareArguments`：校验前改 raw JSON（edit 的旧字段兼容）
- `executionMode`：`"sequential"` 迫使**整批**工具顺序执行（agent-loop：任一 sequential 则整批 sequential）
- `renderCall` / `renderResult`：TUI，不进模型
- `promptSnippet` / `promptGuidelines`：系统提示
- `constrainedSampling`：厂家侧 json_schema

`defineTool` 保住泛型，避免放进数组后 params 变成 unknown。

## `ExtensionAPI` 分组

1. `on(event, handler)`：session_*、agent_*、tool_call/result、input、provider 头/payload、project_trust、resources_discover…
2. `registerTool` / `registerCommand` / `registerShortcut` / `registerFlag`
3. 消息/条目自定义渲染、markdown transform
4. `registerProvider` / `registerNativeProvider`（加载期先 pending）

`ExtensionContext` 是 handler 运行时对象：cwd、sessionManager、model、ui、exec、当前 signal。`ExtensionCommandContext` 额外有 `waitForIdle`、`newSession`、`fork`。

## 与 executeToolCalls 的衔接

agent-loop 调 `beforeToolCall` / `afterToolCall`（AgentSession 接到 runner 的 `emitToolCall` / `emitToolResult`）。扩展可 `block` 并 `terminate`。这发生在 `tool.execute` 之前/后，schema 校验之后。length 截断的工具根本不会走到这里（loop 先 `failToolCallsFromTruncatedMessage`）。

## 失败与边界

类型文件无运行时逻辑。`UI` 在 print 模式是 no-op 实现。事件 handler 的返回值合并规则在 runner，不在本文件。

## 下一课

[47-extensions-loader.ts.md](/series/pi-source/coding-agent/549-extensions-loader-ts/)：jiti 如何把用户的 .ts 跑起来。
