---
title: "18 · images-models.ts — 图像侧的 `Models`"
summary: "对照聊天 Models：少了什么（无 refresh 世代、无 transformHeaders、无 deferred）、generateImages 失败为什么 never reject。"
tags: [pi, ai]
---
源码：`packages/ai/src/images-models.ts`  
被谁调用：需要带 credential store 的图像生成。和 `models.ts` 平行：`ImagesProvider` / `ImagesModels` / `createImagesProvider` / `createImagesModels`。

## 本课目标

对照聊天 `Models`：少了什么（无 refresh 世代、无 transformHeaders、无 deferred）、`generateImages` 失败为什么 **never reject**。

## 在系统中的位置

```text
createImagesModels({ credentials, authContext })
  setProvider(createImagesProvider({ id, auth, models, api }))
  generateImages(model, context, options)
    getAuth(model)
    provider.generateImages(requestModel, { ...options, apiKey, headers, env })
```

`CreateModelsOptions` 从 `models.ts` 复用（credentials + authContext）。图像没有 `modelsStore`——动态目录若存在，只活在厂家内存里。

## `ImagesProvider`

`getModels()` 同步、禁止 throw（集合层当空）。`refreshModels?()` 无 context 对象，比聊天简化：没有 stored snapshot、没有 publish 世代。`generateImages` 返回 `Promise<AssistantImages>`。

## `createImagesProvider`

`refreshModels` 若提供：模块级 `inflightRefresh` 合并并发调用；成功替换 `models`；finally 清 inflight。失败让 list 停在上一份，rejection 传给 `ImagesModels.refresh(provider)`，被包成 `ModelsError("model_source")`。

`generateImages` 直接转给 `input.api.generateImages`。没有按 `model.api` 的 map——一家图像店目前一种协议。

## `ImagesModelsImpl.generateImages`

```ts
try {
  const provider = this.providers.get(model.provider);
  if (!provider) throw new ModelsError("provider", `Unknown provider`);
  const resolution = await this.getAuth(model, { apiKey, env, signal });
  const auth = resolution?.auth;
  if (!auth) return provider.generateImages(model, context, options); // 未配置也往下传
  // merge apiKey/headers/env，覆盖 model.baseUrl
  return await provider.generateImages(requestModel, context, { ...options, apiKey, headers, env });
} catch (error) {
  return { api, provider, model: model.id, output: [], stopReason: "error", errorMessage, timestamp };
}
```

和聊天不同：

1. **未配置 auth 不 throw**，把原始 options 交给厂家（厂家自己报缺 key）。
2. 任何 throw（含未知厂家、getAuth 的 oauth 失败）都变成 `AssistantImages` 的 error，Promise resolve。调用方永远不用 try/catch 业务失败。

`refresh()` 无 id：`allSettled` 全部动态厂家，不 reject。有 id：那一家失败才 throw `ModelsError`。

`getAuth` 复用 `resolveProviderAuth`，和聊天同一把 credential store 锁。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 未知厂家 | 返回 error AssistantImages，不 reject |
| OAuth refresh 失败 | 同上（catch ModelsError） |
| 未配置 | 仍调用厂家，通常再得到 error 结果 |
| 并发 refresh | 同一家共享 inflight；聊天侧是 generation abort |

## 下一课

静态图像目录读取：[19-image-models.ts.md](/series/pi-source/ai/080-image-models-ts/)。
