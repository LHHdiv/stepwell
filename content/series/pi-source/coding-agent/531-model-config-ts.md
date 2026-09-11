---
title: "38 · model-config.ts — 只读 models.json"
summary: "models.json 是用户覆盖层：改 baseUrl、加自定义厂家、给某个 model id 改 contextWindow/headers、OpenRouter 路由。本类用 TypeBox schema 校验，失败则 getEr"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/model-config.ts`  
被谁调用：`ModelRuntime.create` 的 `ModelConfig.load`。不持有凭证。

## 本课目标

`models.json` 是用户覆盖层：改 baseUrl、加自定义厂家、给某个 model id 改 contextWindow/headers、OpenRouter 路由。本类用 TypeBox schema 校验，失败则 `getError()` 有文案，配置当空，**不 throw 出 load**。

## 文件里有什么

每个 provider 块可含：name、baseUrl、api、headers、apiKey（字面量 / `$ENV` / `!cmd`）、oauth、models 列表、`modelOverrides`。还有 OpenRouter / Vercel 路由、thinkingLevel 映射、openai-completions 兼容开关（`thinkingFormat`、`maxTokensField` 等）。

`load`：读文件、`stripBom`、`stripJsonComments`、Compile 校验。路径经 `normalizePath`。

不可变快照：runtime 不在请求路径改这份对象；用户改盘后要 `refresh` 再 `ModelConfig.load`。

## 失败与边界

坏 JSON / schema 失败：空 config + error 字符串，内置厂家仍可用。注释 JSON 是故意支持的。本文件不解析 `$ENV`——那是 `resolve-config-value` 在组 Provider 时做。

## 下一课

[39-models-store.ts.md](/series/pi-source/coding-agent/532-models-store-ts/)：远端模型目录的磁盘缓存。
