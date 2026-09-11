---
title: "77 · utils/hash.ts — 把超长 toolCall id 压短"
summary: "shortHash(str)：非加密、确定性、base36。OpenAI Completions 把 callid|400字符item 压到 40 字符时用 8 位 hash；Responses 跨厂家 item id 用 fc${sh"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/hash.ts`

`shortHash(str)`：非加密、确定性、base36。OpenAI Completions 把 `call_id|400字符item` 压到 40 字符时用 8 位 hash；Responses 跨厂家 item id 用 `fc_${shortHash}`。碰撞可能，长度远低于加密需求。不要当安全 id。

## 下一课

可取消的 sleep：[78-utils-sleep.ts.md](/series/pi-source/ai/139-utils-sleep-ts/)。
