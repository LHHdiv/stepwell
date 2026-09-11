---
title: "78 · utils/sleep.ts — `sleep(ms, signal)`"
summary: "时间有序 UUID：79-utils-uuid.ts.md。"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/sleep.ts`  
被谁调用：Copilot 轮询间隔、Kimi refresh 退避。和 `abortableSleep`（device-code、provider-retry）重复实现了好几份，行为略不同：本函数 `signal.throwIfAborted()` 起步，reject `signal.reason`。

## 下一课

时间有序 UUID：[79-utils-uuid.ts.md](/series/pi-source/ai/140-utils-uuid-ts/)。
