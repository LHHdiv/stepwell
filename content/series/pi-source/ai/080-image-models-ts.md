---
title: "19 · image-models.ts — 静态图像模型查找"
summary: "看模块加载时如何把 IMAGEMODELS 灌进嵌套 Map，以及查找函数的类型如何从生成常量推断 ImagesApi。"
tags: [pi, ai]
---
源码：`packages/ai/src/image-models.ts`  
被谁调用：compat 的 `getImageModel` / `getImageModels` / `getImageProviders`。对应聊天侧已废弃的 `getModel`。

## 本课目标

看模块加载时如何把 `IMAGE_MODELS` 灌进嵌套 Map，以及查找函数的类型如何从生成常量推断 `ImagesApi`。

## 在系统中的位置

```text
image-models.generated.ts  IMAGE_MODELS
  → 本文件模块顶层 for 循环填 imageModelRegistry
getImageModel("openrouter", "black-forest-labs/flux.2-pro")
```

没有 `createImagesModels` 的动态叠加。扩展加的图像模型不会出现在这里。

## 类型

```ts
type ImageModelApi<TProvider, TModelId> =
  (typeof IMAGE_MODELS)[TProvider][TModelId] extends { api: infer TApi }
    ? TApi extends ImagesApi ? TApi : never
    : never;
```

`getImageModel("openrouter", "...")` 返回 `ImagesModel<"openrouter-images">`。id 写错会是类型错误（id 必须是 `keyof IMAGE_MODELS["openrouter"]`）。

`getImageProviders()` 返回 registry 的 key。`getImageModels(provider)` 没有这家则 `[]`。

找不到具体模型时 `getImageModel` 仍按类型断言返回——运行时可能是 `undefined` 被当成模型。调用方应准备好。这和聊天 `getBuiltinModel` 的严格程度可能不同，读调用处。

## 失败与边界

未知 provider → `getImageModels` 空数组。未知 modelId → `Map.get` undefined，被 `as` 掉。生成文件更新后本模块的 Map 在下次加载才变。

## 下一课

生成出来的图像常量：[20-image-models.generated.ts.md](/series/pi-source/ai/081-image-models-generated-ts/)。
