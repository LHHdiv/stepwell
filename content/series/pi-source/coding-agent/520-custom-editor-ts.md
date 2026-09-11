---
title: "33 · custom-editor.ts — 带 app 快捷键的输入盒"
summary: "不订 AgentSession 事件。键盘由 tui 在它 focused 时调用 handleInput(data)。Working 状态靠 InteractiveMode 调 setWorkingStatusIndicator。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/custom-editor.ts`  
谁创建：`InteractiveMode` 构造函数 `new CustomEditor(ui, getEditorTheme(), keybindings, { embedWorkingStatus: true })`。

## 订阅什么

不订 `AgentSession` 事件。键盘由 tui 在它 focused 时调用 `handleInput(data)`。Working 状态靠 InteractiveMode 调 `setWorkingStatusIndicator`。

对外回调（由 InteractiveMode 赋值）：`onEscape`、`onCtrlD`、`onPasteImage`、`onExtensionShortcut`、`onAction(app.*)`、继承自 Editor 的 `onSubmit` / `onChange`。

## 画什么

tui `Editor` 的多行输入、自动补全、历史。若 `embedWorkingStatus` 且有 indicator，**顶边框**改成 `── Working… ────`，空间不够只留 spinner；有隐藏行时中间插 `↑ N more`。

## `handleInput` 顺序

1. 扩展 shortcut（返回 true 则吃掉）
2. `app.clipboard.pasteImage`
3. `app.interrupt`：自动补全打开时交给父类关补全；否则 `onEscape`
4. `app.exit` 且文本为空 → `onCtrlD`；非空则当「向前删字符」
5. 显式 history 键优先于 app 动作（Ctrl+P 默认切模型，用户绑成历史上一条时要能赢）
6. 其它 `actionHandlers`
7. `super.handleInput` — 插入、回车提交

## 失败与边界

- 快捷键匹配用 `KeybindingsManager`，不是硬编码 Ctrl+C。
- 自定义 `setEditorComponent` 换掉的编辑器若不是 CustomEditor，就没有这些 app 动作，除非自己实现。

## 下一课

[34-assistant-message.ts.md](/series/pi-source/coding-agent/522-assistant-message-ts/)
