---
title: "06 · layout-node.ts — 布局节点协议"
summary: "知道没有这个 symbol 的组件就是叶子：render(width) 出行，高度=行数。有 symbol 的才参与分配 grow/shrink 和滚动。"
tags: [pi, tui]
---
源码：`packages/tui/src/layout-node.ts`  
被谁调用：`VStack`/`HStack`/`ScrollView` 实现 `[LAYOUT_NODE]()`；`layout.ts` 的 `getLayoutNode`。

## 本课目标

知道没有这个 symbol 的组件就是叶子：`render(width)` 出行，高度=行数。有 symbol 的才参与分配 grow/shrink 和滚动。

## 在系统中的位置

```text
component[LAYOUT_NODE]()
  { type: "vstack"|"hstack", entries, gap, align }
  { type: "scroll", component, state: ScrollLayoutState }
```

`LAYOUT_NODE = Symbol.for("@earendil-works/pi-tui/layout-node")` 用 for，跨副本同一 symbol。

## 类型

`LayoutViewport`：`{ width, height }`，给 `visible?: (viewport) => boolean`。

`StackLayoutEntry`：component + basis/grow/shrink/min/max + visible。basis 数字是固定主轴像素（行或列），`"auto"` 或缺省则测 intrinsic。

`ScrollLayoutState`：ScrollView 自己实现。`updateLayout(contentHeight, viewportHeight, requestRender)` 在 layout 阶段被调用，用来夹紧 scrollTop、follow-end。`getContentWidth` 在 always scrollbar 时减 1 列。

`getLayoutNode`：没有该方法则 undefined，当叶子。

## 失败与边界

- 实现了 symbol 但 type 不是那三种：layout.ts 当 hstack 分支（最后一个）。不要自定义 type。
- 叶子的 `lineOffset`：高度不够时若有 CURSOR_MARKER，向下游切窗口，保证光标行可见。这在 layout.ts 的叶子分支。

## 下一课

[07-layout.ts.md](/series/pi-source/tui/429-layout-ts/)：测高、分配、绘制、命中测试。
