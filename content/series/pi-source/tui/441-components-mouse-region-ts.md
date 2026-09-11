---
title: "19 · components/mouse-region.ts — 给叶子加点击"
summary: "装饰器：render/invalidate 全委托 child。handleMouse 先 dispatchMouseEvent(child)，child 不要再自己的 onMouse。"
tags: [pi, tui]
---
源码：`packages/tui/src/components/mouse-region.ts`

## 本课目标

装饰器：render/invalidate 全委托 child。`handleMouse` 先 `dispatchMouseEvent(child)`，child 不要再自己的 `onMouse`。

## 失败与边界

主屏未开鼠标协议，这个组件只有在 AltScreen 里有效。child 已 handled 则外层收不到。

## 下一课

[20-components.scroll-view.ts.md](/series/pi-source/tui/442-components-scroll-view-ts/)。
