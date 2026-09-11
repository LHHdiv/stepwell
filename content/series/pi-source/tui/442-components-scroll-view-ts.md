---
title: "20 · components/scroll-view.ts — 唯一子节点的视口"
summary: "ScrollView 自己的 render 并不裁切——它只是把 child 画出来，always 滚动条时右补一空列。真正的裁切在 layout.ts 的 scroll 节点：updateLayout 夹紧 scrollTop，pai"
tags: [pi, tui]
---
源码：`packages/tui/src/components/scroll-view.ts`

## 本课目标

ScrollView **自己的 render 并不裁切**——它只是把 child 画出来，always 滚动条时右补一空列。真正的裁切在 `layout.ts` 的 scroll 节点：`updateLayout` 夹紧 `scrollTop`，paint 时 clip。

## 状态

`follow: "end"`：内容变高且 `followingEnd` 则 sticky 底部。`scrollTo(..., { disableFollow: true })` 即使在底部也暂时关掉 follow（搜索跳转）。`scrollBy` 返回没吃掉的行数，给 chain overscroll。

`scrollbar: hidden|auto|always`。auto 在滚动活动后显示，`scrollbarHideDelayMs`（默认 1s，unref timer）后藏。

禁止 addChild/removeChild/clear。构造时塞进唯一 child。

`[LAYOUT_NODE]`：`{ type:"scroll", component: child, state: this }`。ScrollView 自己当 ScrollLayoutState。

## 失败与边界

- 主屏把 ScrollView 当普通 Container：child 全画出，没有视口。要滚动必须走 AltScreen layout。
- `axis` 只允许 vertical，其它 throw。
- follow 与用户上滚：`scrollBy` 负向会 `followingEnd=false`。

## 下一课

[21-components.select-list.ts.md](/series/pi-source/tui/443-components-select-list-ts/)。
