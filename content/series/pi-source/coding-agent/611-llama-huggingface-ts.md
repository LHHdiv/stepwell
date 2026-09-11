---
title: "78 · llama/huggingface.ts — 搜 GGUF 量化"
summary: "顺序：HFTOKEN 环境变量 → HFTOKENPATH → $HFHOME/token → $XDGCACHEHOME/huggingface/token → ~/.cache/huggingface/token。不把 token "
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/extensions/llama/huggingface.ts`  
被谁调用：`/llama` 的 download 流程。

## `findHuggingFaceToken`

顺序：`HF_TOKEN` 环境变量 → `HF_TOKEN_PATH` → `$HF_HOME/token` → `$XDG_CACHE_HOME/huggingface/token` → `~/.cache/huggingface/token`。不把 token 写进 Pi 的 auth.json。

## `HuggingFaceClient`

`search(query)` 打 HF API 模型搜索。`details(id)` 返回 `gated` 和量化列表。量化名从文件名正则抠（Q4_K_M、IQ4_XS、BF16…），shard 后缀剥掉。429 时解析 `t=` 延迟。15s timeout。

## 失败与边界

没 token 仍能搜公开模型；gated=manual 必须用户浏览器授权后再 Continue。

## 下一课

[79-llama.provider.ts.md](/series/pi-source/coding-agent/612-llama-provider-ts/)
