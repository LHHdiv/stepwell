---
title: "15 · components/box.ts — 垫边和背景"
summary: "Box 是垂直 Container + padding + 可选背景。缓存键包含子行内容和 bgFn(\"test\") 采样——主题函数换了但引用没变时，靠采样抓住输出变化。"
tags: [pi, tui]
---
源码：`packages/tui/src/components/box.ts`

## 本课目标

Box 是垂直 Container + padding + 可选背景。缓存键包含子行内容和 `bgFn("test")` 采样——主题函数换了但引用没变时，靠采样抓住输出变化。

## `render`

contentWidth = width - 2*paddingX。子组件按此宽 render，左 pad。上下 paddingY 用 `applyBg("", width)`。`matchCache` 命中则返回旧 lines。

## `handleMouse`

把事件坐标减去 padding，在 content 宽内按子高度命中，`dispatchMouseEvent`。点在 padding 上 return undefined。

## 失败与边界

- 无子 → `[]`。
- `setBgFn` 故意不 invalidateCache，靠采样。若 bgFn 有时间副作用（闪烁），缓存会粘住，直到子内容变。
- 不是 layout node。全屏里它是叶子盒子，高度=渲染行数。

## 下一课

[16-components.loader.ts.md](/series/pi-source/tui/438-components-loader-ts/)。
