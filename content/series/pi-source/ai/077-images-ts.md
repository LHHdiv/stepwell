---
title: "16 · images.ts — 全局 `generateImages`（compat 路径）"
summary: "对照聊天的 compat.streamSimple：图像没有 stream，一次 Promise 返回 AssistantImages。分发键仍是 model.api。"
tags: [pi, ai]
---
源码：`packages/ai/src/images.ts`  
被谁调用：`compat.ts` 的 `export *`。文件第一行 `import "./providers/images/register-builtins.ts"` 是副作用：把 openrouter-images 注册进图像 API registry。

## 本课目标

对照聊天的 `compat.streamSimple`：图像没有 stream，一次 Promise 返回 `AssistantImages`。分发键仍是 `model.api`。

## 在系统中的位置

```text
import "@earendil-works/pi-ai/compat"
  → images.ts
      import register-builtins   // 注册 openrouter-images
export async function generateImages(model, context, options)
  getImagesApiProvider(model.api)
  provider.generateImages(...)
```

新产品应走 `createImagesModels().generateImages`（[18 课](/series/pi-source/ai/079-images-models-ts/)），带 auth merge。本函数**不**补 env API key。

## `generateImages`

```ts
const provider = resolveImagesApiProvider(model.api); // 没有就 throw
return provider.generateImages(model, context, options);
```

没有 `withEnvApiKey`、没有 Cloudflare 特例。调用方必须自己带 `apiKey`。失败由具体实现收成 `stopReason: "error"` 的 `AssistantImages`（openrouter-images 是这样），本层不 catch。

`resolveImagesApiProvider` 找不到实现 throw `No API provider registered for api: ${api}`——这是同步 throw，因为图像 API 返回 Promise 不是 stream，没法用 lazyStream 的 error 事件。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 未 import compat / 未 register | throw 未注册 |
| 缺 apiKey | 下层 generateImages 返回 error 结果或 throw，看实现 |
| 副作用 | 只要本模块被求值，builtin 图像 API 就进 registry |

## 下一课

图像 registry 本身：[17-images-api-registry.ts.md](/series/pi-source/ai/078-images-api-registry-ts/)。
