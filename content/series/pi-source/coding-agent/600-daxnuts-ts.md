---
title: "73 · daxnuts.ts — OpenCode + Kimi K2.5 彩蛋"
summary: "无 session。~2 秒（25 tick × 80ms）truecolor 半块图淡入，然后停 interval。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/daxnuts.ts`  
谁创建：切到 `opencode` 且 id 含 `kimi-k2.5` 时 `handleDaxnuts`。

## 订阅什么

无 session。~2 秒（25 tick × 80ms）truecolor 半块图淡入，然后停 interval。

## 画什么

32×32 RGB 肖像（hex 常量），`▄` 的 fg/bg 各表示一行像素。需要 truecolor；256 色终端会很难看但仍画。

## 失败与边界

硬编码 tribute，不读网络。

## 下一课

[74-earendil-announcement.ts.md](/series/pi-source/coding-agent/602-earendil-announcement-ts/)
