---
title: "data-json.d.ts — JSON 模块的环境声明，不是模型表"
summary: "看清它和 data/.json、.models.ts 的关系：本文件不加载任何厂家数据。它告诉 TypeScript「从 .json 进来的 default export 类型是 unknown」。真正精确的模型类型不靠它，靠 reso"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/data-json.d.ts`  
核心导出：无值，只有 `declare module "*.json"`  
被谁调用：类型检查器。运行时不存在这份文件的 JS。

## 本课目标

看清它和 `data/*.json`、`*.models.ts` 的关系：本文件**不加载任何厂家数据**。它告诉 TypeScript「从 `.json` 进来的 default export 类型是 `unknown`」。真正精确的模型类型不靠它，靠 `resolveJsonModule` 对真实 json 文件的推断，再加上 `ModelCatalog<typeof values, ProviderId>`。

## 这个文件在系统中的位置

```text
*.models.ts
  import values from "./data/anthropic.json" with { type: "json" }

类型从哪来：
  1. tsconfig.base.json  "resolveJsonModule": true
     → 若 anthropic.json 在磁盘上，values 是分组对象的字面量类型
  2. 本文件 declare module "*.json" { const value: unknown }
     → 某些工具链/缺文件时的宽声明
```

`packages/ai/tsconfig.build.json` 的 `exclude` 含 `**/*.d.ts` 和 `src/**/*.d.ts`，**正式 build 不收录本文件**。发布产物里的类型来自真实 json（build 脚本会把 `src/providers/data` copy 到 `dist/providers/data`）。

json 目录 gitignore。刚 clone、还没 `hydrate-model-data` 时，没有 anthropic.json。编辑器若仍要解析 `*.models.ts`，宽声明避免「找不到模块」。hydrate 之后应以真实 json 形状为准。

## 导出什么

```ts
declare module "*.json" {
  const value: unknown;
  export default value;
}
```

没有 named export。没有厂家 id。没有 `MODELS`。

若 build 误收录它，`typeof values` 变成 `unknown`，`ModelCatalog<unknown, "anthropic">` 推不出精确 id 联合，`getBuiltinModel("anthropic", "claude-opus-4-7")` 的自动完成会坏。所以 exclude 是对的。

## 如何鉴权 / baseUrl

无。本文件与 HTTP 无关。

## 和 all.ts 的关系

`all.ts` 有一行：

```ts
import modelDataManifest from "./data/.manifest.json" with { type: "json" };
```

`.manifest.json` 同样走 json import。`getBuiltinModelDataGeneratedAt()` 读 `generatedAt`。本 d.ts 不出现在 all.ts 的 import 列表里。

## 失败与边界

- 不要把本文件理解成「所有 json 都是 unknown，所以模型表没有类型」——那是忽略了 resolveJsonModule 和 exclude。
- 不要在这里写具体厂家的 interface；厂家形状以生成出的 json 为准，校验在 `scripts/model-data.ts`。
- `with { type: "json" }` 是 import attributes，Node 和 TS 都要它才把文件当 JSON 模块而不是 TS。

## 下一课

json 里到底有什么：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。包装：[anthropic.models.ts](/series/pi-source/ai/147-anthropic-models-ts/)。
