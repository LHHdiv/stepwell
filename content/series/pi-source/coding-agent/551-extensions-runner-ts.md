---
title: "48 · extensions/runner.ts — 扩展的运行时总线"
summary: "loader 只把模块跑一遍。runner 在有 SessionManager 和 ModelRegistry 之后，把登记的 handler 接到真实会话。读完应能指出：bindCore 冲掉 pending provider、cre"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/extensions/runner.ts`（约 1300 行）  
被谁调用：`AgentSession._buildRuntime` `new ExtensionRunner(...)`；prompt/压缩/换会话/tool 钩子。

## 本课目标

loader 只把模块跑一遍。runner 在**有 SessionManager 和 ModelRegistry** 之后，把登记的 handler 接到真实会话。读完应能指出：`bindCore` 冲掉 pending provider、`createContext()` 每次 execute 新做一份、`emitToolCall` 如何变成 beforeToolCall。

## 构造与 bind

构造：extensions、runtime、cwd、sessionManager、modelRegistry。UI 先是 no-op。

`bindCore(actions, contextActions, providerActions)`：

- 把 sendMessage、setActiveTools、compact… 写进 **runtime**（工厂闭包里的 `pi` 指向同一对象，所以加载期登记的 command 现在能真的切模型）
- 把 pending `registerProvider` flush 到 ModelRuntime
- 此后 `runtime.registerProvider` 立即生效

`setUIContext`：交互 mode 换成真 TUI；print 保持 no-op。`bindCommandContext`：给 `/foo` 命令 `fork`/`newSession`。

## `createContext`

工具 `execute` 的第五参。含 cwd、model、thinkingLevel、sessionManager、ui、exec、abort signal、getActiveTools。wrapper 用 `() => runner.createContext()`，所以 execute 当下的模型/cwd 是新的。

## emit 规则（人话）

- 普通事件：所有 handler 顺序 await，错误 `emitError` 不炸会话
- `tool_call`：可返回 block/terminate；合并「任一 block」
- `before_agent_start`：可追加 messages、覆盖 systemPrompt
- `input`：可改写文本或吞掉
- `session_before_switch/fork/compact/tree`：可 cancel
- `context`：改送给模型前的 AgentMessage 列表（sdk 的 transformContext）

`hasHandlers` 让 sdk 在没人订时零成本跳过。

## 快捷键冲突

扩展 shortcut 对上 `RESERVED_KEYBINDINGS_FOR_EXTENSION_CONFLICTS`（interrupt、exit、submit…）则进 diagnostics，不覆盖内核。

## 失败与边界

`shutdown` 卸 handler。换会话时 AgentSession 扔掉旧 runner 建新的（extensions 列表来自新 cwd 的 loader）。工具 execute throw 由 wrapper/agent-loop 变成 isError result，不是 runner catch。

## 下一课

[49-extensions-wrapper.ts.md](/series/pi-source/coding-agent/553-extensions-wrapper-ts/)：登记的 ToolDefinition 如何变成 AgentTool。
