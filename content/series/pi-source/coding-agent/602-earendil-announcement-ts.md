---
title: "74 · earendil-announcement.ts — `/dementedelves` 公告"
summary: "无。图片从 getBundledInteractiveAssetPath 读一次 base64 缓存。读失败则只剩文字。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/earendil-announcement.ts`  
谁创建：隐藏命令，把「pi has joined Earendil」和博客 URL、捆绑 `clankolas.png` 画进 chat。

## 订阅什么

无。图片从 `getBundledInteractiveAssetPath` 读一次 base64 缓存。读失败则只剩文字。

## 画什么

accent 边框、标题、muted 说明、链接色 URL、可选 kitty `Image`（最大 56 列）。

## 失败与边界

静态组件，无动画、无键盘。fullscreen 点链接靠 AltScreen 的 `openUrl`。

## 下一课

内置扩展：[75-extensions.index.ts.md](/series/pi-source/coding-agent/605-extensions-index-ts/)
