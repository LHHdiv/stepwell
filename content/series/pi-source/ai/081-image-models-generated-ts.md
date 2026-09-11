---
title: "20 · image-models.generated.ts — 内置图像模型表"
summary: "认出结构：目前只有 openrouter 一家，每条是 satisfies ImagesModel<\"openrouter-images\">。字段比聊天模型少：没有 reasoning、contextWindow、maxTokens、c"
tags: [pi, ai]
---
源码：`packages/ai/src/image-models.generated.ts`  
生成：`npm run generate-image-models`（`scripts/generate-image-models.ts`）。  
被谁调用：`image-models.ts`。

## 本课目标

认出结构：目前只有 `openrouter` 一家，每条是 `satisfies ImagesModel<"openrouter-images">`。字段比聊天模型少：没有 `reasoning`、`contextWindow`、`maxTokens`、`compat`。

## 在系统中的位置

和 `models.generated.ts` 分工：聊天 vs 图像。OpenRouter 上既有 LLM 也有 FLUX，分属两张表、两套 api（`openai-completions` vs `openrouter-images`）。

## 一条模型长什么样

```ts
"black-forest-labs/flux.2-pro": {
  id: "black-forest-labs/flux.2-pro",
  name: "Black Forest Labs: FLUX.2 Pro",
  api: "openrouter-images",
  provider: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  input: ["text", "image"],
  output: ["image"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
}
```

`input` 含 `"image"` 表示能图生图。`output` 决定请求 `modalities`（见 41 课）。生成器把 cost 填 0 时，用量仍计数但美元为 0。

## 失败与边界

手改会被生成覆盖。`--strict` 校验失败则 build 挂。增加第二家图像厂家要改 `KnownImagesProvider`、registry、生成脚本，不只是往这个对象加键。

## 下一课

进入 `src/api/`。先读所有协议共享的懒加载：[21-api-lazy.ts.md](/series/pi-source/ai/082-api-lazy-ts/)。
