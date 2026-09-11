---
title: "46 · visual-truncate.ts — 按折行后的视觉行截尾"
summary: "不直接上屏。建临时 Text 用真实 width/paddingX render 一次，得到视觉行数组，取最后 maxVisualLines 行，返回 skippedCount。调用方再拼「… N more lines」。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/visual-truncate.ts`  
谁调用：`bash-execution`、工具默认输出。

## 订阅什么

无。

## 画什么

不直接上屏。建临时 `Text` 用真实 `width`/`paddingX` `render` 一次，得到视觉行数组，取**最后** `maxVisualLines` 行，返回 `skippedCount`。调用方再拼「… N more lines」。

`paddingX=0` 给已经在 Box 里的内容（Box 自己有 padding）；`1` 给裸 Container。

## 失败与边界

空字符串返回空。截的是视觉行不是逻辑行：一行超长会占多行配额。

## 下一课

[47-diff.ts.md](/series/pi-source/coding-agent/548-diff-ts/)
