---
title: "11 · components/spacer.ts — 空行"
summary: "render 返回 lines 个 \"\"，不是 \" \".repeat(width)。差量比较时空串和满空格是不同行——Spacer 不主动清已有单元格。MainScreen 上若需要清，靠后面的内容覆盖或 clearOnShrink。"
tags: [pi, tui]
---
源码：`packages/tui/src/components/spacer.ts`

## 本课目标

`render` 返回 `lines` 个 `""`，**不是** `" ".repeat(width)`。差量比较时空串和满空格是不同行——Spacer 不主动清已有单元格。MainScreen 上若需要清，靠后面的内容覆盖或 clearOnShrink。

## 逐函数

`constructor(lines=1)`、`setLines`、空 `invalidate`、`render` 忽略 width。

## 失败与边界

`lines=0` 返回 `[]`，vstack 里不占位置。负数会让循环不跑，同样空。

## 下一课

[12-components.stack.ts.md](/series/pi-source/tui/434-components-stack-ts/)：flex 分配。
