---
title: "76 · llama/index.ts — /llama 命令与目录同步"
summary: "看本地 llama.cpp router 如何变成 Pi 的一个 provider：注册 createLlamaProvider()，斜杠命令只在 ctx.mode === \"tui\" 工作。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/extensions/llama/index.ts`  
被谁调用：扩展 runner 加载内置 `llama.cpp`。

## 本课目标

看本地 llama.cpp router 如何变成 Pi 的一个 provider：注册 `createLlamaProvider()`，斜杠命令只在 `ctx.mode === "tui"` 工作。

## 流程

`configuredClient(ctx)`：从 `modelRegistry.getProviderAuth("llama.cpp")` 拿 `LLAMA_BASE_URL` 和 apiKey。没配置则 notify 去 `/login llama.cpp`。

`syncCatalog`：HTTP `client.list`，`provider.setCatalog`，再 `modelRegistry.refresh({ providers: ["llama.cpp"], allowNetwork: true })`。即使 `PI_OFFLINE` 也允许——因为已经打到用户自己的 server。

命令循环：`showLlamaUi` 全屏管理器。选模型：已 loaded/sleeping → 确认 unload；unloaded → 可选卸掉其它再 load；download → HuggingFace 搜索。load 用 `runWithProgress`，可取消（`client.unload` 当 cancel）。replace 模式失败会尝试把原来的模型 load 回去。

连接错误：`ui.connectionError` 提供 retry/close，不把 fetch failed 当普通红字刷屏。

## 失败与边界

print/RPC 调 `/llama` 只 notify「interactive only」。gated HF 模型要用户自己去网页授权，扩展只提示 Continue。

## 下一课

[77-llama.client.ts.md](/series/pi-source/coding-agent/609-llama-client-ts/)
