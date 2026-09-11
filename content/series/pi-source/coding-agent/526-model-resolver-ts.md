---
title: "36 · model-resolver.ts — 把字符串变成 Model"
summary: "匹配顺序是精确引用 → 子串 → 别名优先于带日期的 id。--model foo:high 的冒号是思考等级，但 OpenRouter 的 id 本身也可含冒号，所以算法是「先整串当模型，失败再拆最后一个冒号」。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/model-resolver.ts`  
被谁调用：`main` 解析 `--model`/`--models`；sdk `findInitialModel` / `restoreModelFromSession`；auth 子命令。

## 本课目标

匹配顺序是精确引用 → 子串 → 别名优先于带日期的 id。`--model foo:high` 的冒号是思考等级，但 OpenRouter 的 `id` 本身也可含冒号，所以算法是「先整串当模型，失败再拆最后一个冒号」。

## `findExactModelReferenceMatch`

1. 全小写比较 `provider/id`
2. 含 `/` 则按 provider + id
3. 否则裸 id，**跨厂家多于一个命中则拒绝**（返回 undefined）

## `tryMatchModel`

精确失败则 `id` 或 `name` 包含 pattern。多命中：`isAlias`（`-latest` 或没有 `-YYYYMMDD` 后缀）优先，再按 id 降序。

## `parseModelPattern`

整串匹配成功 → 模型，thinking 未指定。  
否则最后一个 `:`：后缀是合法 ThinkingLevel 则用之并递归前缀；非法后缀可警告后当 `off` 或整段失败（看 options）。

## `resolveCliModel`

给 `--model` 用。可带 `--provider` 限制。匹配不上时，若该厂家有模型，用 `buildFallbackModel` 克隆默认模型但改 id——这就是 warning「Using custom model id」：用户点名了一个目录里没有的 id，请求仍会打出去。

## `resolveModelScope` / `--models`

每个 pattern 产出 `ScopedModel`（模型 + 可选 thinking）。诊断：重复、一个都匹配不上。给 Ctrl+P 循环列表，不是当前会话模型。

## `findInitialModel`

无会话历史时：设置 `defaultProvider`/`defaultModel` → 各厂家 `defaultModelPerProvider` 表 → 第一个 available。被 sdk 在 options.model 和历史恢复都失败后调用。

## `restoreModelFromSession`

历史里的 provider/modelId **且当前仍有认证** 才恢复。认证没了返回空，sdk 记下 fallback 文案。

## 失败与边界

模糊匹配可能选到「排序最高」的别名，不一定是用户心里那个。自定义 id fallback 没有真实 contextWindow，沿用默认模型的元数据。thinking 非法在 CLI 是 warning（args.ts），这里解析 scope 时也可能进 diagnostic。

## 下一课

[37-model-registry.ts.md](/series/pi-source/coding-agent/529-model-registry-ts/)：给扩展的同步门面。
