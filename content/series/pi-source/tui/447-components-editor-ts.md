---
title: "25 · components/editor.ts — 多行编辑器"
summary: "把状态机钉住：EditorState { lines, cursorLine, cursorCol } 是逻辑文档；wordWrapLine 把一行折成视觉行；scrollOffset 保证光标视觉行可见；粘贴超过阈值变成 [paste"
tags: [pi, tui]
---
源码：`packages/tui/src/components/editor.ts`（约 2461 行）  
被谁调用：InteractiveMode 底部输入；自定义编辑器应走 `EditorComponent` 接口而不是 fork 本文件。

## 本课目标

把状态机钉住：`EditorState { lines, cursorLine, cursorCol }` 是逻辑文档；`wordWrapLine` 把一行折成视觉行；`scrollOffset` 保证光标视觉行可见；粘贴超过阈值变成 `[paste #n +x lines]` 原子段。能指出 handleInput 如何分流：paste 模式、补全列表、jump 模式、keybindings、可打印字符。

## 在系统中的位置

```text
new Editor(tui, theme, { paddingX, autocompleteMaxVisible })
tui.addChild(editor); tui.setFocus(editor)
用户输入 → editor.handleInput → onChange / onSubmit
```

实现 `Component & Focusable`，并满足 `EditorComponent`。

## 文档与视觉行

`wordWrapLine`：按 grapheme 宽折行，空白和 CJK 边界是断点。paste marker 当作原子 grapheme（`isPasteMarker`）。

垂直移动用 sticky `preferredVisualCol`。若光标被 snap 到 marker 开头，`snappedFromCursorCol` 记住想去的列。

`render`：边框（`borderColor`）、可见窗口、可选「↑ N / ↓ N」滚动提示、聚焦时 marker、下方补全 SelectList。缓存几何给鼠标 hit-test。

## 粘贴

bracketed paste 缓冲。大粘贴进 `pastes` Map，文档里只留 marker。`getExpandedText()` 提交前展开。`segmentWithMarkers` 让 word 移动一次跨过整个 marker。删 marker 即丢那次粘贴。

## 补全

`setAutocompleteProvider`。触发字符默认 `@` `#`，slash 命令另走 provider。debounce 20ms（`@` 路径）。`SelectList` 最大可见 3–20。Tab/Enter 插入。`autocompleteRequestTask` 串行化，避免乱序。AbortController 取消过期请求。

## 历史 / kill / undo

`addToHistory` 去重，最多 100。上/下默认**不**绑历史（`TUI_KEYBINDINGS` 里 history 的 defaultKeys 是 `[]`）——coding-agent 再绑。空编辑器上方向键才浏览历史。

KillRing 连续 kill 合并。yank-pop rotate。UndoStack `structuredClone` 快照。

jump 模式：`tui.editor.jumpForward/Backward` 后等下一个字符。

## `handleInput` 顺序（概念）

1. 补全打开且键属于列表 → 转给 SelectList
2. bracketed paste
3. jump 模式吃一个字符
4. keybindings（移动、删、提交、换行、undo…）
5. decodeKittyPrintable / 普通字符插入
6. `onChange`，`tui.requestRender`（TuiBase 键盘路径已经 immediate）

`disableSubmit` 挡 Enter。IME 靠硬件光标。

## 失败与边界

- `cursorCol` 是 UTF-16 下标，不是列。双宽字符移动必须走 segment。
- 不要在 onChange 里再 setText 整份文档，会和输入打架。
- 补全异步失败应吞掉并 cancel，不要抛出 handleInput。
- 文件太大：折行每帧跑。transcript 不走 Editor。

## 下一课

[26-editor-component.ts.md](/series/pi-source/tui/448-editor-component-ts/)：扩展替换编辑器时要满足的接口。
