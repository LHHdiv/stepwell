---
title: "23 · api/transform-messages.ts — 回放前把历史改成当前模型能吃的"
summary: "能说出三件事：非视觉模型如何丢掉图片；跨模型如何处理 thinking signature；孤儿 toolCall 如何补假 toolResult。这是「同一条会话换 Claude → GPT」能活下来的原因。"
tags: [pi, ai]
---
源码：`packages/ai/src/api/transform-messages.ts`  
被谁调用：几乎每个 `stream` 的 `convertMessages` 第一步。换模型、换厂家、会话中途 abort 过，都靠它避免 400。

## 本课目标

能说出三件事：非视觉模型如何丢掉图片；跨模型如何处理 thinking signature；孤儿 toolCall 如何补假 toolResult。这是「同一条会话换 Claude → GPT」能活下来的原因。

## 在系统中的位置

```text
context.messages  （可能混了多家 assistant 消息）
  transformMessages(messages, model, normalizeToolCallId?)
    1. null content → []
    2. 非视觉：image → 占位文本
    3. 按块改 thinking / 去 signature / 规范化 toolCall id
    4. 跳过 error/aborted 助手消息
    5. 孤儿 toolCall → 合成 isError toolResult
  再交给各协议的 convertMessages
```

## 图片降级

`model.input` 不含 `"image"` 时，user 和 toolResult 里的 image 块换成：

- user：`"(image omitted: model does not support images)"`
- tool：`"(tool image omitted: model does not support images)"`

连续多张图只留一个占位，避免刷屏。已经是这段占位文本的，后面的图不再重复插。

## 第一遍：按块

`content == null` 收成 `[]`（旧会话、手写历史、自定义工具）。

助手消息算不算「同一模型」：

```ts
isSameModel = assistant.provider === model.provider
  && assistant.api === model.api
  && assistant.model === model.id
```

同模型：thinking 原样留（包括空正文但有 signature 的 OpenAI encrypted reasoning）；toolCall 的 thoughtSignature 保留。

跨模型：

- `redacted` thinking **整块丢弃**（密文对别家是垃圾，还会 400）。
- 空 thinking 丢弃。
- 非空 thinking **变成 text**（模型当普通文字看，不能当思考回放）。
- text 去掉 `textSignature`（浅拷贝只留 text）。
- toolCall 去掉 `thoughtSignature`；若提供了 `normalizeToolCallId`，改 id 并记入 map，随后 toolResult 的 `toolCallId` 跟着改。

`normalizeToolCallId` 由各协议传入：Anthropic 要 `^[a-zA-Z0-9_-]+$` 且 ≤64；OpenAI Completions 要 ≤40 且处理 `call_id|item_id`；Responses 要 item id 以 `fc_` 开头。

## 第二遍：孤儿 tool 与坏助手消息

`stopReason === "error" | "aborted"` 的助手消息**整条跳过**。它们可能只有半截 reasoning、没有 following item，OpenAI 会报 “reasoning without following item”。模型应从上一个完整回合重试。

助手消息里的 toolCall 进入 `pendingToolCalls`。后续 toolResult 把 id 记进 `existingToolResultIds`。遇到下一条助手、user、或列表结束时，对还没结果的 call 插入：

```ts
{ role: "toolResult", toolCallId, toolName, content: [{ type: "text", text: "No result provided" }], isError: true }
```

用户插话打断工具链、或上一轮 abort 在 toolCall 之后，都会走这条。厂家 API 要求每个 tool_use 必须有 tool_result。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 同模型 redacted thinking | 保留，下一轮 Anthropic 要 signature |
| 跨模型 redacted | 丢弃，思考内容用户再也看不到 |
| 空 thinking + signature + 同模型 | 保留（Responses 回放 encrypted_content） |
| 规范化后两个 call 撞 id | 本函数不管，协议层的 normalizer 必须避免 |
| 被跳过的 error 助手里的 toolCall | 不补 result（整条都没进结果列表） |

## 下一课

工具 schema 如何变成 strict JSON / grammar：[24-api-constrained-sampling.ts.md](/series/pi-source/ai/085-api-constrained-sampling-ts/)。
