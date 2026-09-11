---
title: "16 · components/loader.ts — 转圈"
summary: "Loader 继承 Text。timer 每 80ms setText + tui.requestRender()。render 前面多一行 \"\" 当上边距。空 frames 则只有文字、无动画。"
tags: [pi, tui]
---
源码：`packages/tui/src/components/loader.ts`

## 本课目标

Loader **继承 Text**。timer 每 80ms `setText` + `tui.requestRender()`。`render` 前面多一行 `""` 当上边距。空 `frames` 则只有文字、无动画。

## 逐函数

构造：`ui, spinnerColorFn, messageColorFn, message, indicator?`。内部 `super("", 1, 0)`。

`start` / `setIndicator` / `setMessage` 都 `updateDisplay`。`frames.length<=1` 不设 interval。`stop` 清 interval。`invalidate` 会 `updateDisplay`（主题变了要重上色）。

`getRenderedIndicator`：自定义 indicator 原样输出，否则 `spinnerColorFn(frame)`。

## 失败与边界

- 忘记 `stop()`：TUI 停了 timer 还在 requestRender。CancellableLoader.dispose 会 stop。
- `ui` 可为逻辑上的 null（字段类型写了 `| null`），updateDisplay 里判断。
- 和 Text 缓存：每次 setText 清缓存，动画才会动。

## 下一课

[17-components.cancellable-loader.ts.md](/series/pi-source/tui/439-components-cancellable-loader-ts/)。
