---
title: "12 · components/stack.ts — flex 分配"
summary: "能手算一次 grow/shrink。知道 Stack 自己不 render（抽象），只维护 entries 并实现 [LAYOUTNODE]。addChild 的第二参是 flex 选项。"
tags: [pi, tui]
---
源码：`packages/tui/src/components/stack.ts`  
被谁调用：VStack / HStack；`layout.ts` 的 `allocateStackSizes` / `visibleStackEntries`。

## 本课目标

能手算一次 grow/shrink。知道 `Stack` 自己不 render（抽象），只维护 `entries` 并实现 `[LAYOUT_NODE]`。`addChild` 的第二参是 flex 选项。

## 在系统中的位置

```text
new VStack([a, { component: b, grow: 1 }])
  Stack 把 children 和 entries 对齐
layout 或 VStack.render 调 allocateStackSizes
```

`isStackEntry`：没有 `render` 的当 options 对象。普通 Component 有 render。

## `allocateStackSizes`

每项：basis 数字则用它，否则 intrinsic。clamp 到 min/max。

若给了 `availableSize`：减去 gap×(n-1) 得 content。total < content → grow；> → shrink。

`distribute` 循环直到 remaining=0 或没有候选。grow 权重是 `grow`；shrink 权重是 `shrink * max(1, size)`（大块多缩）。每次至少分 1，避免小数饿死。某轮 distributed=0 则停（全顶到 min/max）。

## `visibleStackEntries`

`visible(viewport)` 假则本帧不参与。viewport 在 VStack.render 里 height 是 MAX_SAFE_INTEGER——**主屏上的 VStack 看不见「终端高度」**，visible 回调拿不到真高。全屏 layout 才有真 height。

## 失败与边界

- `addChild`/`removeChild`/`clear` 必须同时改 `children` 和 `entries`，否则鼠标命中和布局分叉。
- Container.handleMouse 用 children 高度；HStack 是横向的，**主屏上 HStack 的 Container 鼠标逻辑是错的**（按垂直高度切）。全屏走 layout 命中，不走这条。主屏少用 HStack 点选。
- gap/min/max 非有限则当 0 或 fallback。

## 下一课

[13-components.v-stack.ts.md](/series/pi-source/tui/435-components-v-stack-ts/)。
