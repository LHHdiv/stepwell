---
title: "24 · components/input.ts — 单行输入"
summary: "单行、横向滚动、CURSORMARKER、括号粘贴、KillRing、UndoStack、word 导航。Settings 搜索和 AltScreen 搜索框用它。多行、历史、补全在 Editor。"
tags: [pi, tui]
---
源码：`packages/tui/src/components/input.ts`

## 本课目标

单行、横向滚动、`CURSOR_MARKER`、括号粘贴、KillRing、UndoStack、word 导航。Settings 搜索和 AltScreen 搜索框用它。多行、历史、补全在 Editor。

## 状态

`value` + `cursor`（字符串下标，不是列）。`renderedStartColumn` 保证光标在可见窗口内。focused 时插入 marker。

`handleInput`：先拼 bracketed paste；再 keybindings（左右词、kill、yank、undo、submit、escape）；否则 `decodeKittyPrintable` 当插入。

鼠标 click 按列设光标。

## 失败与边界

- 无多行。粘贴里的 `\n` 通常当提交或滤掉——对着 `handlePaste` 看（应插入且可能截断）。
- placeholder 仅 value 空且未 focus 或始终？看 render：空 value 画 placeholderStyle。
- 与 Editor 键位共享 `tui.editor.*` 一部分和 `tui.input.*`。

## 下一课

[25-components.editor.ts.md](/series/pi-source/tui/447-components-editor-ts/)：交互主链真正的输入盒。
