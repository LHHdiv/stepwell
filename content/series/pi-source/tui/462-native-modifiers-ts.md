---
title: "40 · native-modifiers.ts — 包装 isModifierPressed"
summary: "isNativeModifierPressed(key)：helper 没有或 throw 则 false，不要让按键路径炸。Linux helper 无此函数，永远 false——Shift+Enter 探测只在 darwin/win"
tags: [pi, tui]
---
源码：`packages/tui/src/native-modifiers.ts`

## 本课目标

`isNativeModifierPressed(key)`：helper 没有或 throw 则 **false**，不要让按键路径炸。Linux helper 无此函数，永远 false——Shift+Enter 探测只在 darwin/win32 的 ProcessTerminal 里开启。

再导出 `ModifierKey` 类型。

## 下一课

[41-alt-screen-search.ts.md](/series/pi-source/tui/463-alt-screen-search-ts/)。
