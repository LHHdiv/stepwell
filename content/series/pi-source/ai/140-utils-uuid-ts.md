---
title: "79 · utils/uuid.ts — UUIDv7"
summary: "48-bit毫秒时间 + 41-bit 单调 sequence（同一毫秒递增）+ 随机。显式传入 timestampMs 不更新 lastOrdinaryTimestamp，给 follower id 用同一时间。sequence 耗尽"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/uuid.ts`  
被谁调用：Codex 无 sessionId 时当 websocket request id；其他需要时间有序 id 的地方。主入口 re-export。

## 行为

48-bit毫秒时间 + 41-bit 单调 sequence（同一毫秒递增）+ 随机。显式传入 `timestampMs` 不更新 `lastOrdinaryTimestamp`，给 follower id 用同一时间。sequence 耗尽 throw。时间超出 48-bit throw RangeError。

需要 `globalThis.crypto.getRandomValues`。

## 下一课

TypeBox 字符串枚举：[80-utils-typebox-helpers.ts.md](/series/pi-source/ai/141-utils-typebox-helpers-ts/)。
