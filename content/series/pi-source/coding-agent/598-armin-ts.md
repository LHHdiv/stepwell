---
title: "72 · armin.ts — `/arminsayshi` 像素动画"
summary: "无 session。setInterval 推进 effect 状态，ui.requestRender()。随机选 typewriter/scanline/rain/fade/crt/glitch/dissolve 之一，把 31×36"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/armin.ts`  
谁创建：隐藏命令 `handleArminSaysHi`，append 到 chat。

## 订阅什么

无 session。`setInterval` 推进 effect 状态，`ui.requestRender()`。随机选 typewriter/scanline/rain/fade/crt/glitch/dissolve 之一，把 31×36 XBM（半块字符 ▀▄█）从空网格过渡到终图。

## 画什么

居中的 ASCII 肖像 + 主题色。缓存按 width+version。

## 失败与边界

必须在组件离开树时停 interval（组件若实现 dispose；否则进程退出才停）。聊天滚动时仍占高度。

## 下一课

[73-daxnuts.ts.md](/series/pi-source/coding-agent/600-daxnuts-ts/)
