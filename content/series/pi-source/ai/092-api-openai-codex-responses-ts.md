---
title: "31 · api/openai-codex-responses.ts — ChatGPT 后端的 SSE 与 WebSocket"
summary: "这是本包最复杂的传输：同一套 Responses 事件，三条路（WebSocket 复用、WS 失败降 SSE、强制 SSE），还要 zstd 压请求体、从 JWT 抽 account id、按 session 缓存连接。process"
tags: [pi, ai]
---
源码：`packages/ai/src/api/openai-codex-responses.ts`（约 1657 行）+ `.lazy.ts`  
被谁调用：`provider === "openai-codex"` 的订阅模型。OAuth access token 当 apiKey。默认 baseUrl `https://chatgpt.com/backend-api`。

## 本课目标

这是本包最复杂的传输：同一套 Responses 事件，三条路（WebSocket 复用、WS 失败降 SSE、强制 SSE），还要 zstd 压请求体、从 JWT 抽 account id、按 session 缓存连接。`processResponsesStream` 仍然复用 29 课。

## 在系统中的位置

```text
streamSimple → reasoningEffort
stream
  extractAccountId(jwt)
  buildRequestBody（和官方 Responses 类似，instructions 来自 systemPrompt）
  transport: auto | websocket | websocket-cached | sse
  auto：先 WS（可复用连接 + previous_response_id 增量）
        失败 / 1009 太大 / connection_limit → SSE
        某 session 一旦 SSE fallback，后续请求钉死 SSE
  start + processResponsesStream
cleanupSessionResources(sessionId) → closeOpenAICodexWebSocketSessions
```

## 为什么不用 OpenAI SDK

Codex 后端不是 `api.openai.com/v1/responses`。要自定义头（account id、cookie 形态的 token）、WS 端点、请求体 zstd。SDK 帮不上。自写 fetch + WebSocket，把收到的 JSON 当成 `ResponseStreamEvent`。

## WebSocket 缓存

模块级 `websocketSessionCache: Map<sessionId, Map<account, connection>>`。连接 idle 一段时间关掉。`busy` 防止同一连接上并发两个 responses。

`websocket-cached`：带上 `previous_response_id` 和相对上次的 input delta，后端复用服务端上下文。`previous_response_not_found` 则重发全量。

`registerSessionResourceCleanup` 在模块加载时注册，会话结束关 socket，避免泄漏到下一个项目会话。

## 降级

`WEBSOCKET_MESSAGE_TOO_BIG`（1009）、`websocket_connection_limit_reached`、握手超时：记入 debug stats，该 session 进入 `websocketSseFallbackSessions`。之后 auto 不再尝试 WS，直到 `resetOpenAICodexWebSocketDebugStats`。

SSE 路径可把 JSON body zstd 压缩（level 3），官方 Codex 客户端同样如此。压失败则发明文。

## 重试

本文件自己做一层：额度类错误（`GoUsageLimitError`、`insufficient_quota`…）**不**重试。传输失败有限次数，延迟 `BASE_DELAY_MS`。外层还有 `retryProviderRequest` 风格的调用方重试。

`getOpenAICodexWebSocketDebugStats(sessionId)` 给扩展/调试看复用率、fallback 次数。

## `streamSimple`

缺 apiKey 同步 throw。思考档映射与官方 Responses 相同。`toolChoice` 只支持 auto/none/required。

## 失败与边界

| 情况 | 行为 |
|---|---|
| JWT 没有 chatgpt_account_id | extract 失败，请求缺账号头，后端 401 |
| 无 sessionId | 每次新 WS，无法 cached |
| cleanup 没调 | 连接泄漏直到 idle timer |
| 用户 abort | combineAbortSignals 同时停 WS 读循环和超时 |

## 下一课

Azure 部署名映射：[32-api-azure-openai-responses.ts.md](/series/pi-source/ai/093-api-azure-openai-responses-ts/)。
