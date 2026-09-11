---
title: "18 · rpc-types.ts — RPC 协议类型"
summary: "把 RPC 看成「没有键盘的 InteractiveMode」。命令覆盖 prompt/steer/模型/压缩/会话树/bash。类型文件没有运行时。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/rpc/rpc-types.ts`  
被谁用：`rpc-mode.ts`（服务端）、`rpc-client.ts`（客户端）、SDK 再导出。

## 本课目标

把 RPC 看成「没有键盘的 InteractiveMode」。命令覆盖 prompt/steer/模型/压缩/会话树/bash。类型文件没有运行时。

## 协议三层

1. **Commands（stdin）** `RpcCommand`：每条可选 `id`，用来把 response 对上请求。
2. **Responses（stdout）** `RpcResponse`：`{ type: "response", command, success, data? | error? }`。
3. **Events（stdout）** 不是本文件定义的，是 `toJsonEvent` 之后的 `JsonAgentSessionEvent`。另外还有 `extension_ui_request` / `extension_ui_response`。

framing 是 JSONL，见 [19-rpc-jsonl.ts.md](/series/pi-source/coding-agent/492-rpc-jsonl-ts/)。

## 命令分组

### 提示

`prompt` / `steer` / `follow_up` / `abort` / `clear_queue` / `new_session`。`prompt` 可带 `images`、`streamingBehavior: "steer" | "followUp"`。这和交互里「流式时回车 = steer」是同一套 `session.prompt` 选项。

### 状态与模型

`get_state` 返回 `RpcSessionState`：model、thinkingLevel、isStreaming、isCompacting、队列模式、sessionFile、messageCount。  
`set_model` 用 `provider` + `modelId`，不是对象引用——JSON 过不了 class。

### 压缩 / 重试 / bash

`compact`、`set_auto_compaction`、`set_auto_retry`、`abort_retry`、`bash`、`abort_bash`。bash 可 `excludeFromContext`，对应交互的 `!!`。

### 会话树

`switch_session`、`fork`、`clone`、`get_fork_messages`、`get_entries`、`get_tree`、`set_session_name`、`export_html`。`clone` 是对当前 leaf `fork(..., { position: "at" })`。

### 斜杠命令清单

`get_commands` 返回 extension / prompt template / skill 三源。skill 的 name 带 `skill:` 前缀，和交互自动补全一致。

## 扩展 UI

服务端发 `RpcExtensionUIRequest`：`select` / `confirm` / `input` / `editor` / `notify` / `setStatus` / `setWidget` / `setTitle` / `set_editor_text`。  
客户端回 `RpcExtensionUIResponse`：`value` 或 `confirmed` 或 `cancelled: true`。

RPC 没有真 TUI。`notify`/`setStatus` 是 fire-and-forget；`select` 要等客户端画自己的 UI 再回答。组件工厂（`setFooter`、`custom()`）在 rpc-mode 里是空实现。

## 失败与边界

- 任意命令都可以变成 `{ success: false, error: string }`。客户端 `getData` 见到 false 就 throw。
- `id` 可选。没 id 的命令，客户端对不上 pending map，只能当事件丢掉。`RpcClient.send` 总是自己生成 `req_N`。
- 没有 `shutdown` 命令。关 stdin 或 SIGTERM 才会退出。扩展可调 `shutdownHandler` 设标志，等 `agent_settled` 再退。

## 下一课

[19-rpc-jsonl.ts.md](/series/pi-source/coding-agent/492-rpc-jsonl-ts/) — 为什么不用 `readline`。
