---
title: "07 · layout.ts — 测、分、画、点"
summary: "能对着 layoutComponent 说出 vstack 与 hstack 如何 allocateStackSizes，scroll 如何先按旧 scrollTop 布局再 translateBox。能指出滚动条是画在已经 splat"
tags: [pi, tui]
---
源码：`packages/tui/src/layout.ts`  
被谁调用：`TuiAltScreen.doRender` → `renderLayoutFrame`。

## 本课目标

能对着 `layoutComponent` 说出 vstack 与 hstack 如何 `allocateStackSizes`，scroll 如何先按旧 scrollTop 布局再 `translateBox`。能指出滚动条是画在已经 splat 好的 screen 上，不是组件自己 render 出来的。

## 在系统中的位置

```text
renderLayoutFrame(root, width, height, requestRender)
  layoutComponent(...) → LayoutBox 树
  建 height 行的 screen 数组
  paintBox 递归：叶子行写入 clip 矩形
  paintScrollbar
  返回 { screen, boxes, primaryScrollView }
```

`getLayoutBoxesAt` / `getScrollViewsAt` 给鼠标：从上到下（后 paint 的在上？layer 字段目前 0）过滤包含该点的 clip。

## `layoutComponent`

无 node：`renderCached`，高度=行数或分配到的 height。行数多于分配且有 cursor marker → `lineOffset` 让 marker 落在窗口内。

`scroll`：child 在 `y - previousScrollTop` 布局（无限高），`updateLayout` 可能改 scrollTop（follow-end），然后 `translateBox` 把子树挪到新偏移。clip 是视口矩形。`primary` 的那个记到 context，给 PageUp 等。

`vstack`：intrinsic 高度= basis 或测高；`allocateStackSizes(..., height, gap)`；按序往下摆。

`hstack`：intrinsic 宽=测宽；分配宽度；高度取 max 或 stretch/center/end。宽为 0 的 child 仍占位但不 layout（避免 render(0)）。

`renderCached` 按 component+width 缓存行，同一帧内测高测宽不重复 render。

## 绘制

`paintBox`：有 `lines` 的叶子，按 clip 把行写进 screen，考虑 lineOffset。scroll 的 child 已被 clip。

`paintScrollbar`：`getScrollbarGeometry` 算 track/thumb。`replaceScrollbarCell` 替换那一列单元格，尽量保留背景 ANSI，跳过 image line。always 模式即使内容没溢出也画 track。

OSC 133 区前缀在部分路径被剥，避免 prompt 标记干扰宽度。

## 失败与边界

- 同一帧必须用同一个 `requestRender` 回调，ScrollView 才能在 follow-end 时要重绘。
- hstack 测宽时 `render(safeWidth)` 可能是「给了满宽再看 visibleWidth」，不是 CSS 那种 shrink-to-fit 精确值，极端情况下分配会偏。
- 不要在叶子 render 里再 requestRender，会死循环。Loader 的 timer 是另一帧。

## 下一课

[08-utils.ts.md](/series/pi-source/tui/430-utils-ts/)：所有 `visibleWidth` / `sliceByColumn` 的来源。
