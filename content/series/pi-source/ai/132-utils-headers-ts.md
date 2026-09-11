---
title: "71 · utils/headers.ts — Headers 对象 ↔ 普通对象"
summary: "headersToRecord(Headers)：onResponse 回调要普通对象。多值头被 Headers.entries 逗号合并，看 Fetch 规范。"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/headers.ts`

`headersToRecord(Headers)`：`onResponse` 回调要普通对象。多值头被 `Headers.entries` 逗号合并，看 Fetch 规范。

`providerHeadersToRecord`：丢掉 `null` 值（那是「删除默认头」的指令，不能发给 fetch）。全删光返回 `undefined`。

## 下一课

HTTP(S) 代理 URL：[72-utils-node-http-proxy.ts.md](/series/pi-source/ai/133-utils-node-http-proxy-ts/)。
