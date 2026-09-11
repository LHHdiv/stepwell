---
title: "89 · experimental.ts — 实验功能总开关"
summary: "areExperimentalFeaturesEnabled() ≡ process.env.PIEXPERIMENTAL === \"1\"。first-time setup、实验 CLI、部分未完成 UI 都问它。其它值（true/ye"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/experimental.ts`

`areExperimentalFeaturesEnabled()` ≡ `process.env.PI_EXPERIMENTAL === "1"`。first-time setup、实验 CLI、部分未完成 UI 都问它。其它值（true/yes）不算。

## 下一课

[90-export-html-index.ts.md](/series/pi-source/coding-agent/634-export-html-index-ts/)。
