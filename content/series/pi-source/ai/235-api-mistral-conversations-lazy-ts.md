---
title: "api/mistral-conversations.lazy.ts — 按需加载 Mistral Conversations 适配器"
summary: "Mistral 自有 Conversations 协议的垫片。其真实适配器不依赖 openai SDK，而是手写请求，并针对 Mistral 工具调用 ID 长度与超大错误体做了特化处理。"
tags: [pi, ai]
---

## 这个文件是什么

```ts
import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

export const mistralConversationsApi = (): ProviderStreams => lazyApi(() => import("./mistral-conversations.ts"));
```

机制见 `230-anthropic-messages` 篇。

## 真实适配器的特殊之处

与其它 OpenAI 系适配器不同，`mistral-conversations.ts` 顶部**没有导入 `openai` SDK**（`packages/ai/src/api/mistral-conversations.ts:1` 直接是 `calculateCost`），而是用 `parseStreamingJson`、`transformMessages`（`packages/ai/src/api/mistral-conversations.ts:19-24`）手写请求与解析，走 Mistral 自己的 Conversations 线协议。它有两个明显的 Mistral 专属常量：

- `MISTRAL_TOOL_CALL_ID_LENGTH = 9`（`packages/ai/src/api/mistral-conversations.ts:26`）：Mistral 的工具调用 ID 固定为 9 个字符，适配器据此处理。
- `MAX_MISTRAL_ERROR_BODY_CHARS = 4000`（`packages/ai/src/api/mistral-conversations.ts:27`）：Mistral 错误体可能很大，截断到 4000 字符避免日志爆炸。

此外它还有 `Provider-specific options`（`packages/ai/src/api/mistral-conversations.ts:30` 起），暴露 Mistral 独有的采样/参数。

## 为什么需要懒加载

虽然不依赖庞大的 `openai` SDK，但适配器本身仍是一段独立实现。延迟加载保持"按厂商付费"的一致性，未使用 Mistral 时不进冷启动图。

## 谁引用它

- 内置注册表：`packages/ai/src/compat.ts:186` 登记为 `"mistral-conversations"`。
- provider 工厂：`packages/ai/src/providers/mistral.ts:13` 的 `api: mistralConversationsApi()`。

## 与同类文件关系

- 与 `237-openai-completions`、`238-openai-responses` 不同：后者复用 `openai` SDK，本适配器手写协议，是"非 OpenAI 兼容"的一支。
- 与 `230-anthropic-messages` 同为标准 4 行垫片。

## 自查清单

- [ ] 能否在 `packages/ai/src/api/mistral-conversations.ts:1` 确认它没有导入 `openai`？
- [ ] 能否找到 `MISTRAL_TOOL_CALL_ID_LENGTH` 与 `MAX_MISTRAL_ERROR_BODY_CHARS`？
- [ ] 能否在 `packages/ai/src/compat.ts:186` 看到它登记？
