---
title: "images/register-builtins.ts — 把 openrouter-images 登记进旧全局表"
summary: "这是图像路径上的 api 注册表，键是 model.api（\"openrouter-images\"），不是厂家 id。新代码应走 ImagesProvider.generateImages（openrouter-images.ts）。本"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/images/register-builtins.ts`  
核心导出：`generateImagesOpenRouter`、`registerBuiltInImagesApiProviders`  
被谁调用：模块加载时**立刻** `registerBuiltInImagesApiProviders()`。`compat.ts` 和 `images.ts` re-export 本文件，所以 import compat 就有副作用。`package.json` 的 `sideEffects` 列出了本文件，避免 bundler 摇掉。

## 本课目标

这是图像路径上的 **api 注册表**，键是 `model.api`（`"openrouter-images"`），不是厂家 id。新代码应走 `ImagesProvider.generateImages`（[openrouter-images.ts](/series/pi-source/ai/200-openrouter-images-ts/)）。本文件服务 `@earendil-works/pi-ai/compat` 的旧 `generateImages(model, ...)`：按 api 找函数。

读完应能区分：

| | 厂家工厂 | 本文件 |
|---|---|---|
| 登记到 | `ImagesModels.setProvider` | `images-api-registry` 按 api 字符串 |
| 何时跑 | `builtinImagesModels()` 显式调用 | import 本模块的副作用 |
| 鉴权 | ImagesModels.applyAuth | 旧 compat 路径自己塞 env key |

## 这个文件在系统中的位置

```text
import "@earendil-works/pi-ai/compat"
  → export * from register-builtins.ts
  → registerImagesApiProvider({ api: "openrouter-images", generateImages })

旧 generateImages(model)
  getImagesApiProvider(model.api)
  generateImagesOpenRouter(model, context, options)
    动态 import api/openrouter-images.ts
```

`all.ts` **不 import** 本文件。只 `import { builtinModels } from ".../providers/all"` 不会注册图像 api。这是有意的：核心 index 声称 side-effect free。

## 导出什么

`generateImagesOpenRouter`：`ImagesFunction<"openrouter-images", ImagesOptions>`。内部 lazy load 真正实现。加载失败返回 `AssistantImages` 且 `stopReason: "error"`，**不 throw**——图像 API 约定失败也是一条结果对象。

`registerBuiltInImagesApiProviders()`：往 registry 塞一条。模块底再调一次，所以「import 即注册」。函数导出是为了测试或重复调用（registry 是 Map.set，幂等覆盖）。

## 如何鉴权 / baseUrl

本文件不鉴权。旧 compat 的 `generateImages` 会用 `getEnvApiKey("openrouter")` 之类往 options 里塞 key。新 `ImagesModels` 走与聊天相同的 CredentialStore。

模型 baseUrl 在 `IMAGE_MODELS` 条目上，仍是 OpenRouter `https://openrouter.ai/api/v1`。

## 和 all.ts 的关系

平行世界。`all.ts` 的 `builtinImagesProviders()` 构造 `ImagesProvider`；本文件给 **api 字符串** 登记生成函数。两套在迁移期共存。compat 头注释：等 ModelManager 迁完会删旧全局 API。

`BuiltinProvider` 与图像无关。`KnownImagesProvider = "openrouter"`。

## 逐步精读

`createLazyLoadErrorImages` 填齐 `AssistantImages` 必填字段：空 `output`、errorMessage、timestamp。调用方不能靠 throw 做控制流。

动态 import 路径 `../../api/openrouter-images.ts` 与 lazy api 文件指向同一实现。`openrouter-images.lazy.ts` 给 ImagesProvider 用；本文件给 registry 用。两处 lazy 是为了两条入口都能 code-split。

`registerImagesApiProvider` 用 `wrapGenerateImages` 校验 `model.api === "openrouter-images"`，防止把聊天模型塞进来。

## 失败与边界

- 只 import `pi-ai` 核心 index：**没有**本副作用。旧 `generateImages` 会找不到 api。
- bundler 若忽略 sideEffects 字段、tree-shake 掉本模块，compat 出图静默坏掉。所以 package.json 显式列出。
- 再登记同一 api 会覆盖。测试不要依赖「内建一定先注册」。

## 下一课

厂家：[openrouter-images.ts](/series/pi-source/ai/200-openrouter-images-ts/)。聊天登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。
