---
title: "api/openrouter-images.lazy.ts — 按需加载 OpenRouter 图像生成适配器"
summary: "11 篇里唯一返回 ProviderImages（而非 ProviderStreams）的垫片，且它没有用 lazyApi，而是直接包裹一个动态 import 的 generateImages。"
tags: [pi, ai]
---

## 这个文件是什么

`openrouter-images.lazy.ts` 只有 10 行，而且与另外 10 篇**有一个根本区别**：它返回的是 `ProviderImages`，不是 `ProviderStreams`。因此它没有用 `lazyApi`，而是自己包了一层：

```ts
import type { ImagesModel, ProviderImages } from "../types.ts";

export const openrouterImagesApi = (): ProviderImages => ({
	generateImages: async (model, context, options) =>
		(await import("./openrouter-images.ts")).generateImages(
			model as ImagesModel<"openrouter-images">,
			context,
			options,
		),
});
```

（完整内容见 `packages/ai/src/api/openrouter-images.lazy.ts:1-10`。）

`ProviderImages` 的契约很简单：只要求导出 `generateImages`（`packages/ai/src/types.ts:289`），返回 `Promise<AssistantImages>`。所以它不需要 `lazyStream` 那套"同步返回流、异步加载"的机制——图像生成本就是一次性 `async` 调用，直接 `await import(...)` 即可。

## 真实适配器的特殊之处

`openrouter-images.ts` 从 `openai` 导入 `OpenAI`（`packages/ai/src/api/openrouter-images.ts:1`），但**不是用来聊天**：它走 OpenRouter 在 Chat Completions 上扩展的**图像生成**能力，把生成的图片塞进 `choices[].message.images`（`OpenRouterImageGenerationResponse`，`packages/ai/src/api/openrouter-images.ts:36-38`）。所以它复用的是 OpenAI 的 chat 客户端，却产出图像。

## 为什么需要懒加载

它同样依赖 `openai` 这个重型 SDK，而且只有"用 OpenRouter 出图"时才需要。动态 import 让普通文本对话完全不碰这条路径。注意：它**不在** `compat.ts` 的 `BUILTIN_APIS`（`packages/ai/src/compat.ts:178`）列表里——图像 API 与流式文本 API 是两套独立注册体系。

## 谁引用它

- provider 工厂：`packages/ai/src/providers/openrouter-images.ts:20` 的 `api: openrouterImagesApi()`。

## 与同类文件关系

- 与 `237-openai-completions` 同依赖 `openai`、同源自 OpenRouter，但本篇是图像生成、返回 `ProviderImages`。
- 与另外 10 篇的区别：不用 `lazyApi`、不返回 `ProviderStreams`。

## 自查清单

- [ ] 能否在 `packages/ai/src/api/openrouter-images.lazy.ts:3` 确认它返回 `ProviderImages`？
- [ ] 能否确认它没有调用 `lazyApi`？
- [ ] 能否在 `packages/ai/src/api/openrouter-images.ts:36` 找到 OpenRouter 的图像扩展结构？
- [ ] 能否解释它为何不在 `BUILTIN_APIS` 列表里？
