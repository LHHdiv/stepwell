---
title: "28 · keybindings.ts — 动作名"
summary: "组件不写死 \"ctrl+a\"，而写 kb.matches(data, \"tui.editor.cursorLineStart\")。下游用 declaration merging 往 Keybindings 接口加键。setKeybind"
tags: [pi, tui]
---
源码：`packages/tui/src/keybindings.ts`

## 本课目标

组件不写死 `"ctrl+a"`，而写 `kb.matches(data, "tui.editor.cursorLineStart")`。下游用 declaration merging 往 `Keybindings` 接口加键。`setKeybindings` 换全局表（用户配置）。

## `TUI_KEYBINDINGS`

每个动作：`defaultKeys`（一个或数组）+ description。历史项默认 `[]`——产品层再绑。Emacs 风格：Ctrl+A/E/B/F/K/Y 等已在默认表。

`KeybindingsManager`：从 definitions + 用户 config 合并。config 里 `undefined` 或空可禁用。`conflicts()` 报告同一 KeyId 映射多个动作。

`matches(data, action)`：对该动作所有 KeyId 调 `matchesKey`。

全局 `setKeybindings` / `getKeybindings`。组件 `getKeybindings()` 热读，改配置不必重建 Editor。

## 失败与边界

- 合并声明没加到 interface：类型红，运行时 Manager 仍可能有字符串键，取决于构造。
- 冲突不自动禁用，只诊断。用户配置两个动作同一键，两个 matches 都真——谁先 handleInput 谁赢。

## 下一课

[29-stdin-buffer.ts.md](/series/pi-source/tui/451-stdin-buffer-ts/)：把粘在一起的 stdin 拆开。
