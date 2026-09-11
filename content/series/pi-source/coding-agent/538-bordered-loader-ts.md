---
title: "42 · bordered-loader.ts — 扩展用的带边转圈"
summary: "无 session。键盘：可取消时把输入转给 CancellableLoader（Esc）。signal 给 fetch abort。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/bordered-loader.ts`  
谁创建：`/share` 上传；扩展 `ui.custom` 里的等待。

## 订阅什么

无 session。键盘：可取消时把输入转给 `CancellableLoader`（Esc）。`signal` 给 fetch abort。

## 画什么

上边框、Loader 文案、可选「Esc cancel」提示、下边框。不可取消时用普通 Loader + 内部 AbortController（外部仍能 abort，只是键盘无效）。

## 失败与边界

`dispose` 兼容 Loader.stop 和 CancellableLoader.dispose 两种 API。

## 下一课

[43-keybinding-hints.ts.md](/series/pi-source/coding-agent/540-keybinding-hints-ts/)
