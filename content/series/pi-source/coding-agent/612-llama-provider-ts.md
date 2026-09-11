---
title: "79 · llama/provider.ts — 把 router 目录变成 pi-ai Provider"
summary: "createLlamaProvider() 返回 { provider, setCatalog }。catalog 是内存里的 Model<\"openai-completions\">[]：id、contextWindow 来自 meta"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/extensions/llama/provider.ts`  
被谁调用：`llama/index.ts` `pi.registerProvider`。

## 本课目标

`createLlamaProvider()` 返回 `{ provider, setCatalog }`。catalog 是内存里的 `Model<"openai-completions">[]`：id、contextWindow 来自 `meta.n_ctx`，图像模态看 architecture，cost 全 0，`compat.supportsStore=false` 等。

`modelIsSelectable`：loaded/sleeping 永远可选；unloaded 仅当 router `models_autoload` 且 source 是 preset 且没 failed。避免把正在下载的垃圾项丢进 `/model`。

`refreshModels`：用 credential 里的 URL 新建 `LlamaClient.list`。stream 走 `stream`/`streamSimple`，baseUrl 是 `llamaInferenceUrl(serverUrl)`（通常 `/v1`）。

认证：api key + `LLAMA_BASE_URL`。默认 URL `http://127.0.0.1:8080`。

## 失败与边界

`setCatalog` 是 /llama UI 在 refresh 之前的乐观更新，避免列表和 Pi 模型表短暂不一致。

## 下一课

[80-llama.ui.ts.md](/series/pi-source/coding-agent/614-llama-ui-ts/)
