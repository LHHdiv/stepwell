---
title: "42 · components/alt-screen-flash.ts — 短暂提示"
summary: "flash(message, durationMs=1000) 推进条目，timer.unref，到期删并 requestRender。render 每条反转视频（SGR 7）截断到 width。dispose 清全部 timer。Al"
tags: [pi, tui]
---
源码：`packages/tui/src/components/alt-screen-flash.ts`

## 本课目标

`flash(message, durationMs=1000)` 推进条目，timer.unref，到期删并 requestRender。`render` 每条反转视频（SGR 7）截断到 width。`dispose` 清全部 timer。AltScreen 叠在视口底部（具体位置在 tui-alt-screen 合成），不是 addChild 进文档。

复制失败、设置切换确认走这条。

## 失败与边界

多条同时存在会占多行。dispose 必须在 stop 时调，否则 timer 在进程里漏。

## 下一课

[43-index.ts.md](/series/pi-source/tui/465-index-ts/)：对外导出对照。
