---
title: "api/google-vertex.lazy.ts — 按需加载 Google Vertex AI 适配器"
summary: "Google Vertex AI（GCP）路径的垫片。与 google-generative-ai 共用 @google/genai 与 google-shared，区别在需要 GCP 项目、区域与 ADC 鉴权。"
tags: [pi, ai]
---

## 这个文件是什么

```ts
import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

export const googleVertexApi = (): ProviderStreams => lazyApi(() => import("./google-vertex.ts"));
```

机制见 `230-anthropic-messages` 篇：`lazyApi`（`packages/ai/src/api/lazy.ts:73`）包住动态 import。

## 真实适配器的特殊之处

`google-vertex.ts` 同样从 `@google/genai` 导入 `GoogleGenAI`（`packages/ai/src/api/google-vertex.ts:4`），但额外导入 `ResourceScope`、`ThinkingLevel`（`packages/ai/src/api/google-vertex.ts:6-8`）等 Vertex 专属概念。它与 `233-google-generative-ai` 共用 `google-shared.ts` 的转换逻辑（`packages/ai/src/api/google-vertex.ts:33-43`），区别在接入身份：

- Vertex 走 **GCP Vertex AI**，需要配置 project、location，并通过 **ADC（Application Default Credentials，应用默认凭证）** 或服务账号鉴权。
- `google-generative-ai` 走公网 `generativelanguage` 端点，用 API Key 即可。

## 为什么需要懒加载

`@google/genai` 较重，且 Vertex 场景还涉及 GCP 凭证解析。延迟到首次调用才加载，避免无关厂商拖慢冷启动。

## 谁引用它

- 内置注册表：`packages/ai/src/compat.ts:185` 登记为 `"google-vertex"`。
- provider 工厂：`packages/ai/src/providers/google-vertex.ts:98` 的 `api: googleVertexApi()`。

## 与同类文件关系

- 与 `233-google-generative-ai` 同源于 `@google/genai`，共享 `google-shared.ts`，仅鉴权/接入点不同。
- 与 `230-anthropic-messages` 同为标准 4 行垫片。

## 自查清单

- [ ] 能否在 `packages/ai/src/api/google-vertex.ts:6` 找到 `ResourceScope` 的导入？
- [ ] 能否说清 Vertex 与 generativelanguage 公网路径的鉴权差异？
- [ ] 能否在 `packages/ai/src/compat.ts:185` 看到它登记？
