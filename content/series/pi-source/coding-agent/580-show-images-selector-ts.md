---
title: "63 · show-images-selector.ts — 是否在终端里画图"
summary: "无。SelectList Yes/No，确认回 boolean。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/show-images-selector.ts`  
谁创建：设置项 Show images。

## 订阅什么

无。`SelectList` Yes/No，确认回 boolean。

## 画什么

边框 + 两项：inline / placeholder。

## 失败与边界

只改 `showImages` 设置。已经画上去的 `ToolExecutionComponent` 不会自动拆掉图片，要等下次结果或 expand 重建。

## 下一课

[64-user-message-selector.ts.md](/series/pi-source/coding-agent/583-user-message-selector-ts/)
