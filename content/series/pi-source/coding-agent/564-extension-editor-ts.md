---
title: "55 · extension-editor.ts — 扩展用多行编辑器"
summary: "无 session。内部是 tui Editor（不是 CustomEditor，故没有 app.model.cycle 那些）。Ctrl+G（app.editor.external 同类绑定）调 editInExternalEdito"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/extension-editor.ts`  
谁创建：`ctx.ui.editor`、tree 导航自定义摘要提示。

## 订阅什么

无 session。内部是 tui `Editor`（不是 CustomEditor，故没有 app.model.cycle 那些）。Ctrl+G（`app.editor.external` 同类绑定）调 `editInExternalEditor`。提交/取消回调给 InteractiveMode 的 Promise。

## 画什么

边框、标题、预填文本的 Editor、键位 hint（含外部编辑器）。

## 失败与边界

外部编辑器命令来自设置或 `$VISUAL`/`$EDITOR`，Windows 默认 notepad。跑外部编辑器期间 InteractiveMode 仍可能停 TUI——看调用方。本组件自己 `spawn` 前依赖 tui 是否还占着 tty。

## 下一课

[56-model-selector.ts.md](/series/pi-source/coding-agent/566-model-selector-ts/)
