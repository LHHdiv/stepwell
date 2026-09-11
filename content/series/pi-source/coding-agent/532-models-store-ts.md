---
title: "39 · models-store.ts — 远端目录缓存"
summary: "这不是 models.json。models-store.json 存厂家 refreshModels 拉下来的动态目录（etag、lastModified、models 数组）。auth check 用 InMemoryCodingA"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/models-store.ts`  
被谁调用：`ModelRuntime.create`；`pi-ai` 的 `createModels({ modelsStore })` 在 `refreshModels` 时读写。

## 本课目标

这不是 `models.json`。`models-store.json` 存厂家 `refreshModels` 拉下来的动态目录（etag、lastModified、models 数组）。auth check 用 `InMemoryCodingAgentModelsStore` 避免写盘。

## `FileModelsStore`

后端复用 `FileAuthStorageBackend`（同一套文件锁）。进程内按 path 共享 `readState`：未改 revision 时 `read` 不重新 parse。`write` / `delete` 带锁改 JSON。

`InMemoryCodingAgentModelsStore`：Map clone 出入，测试和 `--list-models` 的轻量 runtime 用。

## 失败与边界

坏 JSON 会在 parse 时 throw 到 refresh。与 auth.json 分开，避免凭证文件掺进大模型表。共享 readState 只记住**一个** path：自定义第二个 path 不进共享优化。

## 下一课

[40-remote-catalog-provider.ts.md](/series/pi-source/coding-agent/535-remote-catalog-provider-ts/)：pi.dev 如何盖在内置模型表上。
