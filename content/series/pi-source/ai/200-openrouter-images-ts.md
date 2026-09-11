---
title: "openrouter-images.ts — 图像厂家，不是聊天 openrouter.ts"
summary: "聊天 OpenRouter 和出图 OpenRouter 是两个工厂、两套模型、两份协议，同一个 provider id \"openrouter\"。它们分别活在 Models 与 ImagesModels 里，不会在同一张 Map 里撞"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/openrouter-images.ts`  
核心导出：`openrouterImagesProvider`  
被谁调用：`all.ts` 的 `builtinImagesProviders()` / `builtinImagesModels()`。**不**进 `builtinProviders()`。

## 本课目标

聊天 OpenRouter 和出图 OpenRouter 是两个工厂、两套模型、两份协议，**同一个 provider id `"openrouter"`**。它们分别活在 `Models` 与 `ImagesModels` 里，不会在同一张 Map 里撞车。鉴权故意相同：一把 `OPENROUTER_API_KEY`、同一套 `loadOpenRouterOAuth`。

`model.api` 这里是 `"openrouter-images"`（`KnownImagesApi`），不是 `"openai-completions"`。

## 这个文件在系统中的位置

```text
openrouterImagesProvider()
  createImagesProvider({
    id: "openrouter",
    auth: 与聊天厂相同,
    models: Object.values(IMAGE_MODELS.openrouter),  // image-models.generated.ts
    api: openrouterImagesApi(),                      // api/openrouter-images.lazy.ts
  })
  → builtinImagesModels().setProvider
```

生成图像：`ImagesModels.generateImages(model, context)` → 解析 auth → `ImagesProvider.generateImages` → lazy 进 `api/openrouter-images.ts`。

副作用注册见 [images/register-builtins.ts](/series/pi-source/ai/211-register-builtins-ts/)：compat 旧 API 按 `model.api` 找 `generateImages`。新路径走 ImagesProvider，不靠全局 registry。

## 导出什么

`openrouterImagesProvider(): ImagesProvider`。注意返回类型不是 `Provider`。没有 `stream`/`streamSimple`。

模型来自 `IMAGE_MODELS.openrouter`（约 52 款 FLUX / Seedream / Gemini image 等），**不是** `providers/data/openrouter.json`（那是 360 款聊天模型）。

## 如何鉴权 / baseUrl

与 [openrouter.ts](/series/pi-source/ai/202-openrouter-ts/) 一字不差：

```ts
auth: {
  apiKey: envApiKeyAuth("OpenRouter API key", ["OPENROUTER_API_KEY"]),
  oauth: lazyOAuth({ name: "OpenRouter OAuth", loginLabel: "Sign in with OpenRouter", load: loadOpenRouterOAuth }),
}
```

用户 login 一次 OpenRouter，credential store 按 **provider id** `"openrouter"` 存一条。聊天 `Models.getAuth` 和图像 `ImagesModels.getAuth` 读同一槽。

图像模型 `baseUrl` 也是 `https://openrouter.ai/api/v1`。路径与 payload 在图像协议文件里，和 chat completions 不同。

## 和 all.ts 的关系

```ts
export function builtinImagesProviders(): ImagesProvider[] {
  return [openrouterImagesProvider()];
}
```

`builtinProviders()` 里的是 `openrouterProvider()`（聊天）。两行都在 all.ts，数组不同。只构造聊天 `builtinModels()` 的进程没有图像厂家，除非再调 `builtinImagesModels()`。

## 逐步精读

`createImagesProvider`（`images-models.ts`）是聊天 `createProvider` 的瘦身版：`getModels`、可选 `refreshModels`、`generateImages`。本厂静态目录，无 refresh。

`openrouterImagesApi()` lazy，避免没做出图的 bundle 拖进图像实现。

id 共用 `"openrouter"` 是产品决策：状态栏「OpenRouter 已登录」同时覆盖聊天和出图。若拆成 `openrouter-images` 用户要登两次。

## 失败与边界

- 把聊天 `Model` 传给 `generateImages`：类型过不去；强行传会在图像协议里因缺 `output: ["image"]` 等字段失败。
- 未登录：与聊天相同，getAuth undefined。
- `IMAGE_MODELS` 由 `scripts/generate-image-models.ts` 生成，与 chat 的 generate-models 分开跑。

## 下一课

compat 副作用：[images/register-builtins.ts](/series/pi-source/ai/211-register-builtins-ts/)。聊天厂：[openrouter.ts](/series/pi-source/ai/202-openrouter-ts/)。
