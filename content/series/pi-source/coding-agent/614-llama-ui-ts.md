---
title: "80 · llama/ui.ts — /llama 的全屏管理器"
summary: "无 Agent 事件。用 ctx.ui 的 TUI、theme、keybindings。LlamaUi 接口：showModels、select、confirm、searchModels、showStatus、connectionErr"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/extensions/llama/ui.ts`  
被谁调用：`showLlamaUi(ctx, fn)` 把 editor 槽换成管理 UI。

## 订阅什么

无 Agent 事件。用 `ctx.ui` 的 TUI、theme、keybindings。`LlamaUi` 接口：`showModels`、`select`、`confirm`、`searchModels`、`showStatus`、`connectionError`。

## 画什么

`frame()`：accent 边框 + 标题 + body + footer。模型列表：id、loaded/sleeping/其它状态、context 大小；底部一项 Download。搜索 HF：Input + 过滤列表。进度：`runWithProgress` 画百分比/消息，Esc 确认是否停止。

`showLlamaUi` 负责：挂组件、focus、结束后还原 editor。`fn` 里的 await 都假设 UI 已挂上。

## 失败与边界

只在 tui mode 调用。connectionError 是专用对话框，避免和普通 notify 抢。

## 下一课

[81-client.index.ts.md](/series/pi-source/coding-agent/616-client-index-ts/)
