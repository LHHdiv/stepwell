---
title: "36 · terminal-colors.ts — OSC 11 与配色报告"
summary: "isOsc11BackgroundColorResponse 只判断形状，解析失败仍算「吃掉这条」，query Promise 得 undefined。"
tags: [pi, tui]
---
源码：`packages/tui/src/terminal-colors.ts`  
被谁调用：`TuiBase.queryTerminalBackgroundColor` / `onTerminalColorSchemeChange`。

## 本课目标

会认两种回复：

- OSC 11：`ESC ] 11 ; <color> BEL|ST`。颜色可以是 `#rrggbb`、`#rrrrggggbbbb`、`rgb:r/g/b`（通道可变长 hex，线性缩放到 0–255）。
- CSI `?997;1n` dark / `?997;2n` light。模式允许重复拼接的同一报告。

`isOsc11BackgroundColorResponse` 只判断形状，解析失败仍算「吃掉这条」，query Promise 得 `undefined`。

## 失败与边界

终端不支持则超时。不要把普通输入当 OSC——pattern 必须整段匹配，StdinBuffer 已保证 OSC 完整。

## 下一课

[37-terminal-image.ts.md](/series/pi-source/tui/459-terminal-image-ts/)。
