---
title: "18 · components/image.ts — 行内图"
summary: "看 Kitty 与 iTerm 占位行数如何对齐 TUI 的「一行一字符串」模型。无协议则 imageFallback 一行文字。"
tags: [pi, tui]
---
源码：`packages/tui/src/components/image.ts`

## 本课目标

看 Kitty 与 iTerm 占位行数如何对齐 TUI 的「一行一字符串」模型。无协议则 `imageFallback` 一行文字。

## `render`

maxWidth = min(width-2, options.maxWidthCells??60)。maxHeight 默认按单元格像素比算。`getCapabilities().images`：

- kitty：分配/复用 `imageId`，`renderImage(..., moveCursor:false)`，第一行是序列，后面 `rows-1` 个 `""`
- iterm2：先空行占位，最后一行 `CSI nA` + 序列，让光标会计回到块底（MainScreen fullRender 有对称处理）
- 失败或无能力：theme.fallbackColor(imageFallback(...)) 截断到 width

缓存键只有 width（数据不变才对）。改图要新实例或 invalidate。

## 失败与边界

- AltScreen 会关 iTerm 协议，这里变 fallback。
- Kitty id 泄漏：MainScreen 差量删除旧 id；AltScreen 停时 deleteAll。组件自己不删。
- 默认 800×600 若解析不出尺寸。

## 下一课

[19-components.mouse-region.ts.md](/series/pi-source/tui/441-components-mouse-region-ts/)。
