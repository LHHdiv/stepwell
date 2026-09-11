---
title: "59 · utils/assistant-message-frame.ts — 可回放的增量帧"
summary: "AssistantMessageEvent 的 partial 是共享可变对象，不能当日志。Frame 是不可变快照：textdelta 只带增量字符串；tool 参数用 checkpoint + delta。reduceAssista"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/assistant-message-frame.ts`  
被谁调用：需要把正在流的 assistant 存进会话后端、刷新后再还原的代码（session-backends，本课表外）。**终端 `done/error` 不进帧**，结算另存。

## 本课目标

`AssistantMessageEvent` 的 `partial` 是共享可变对象，不能当日志。Frame 是不可变快照：`text_delta` 只带增量字符串；tool 参数用 checkpoint + delta。`reduceAssistantMessageFrames` 能重建到当前内容（stopReason 仍是 pending）。

## `AssistantMessageFrameEncoder`

一个 encoder 对应一次 stream。`start` 必须最先且只有一次。之后按 contentIndex 跟踪块：

- text/thinking：记下已覆盖字符数，encode 时只输出相对当前 `partial` 的新 delta（处理「队列里还是旧事件、partial 已经更长」）。
- toolCall：若 arguments JSON 不是上次前缀（厂家修正了 JSON），发 `toolcall_checkpoint` 全量 json，再跟 delta。

终端事件让 encoder 进入 `terminal`，再 encode 会 throw。

## `reduceAssistantMessageFrames`

无 start → `undefined`。start 后按帧填块。未 end 的 toolCall 用累积 json `parseStreamingJson`。start 之前的帧记下来再 throw。双重 start throw。

## 失败与边界

乱序 contentIndex、delta 打在已 end 的块上：throw。这是存储损坏或 encoder bug，不要静默。`cloneStartMessage` 把 stopReason 改回 pending、清空 content，避免把一次失败的结算写进可回放前缀。

## 下一课

Agent 级重试分类：[60-utils-retry.ts.md](/series/pi-source/ai/121-utils-retry-ts/)。
