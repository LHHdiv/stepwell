---
title: "17 · components/cancellable-loader.ts — Esc 取消"
summary: "在 Loader 上加 AbortController。必须 focus 到这个组件才能收到 Esc（tui.select.cancel）。signal 交给正在跑的 Promise。"
tags: [pi, tui]
---
源码：`packages/tui/src/components/cancellable-loader.ts`

## 本课目标

在 Loader 上加 `AbortController`。必须 **focus** 到这个组件才能收到 Esc（`tui.select.cancel`）。`signal` 交给正在跑的 Promise。

## 逐函数

`handleInput`：`getKeybindings().matches(data, "tui.select.cancel")` 则 abort + `onAbort?`。`dispose` = `stop()`，**不** abort。要取消业务自己调 abort 或让用户按 Esc。

## 失败与边界

- 没 setFocus(loader)：Esc 落到 Editor。
- 重复 Esc：第二次 abort 已经 aborted 的 controller，onAbort 仍会再调。调用方应幂等。

## 下一课

[18-components.image.ts.md](/series/pi-source/tui/440-components-image-ts/)。
