---
title: "06 · model-catalog.ts — 把分组对象拍成 typed catalog"
summary: "看懂为什么 ANTHROPICMODELS[\"claude-opus-4-7\"] 的类型是 Model<\"anthropic-messages\"> 而不是 Model<Api>。27 行全是类型运算。"
tags: [pi, ai]
---
源码：`packages/ai/src/model-catalog.ts`（27 行）  
被谁调用：各 `providers/*.models.ts`（生成文件）。本课表不写那些文件，但要知道 `flattenModelCatalog` 是它们的类型来源。

## 本课目标

看懂为什么 `ANTHROPIC_MODELS["claude-opus-4-7"]` 的类型是 `Model<"anthropic-messages">` 而不是 `Model<Api>`。27 行全是类型运算。

## 在系统中的位置

```text
scripts/generate-models.ts
  写出 providers/anthropic.models.ts
    flattenModelCatalog("anthropic", { "anthropic-messages": { "claude-...": { api: "anthropic-messages", ... } } })
      → ANTHROPIC_MODELS
  models.generated.ts 再把各家 ANTHROPIC_MODELS 收成 MODELS
```

运行时 `flattenModelCatalog` 就是 `Object.assign({}, ...Object.values(groups))`：把按 api 分组的嵌套对象拍成「模型 id → 模型」。类型参数才是价值。

## 类型逐步

```ts
export type ModelGroups = Record<string, Record<string, object>>;
```

外键是 api 名，内键是模型 id。

```ts
type ModelId<TGroups> = { [TApi in keyof TGroups]: keyof TGroups[TApi] }[keyof TGroups] & string;
```

所有内键的联合：`"claude-opus-4-7" | "claude-sonnet-4-6" | ...`。

```ts
type ModelApi<TGroups, TModelId> = {
  [TApi in keyof TGroups]: TModelId extends keyof TGroups[TApi] ? TApi : never
}[keyof TGroups] & Api;
```

给定一个模型 id，反查它属于哪个 api。于是：

```ts
export type ModelCatalog<TGroups, TProvider> = {
  [TModelId in ModelId<TGroups>]: Model<ModelApi<TGroups, TModelId>> & {
    id: TModelId;
    provider: TProvider;
  };
};
```

`catalog["claude-opus-4-7"].api` 的类型是 `"anthropic-messages"` 字面量。`stream(catalog["..."], ctx, { effort: "high" })` 才能类型检查 AnthropicOptions。

`flattenModelCatalog` 的 `const` 泛型参数锁住字面量，避免被拓宽成 `string`。`_provider` 参数只为了把 `TProvider` 推进返回类型，运行时不用。

## 失败与边界

运行时不做校验。两个分组里出现同一个模型 id，后 `Object.assign` 的赢，类型上会变成两边 api 的联合——生成器应保证 id 全局唯一（在一家之内）。

## 下一课

总表：[07-models.generated.ts.md](/series/pi-source/ai/068-models-generated-ts/)。
