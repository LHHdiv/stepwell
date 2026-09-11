---
title: "63 · execution/assistant.ts — 不改调用方消息数组的流式消费"
summary: "agent-loop 的 streamAssistantResponse 会把 partial 推进 context.messages。harness 不能那样：消息权威在磁盘。本文件只：transform → toProviderMe"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/execution/assistant.ts`  
被谁调用：`runGeneration.performGeneration`；deferred 的 `consumeAssistantStream`。

## 对位

agent-loop 的 `streamAssistantResponse` 会把 partial 推进 `context.messages`。harness 不能那样：消息权威在磁盘。本文件只：transform → toProviderMessages → request → observer 回调 → 返回 settled。

## `consumeAssistantStream`

只允许一个 start。update 必须在 start 后。done 在 start 前 → throw。结束后 `stream.result()`，可选 afterResponse（AbortRequested 则 await cancellation 仍用原 settled）。然后 observer.end。

## `streamHarnessAssistant`

拷贝 messages 再 transform_context。组 AiContext。`createRequestOptions` 把 harness streamOptions + thinkingLevel 映射到 SimpleStreamOptions，signal/telemetry 来自 Context。onPayload/onResponse 接钩子和 HTTP 元数据。

`request` 由调用方注入（generation 里 gate.admit(streamSimple)）。

## 失败与边界

双 start 是协议错误 → throw → drive fault。厂家错误应走流的 error 事件变成 settled stopReason=error，不要让 request() throw。

## 下一课

[64 · execution/tools.ts](/series/pi-source/agent/305-harness-execution-tools-ts/)。
