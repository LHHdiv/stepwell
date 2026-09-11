---
title: "54 · extension-input.ts — 扩展用单行输入"
summary: "无 session。Focusable：焦点传给内部 Input（IME 光标）。Enter 提交、Esc 取消。timeout 同选择器。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/extension-input.ts`  
谁创建：`ctx.ui.input`。

## 订阅什么

无 session。Focusable：焦点传给内部 `Input`（IME 光标）。Enter 提交、Esc 取消。timeout 同选择器。

## 画什么

边框、标题、一行 Input、提交/取消 hint。placeholder 参数目前未画到 Input 上（构造函数命名 `_placeholder`）。

## 失败与边界

要多行用 `ExtensionEditorComponent`。超时取消返回 undefined，不是空字符串。

## 下一课

[55-extension-editor.ts.md](/series/pi-source/coding-agent/564-extension-editor-ts/)
