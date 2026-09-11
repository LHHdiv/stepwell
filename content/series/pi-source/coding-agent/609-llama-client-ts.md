---
title: "77 · llama/client.ts — llama.cpp HTTP 客户端"
summary: "这是对 llama.cpp router HTTP API 的薄封装，不是 OpenAI 兼容推理（推理走 pi-ai 的 openai-completions + llamaInferenceUrl）。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/extensions/llama/client.ts`  
被谁调用：`llama/index.ts`、`provider.ts`。

## 本课目标

这是对 llama.cpp **router HTTP API** 的薄封装，不是 OpenAI 兼容推理（推理走 `pi-ai` 的 openai-completions + `llamaInferenceUrl`）。

## 能力

- `list` / `props`：模型目录、`models_autoload`
- `load` / `unload` / `download`：POST，然后 `loadAndWait` 等 SSE/`LlamaModelEvent` 直到 loaded 或 failed
- 进度：`LlamaProgress` `{ message, ratio, detail }` 回给 UI
- `normalizeLlamaServerUrl`：去尾斜杠、默认 `http://127.0.0.1:8080`
- `formatBytes` 给量化文件大小

`linkSignal` 把调用方 AbortSignal 接到内部 timeout。`sleep` 可被 abort。

## 失败与边界

错误 JSON 抽 `error.message`。网络失败原样 throw，由 index 判断 `isConnectionError`。

## 下一课

[78-llama.huggingface.ts.md](/series/pi-source/coding-agent/611-llama-huggingface-ts/)
