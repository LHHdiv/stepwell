---
title: "31 · fuzzy.ts — 子序列打分"
summary: "fuzzyMatch：query 字符按序出现即中，分数越低越好。连续、词边界（[-./:] 后）加分（减分），空隙罚分。完全相等再减 100。ab12 配不上时试 12ab（+5 罚），方便型号字符串。"
tags: [pi, tui]
---
源码：`packages/tui/src/fuzzy.ts`

## 本课目标

`fuzzyMatch`：query 字符按序出现即中，分数越低越好。连续、词边界（`[-_./:]` 后）加分（减分），空隙罚分。完全相等再减 100。`ab12` 配不上时试 `12ab`（+5 罚），方便型号字符串。

`fuzzyFilter`：按空白和 `/` 切 token，**全部** token 要命中，总分排序。

## 失败与边界

空 query：filter 返回原数组。大小写不敏感。不是 typo 容忍（没有编辑距离）。

## 下一课

[32-kill-ring.ts.md](/series/pi-source/tui/454-kill-ring-ts/)。
