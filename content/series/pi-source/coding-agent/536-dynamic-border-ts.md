---
title: "41 · dynamic-border.ts — 随终端宽度的一根横线"
summary: "无。每次 render(width) 画 ─.repeat(width)，经 color 函数染色。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/dynamic-border.ts`  
谁创建：几乎所有选择器、bash 块、changelog 分隔。

## 订阅什么

无。每次 `render(width)` 画 `─`.repeat(width)，经 `color` 函数染色。

## 画什么

一行水平线。默认 `theme.fg("border")`。

## 失败与边界

jiti 加载的扩展若在模块加载时捕获 `theme`，可能尚未 `initTheme`。导出给扩展的组件应**传入** color 函数，不要依赖默认参数里的 `theme`。

## 下一课

[42-bordered-loader.ts.md](/series/pi-source/coding-agent/538-bordered-loader-ts/)
