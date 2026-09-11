---
title: "47 · diff.ts — 给 edit 工具上色的 unified diff"
summary: "无。纯函数 renderDiff(diffText) → string（内部已含 ANSI）。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/diff.ts`  
谁调用：edit 工具的 `renderResult`（`core/tools/renderers/edit.ts`）。

## 订阅什么

无。纯函数 `renderDiff(diffText) → string`（内部已含 ANSI）。

## 画什么

解析 `+123 content` / `-123` / ` 123` 这种带行号的格式。连续删除+添加用 `diff.diffWords` 做行内反色。上下文 dim，删红，加绿。Tab 换成三空格。`filePath` 选项保留但不使用。

## 失败与边界

解析失败的行当上下文色原样输出。不要把 git 原生 `@@` hunk 头指望得很好看——edit 工具走自己的行号格式。

## 下一课

[48-custom-message.ts.md](/series/pi-source/coding-agent/550-custom-message-ts/)
