---
title: "14 · components/h-stack.ts — 水平栈"
summary: "看它如何用 compositeTuiLine 把多列拼成矩形。align 作用于垂直方向（子块在行方向上 start/center/end）。"
tags: [pi, tui]
---
源码：`packages/tui/src/components/h-stack.ts`

## 本课目标

看它如何用 `compositeTuiLine` 把多列拼成矩形。align 作用于**垂直**方向（子块在行方向上 start/center/end）。

## `render`

1. 每项 `render(safeWidth)` 取 max visibleWidth 当 intrinsic 宽（注意：先用满宽渲染再量，宽组件可能已经 wrap 成窄高）
2. `allocateStackSizes(..., safeWidth, gap)`
3. 按分配宽再 `render(childWidth)`（宽 0 则空）
4. 高度=最高的那个；建 `height` 条 `""`
5. 逐项 `compositeTuiLine(result[row], line, x, childWidth, safeWidth)`

## 失败与边界

- 两次 render：一次测宽一次真画。有副作用的 child（Loader 推进动画）会被多 tick。尽量让 render 纯。
- 主屏鼠标：见 stack 课，垂直命中不适用。

## 下一课

[15-components.box.ts.md](/series/pi-source/tui/437-components-box-ts/)。
