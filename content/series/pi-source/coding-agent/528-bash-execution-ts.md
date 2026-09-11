---
title: "37 · bash-execution.ts — `!` 命令的输出块"
summary: "不订 session。调用方 appendOutput(chunk)、setComplete(exitCode, cancelled, truncation, fullOutputPath)、setExpanded。跑的时候内部 Loa"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/bash-execution.ts`  
谁创建：`handleBashCommand`；历史重放 `role === "bashExecution"`。

## 订阅什么

不订 session。调用方 `appendOutput(chunk)`、`setComplete(exitCode, cancelled, truncation, fullOutputPath)`、`setExpanded`。跑的时候内部 `Loader` 自己向 TUI 要帧。

## 画什么

上下 `DynamicBorder`（`!!` 排除上下文用 dim，否则 bashMode 色），标题 `$ command`，中间：运行中转圈「Running… (Esc to cancel)」；完成后输出。折叠只留约 20 行视觉行（`truncateToVisualLines`），提示 expand。输出先 `stripAnsi`。截断时指出 `fullOutputPath`。

## 失败与边界

- 退出码非 0 标 error 色。cancelled 另有文案。
- 流式 chunk 按行拼接，半行会粘到上一行。

## 下一课

[38-footer.ts.md](/series/pi-source/coding-agent/530-footer-ts/)
