---
title: "10 · components/truncated-text.ts — 单行截断"
summary: "和 Text 对比：只取第一行（遇 \\n 切开），truncateToWidth，总是 pad 到恰好 width 列。空文本仍会产出 padding 空行。"
tags: [pi, tui]
---
源码：`packages/tui/src/components/truncated-text.ts`

## 本课目标

和 Text 对比：只取第一行（遇 `\n` 切开），`truncateToWidth`，总是 pad 到恰好 `width` 列。空文本仍会产出 padding 空行。

## 逐函数

`constructor(text, paddingX=0, paddingY=0)`。无 setText——要改就换实例或自己加。`invalidate` 空。

`render`：上下 `paddingY` 个 `" ".repeat(width)`；中间一行 left pad + truncate + right pad + 补空格到 width。

## 失败与边界

- 没有 ANSI 背景函数。
- `availableWidth = max(1, width - paddingX*2)`。padding 过大时文本只剩 1 列。

## 下一课

[11-components.spacer.ts.md](/series/pi-source/tui/433-components-spacer-ts/)。
