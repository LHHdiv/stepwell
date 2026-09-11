---
title: "api/pi-messages.lazy.ts — 按需加载 pi 自有消息协议适配器"
summary: "pi 自己的内部线协议垫片：向 <baseUrl>/messages 发一次 POST，收 SSE 流。它与第三方厂商垫片不同，说的是 pi/Radius 网关的协议。"
tags: [pi, ai]
---

## 这个文件是什么

```ts
import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

export const piMessagesApi = (): ProviderStreams => lazyApi(() => import("./pi-messages.ts"));
```

机制见 `230-anthropic-messages` 篇。`lazyApi`（`packages/ai/src/api/lazy.ts:73`）包住动态 import。

## 真实适配器的特殊之处

`pi-messages.ts` 是 11 篇里唯一**不打任何第三方厂商、而说 pi 自己协议**的适配器。其头部注释写明（`packages/ai/src/api/pi-messages.ts:1-10`）：请求是对 `<baseUrl>/messages` 的一次 `POST { model, context, options }`，响应是 SSE 流，逐事件推送序列化后的助手指纹事件，并以终态 `done` / `error` 事件收尾。这正是 **Radius 网关**使用的线协议，任何实现它的后端（例如用 `models.json` 自定义 provider 并设置 `"api": "pi-messages"`）都能接入。

`PiMessagesOptions`（`packages/ai/src/api/pi-messages.ts:31`）在通用 `StreamOptions` 上扩展了 `reasoning`（思考等级）、`toolChoice`、`debug`（索要调试元数据）等 pi 专属选项。

## 为什么需要懒加载

即便它是"自家"协议，适配器仍是一段独立实现。延迟加载让没走 Radius/pi-messages 路径的会话不把它带进冷启动图，保持全系列一致。

## 谁引用它

- 内置注册表：`packages/ai/src/compat.ts:188` 登记为 `"pi-messages"`。
- provider 工厂：`packages/ai/src/providers/radius.ts:25` 的 `const streams = piMessagesApi()`。

## 与同类文件关系

- 与 `230-anthropic-messages` 等同为 4 行标准垫片、同用 `lazyApi`。
- 与其它 10 篇的本质区别：目标不是外部厂商 SDK，而是 pi 自有/Radius 网关的内部协议。

## 自查清单

- [ ] 能否在 `packages/ai/src/api/pi-messages.ts:5` 确认请求打向 `<baseUrl>/messages`？
- [ ] 能否说明它与 Radius 网关的关系？
- [ ] 能否在 `packages/ai/src/compat.ts:188` 看到它登记？
- [ ] 能否列举 `PiMessagesOptions` 相对 `StreamOptions` 多出的字段？
