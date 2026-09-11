---
title: "06 · proxy.ts — 带宽缩过的 SSE 代理 streamFn"
summary: "能画出：客户端如何把 AssistantMessageEvent 从「无 partial 的代理事件」重建回来，以及连接在 done/error 之前断开时 loop 会看到什么。"
tags: [pi, agent]
---
源码：`packages/agent/src/proxy.ts`  
被谁调用：需要把厂家密钥留在服务器上的宿主；README 示例里 `streamFn: streamProxy(...)`。现行 coding-agent CLI **不走** 这条。

## 本课目标

能画出：客户端如何把 `AssistantMessageEvent` 从「无 partial 的代理事件」重建回来，以及连接在 `done`/`error` 之前断开时 loop 会看到什么。

## 在系统中的位置

```text
Agent.streamFn(model, context, options)
  → streamProxy(model, context, { ...options, authToken, proxyUrl })
       POST {proxyUrl}/api/stream
       body: { model, context, options: 可序列化子集 }
       读 SSE  data: {type, ...}
       重建 partial AssistantMessage
       push 成 AssistantMessageEvent
```

服务器负责鉴权和转厂家。注释：服务器从 delta 事件里剥掉 `partial` 以省带宽；客户端本地攒一份 `partial`。

## `ProxyAssistantMessageEvent`

和 pi-ai 的 `AssistantMessageEvent` 几乎同构，但 start/delta **没有** `partial` 字段。`done` / `error` 带 `usage` 和可选 `providerThinkingLevel`。`toolcall_end` 带完整 `ToolCall`。

`ProxyStreamOptions` = 可进 JSON 的 `SimpleStreamOptions` 子集 + `authToken` + `proxyUrl` + 本地 `signal`。`buildProxyRequestOptions` 明确列出允许过网的键：temperature、sampling、maxTokens、reasoning、cacheRetention、sessionId、headers、metadata、transport、thinkingBudgets、maxRetryDelayMs。**不含 apiKey**——密钥在服务器。

## `streamProxy` 的异步 IIFE

立刻返回 `ProxyMessageEventStream`（`EventStream`，终止事件是 `done`/`error`）。后台：

1. 造一条 `stopReason: "pending"` 的空 `partial`。
2. `signal` 上挂 abort → `reader.cancel`。
3. `fetch` POST。非 2xx 尽量 parse `{ error }`，否则用 statusText，throw。
4. 按 `\n` 切 SSE。只处理 `data: ` 行。`processLine` → `processProxyEvent` → `stream.push`。
5. 循环结束再 `decoder.decode()` flush，处理**最后一行可能没有换行**。
6. 若从未见过 `done`/`error`：当成服务器中途丢连接，推一条 `stopReason: "error"`，`errorMessage` 为 `"Connection closed by proxy server before the response completed"`。否则消费者会一直等 `stream.result()`。
7. catch：`signal.aborted` → `aborted`，否则 `error`。都会 `stream.end()`。
8. finally 摘掉 abort 监听。

这满足 `StreamFn`「失败进流、不 throw 给 loop」——throw 被 IIFE catch 住，变成 error 事件。

## `processProxyEvent`：在客户端拼 partial

| 事件 | 对 partial 做什么 |
|---|---|
| `start` | 原样返回，带当前 partial |
| `text_start` / `thinking_start` | 在 `content[contentIndex]` 开槽 |
| `*_delta` | 把 delta 拼进对应槽；类型不对就 throw |
| `text_end` / `thinking_end` | 写 signature |
| `toolcall_start` | 写入 `toolCall` + 内部 `partialJson: ""` |
| `toolcall_delta` | `partialJson += delta`，`parseStreamingJson` 得到 `arguments`；再 `{...content}` 触发响应式 |
| `toolcall_end` | `Object.assign` 服务器给的完整 toolCall，删 `partialJson` |
| `done` / `error` | 写 stopReason、usage、errorMessage |

`toolcall_end` 若当前槽不是 toolCall，返回 `undefined`（忽略），其它类型错配会 throw，被外层变成 error 事件。

## 失败与边界

- 半截 JSON 参数：和直连厂家一样，完整参数只在 `toolcall_end` / `message_end` 后可信。
- abort 同时 reader.cancel 和 fetch signal：两条路径都可能进 catch，只会产生一条 error 事件。
- 服务器若仍发送带 `partial` 的事件，客户端忽略该字段，以本地重建为准。

## 下一课

[07-node.ts.md](/series/pi-source/agent/248-node-ts/)。主链到此类型与注入孔读完。harness 从 [09](/series/pi-source/agent/250-harness-agent-harness-ts/) 开始。
