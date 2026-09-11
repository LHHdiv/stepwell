---
title: "17 · images-api-registry.ts — 图像协议的全局表"
summary: "看 wrapGenerateImages 如何校验 model.api，以及 sourceId 卸载和对话侧同一套路。"
tags: [pi, ai]
---
源码：`packages/ai/src/images-api-registry.ts`  
被谁调用：`images.ts` 的 `generateImages`；`register-builtins.ts` 注册 `openrouter-images`。结构几乎是 `compat.ts` 里对话 registry 的缩小版。

## 本课目标

看 `wrapGenerateImages` 如何校验 `model.api`，以及 `sourceId` 卸载和对话侧同一套路。

## 在系统中的位置

```text
registerImagesApiProvider({ api, generateImages }, sourceId?)
  Map<api, { provider, sourceId }>
generateImages(model, ...)
  getImagesApiProvider(model.api).generateImages
```

没有 `registerBuiltIn*` 在本文件——builtin 注册放在 `providers/images/register-builtins.ts`，由 images.ts 副作用触发。

## `wrapGenerateImages`

```ts
return (model, context, options) => {
  if (model.api !== api) throw new Error(`Mismatched api: ${model.api} expected ${api}`);
  return generateImages(model as ImagesModel<TApi>, context, options as TOptions);
};
```

和 `wrapStream` 一样，防止把 completions 模型塞进图像函数。

`registerImagesApiProvider` **会覆盖**同 api 的旧项（不像对话 builtin 那样 `if (!getApiProvider)`）。后注册的赢。目前只有一家 builtin，冲突面小。

没有 `unregister` 导出；扩展卸图像 API 没有公开函数。对话侧的 `unregisterApiProviders(sourceId)` 在这里没配对。

## 失败与边界

未注册 → `getImagesApiProvider` 返回 undefined，`images.ts` throw。api 不匹配 → wrap 里 throw。没有 stream，没有 lazy 包装。

## 下一课

带鉴权的图像集合：[18-images-models.ts.md](/series/pi-source/ai/079-images-models-ts/)。
