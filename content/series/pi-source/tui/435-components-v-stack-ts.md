---
title: "13 · components/v-stack.ts — 垂直栈"
summary: "主屏路径：VStack.render 自己分配（availableSize=undefined，所以 不 grow 到终端高度，只按 intrinsic + basis）。全屏路径：layout.ts 用同一 [LAYOUTNODE] "
tags: [pi, tui]
---
源码：`packages/tui/src/components/v-stack.ts`

## 本课目标

主屏路径：`VStack.render` 自己分配（availableSize=`undefined`，所以 **不 grow 到终端高度**，只按 intrinsic + basis）。全屏路径：layout.ts 用同一 `[LAYOUT_NODE]` 把剩余高度分给 grow 项。

## `render`

测每个可见 child 的 `render(width).length` 当 intrinsic。`allocateStackSizes(..., undefined, gap)`。输出：child 行（slice 到 size）+ 不够则补 `""` + child 间 gap 空行。

## 失败与边界

- 主屏 VStack 不会把 Editor 撑满窗口。要撑满用 AltScreen + layout + grow。
- 再导出 Stack 的类型，调用方可 `import { VStack, type StackChild }`。

## 下一课

[14-components.h-stack.ts.md](/series/pi-source/tui/436-components-h-stack-ts/)。
