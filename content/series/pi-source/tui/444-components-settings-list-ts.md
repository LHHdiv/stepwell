---
title: "22 · components/settings-list.ts — 设置列表"
summary: "每一项：label + currentValue；Enter 或循环 values[] 或打开 submenu() 返回的组件。可选搜索：内嵌 Input，fuzzyFilter 过滤。子菜单打开时输入全转给它，done(value?,"
tags: [pi, tui]
---
源码：`packages/tui/src/components/settings-list.ts`

## 本课目标

每一项：label + currentValue；Enter 或循环 `values[]` 或打开 `submenu()` 返回的组件。可选搜索：内嵌 `Input`，`fuzzyFilter` 过滤。子菜单打开时输入全转给它，`done(value?, { navigateTo? })` 关闭。

## 要点

构造就要 `onChange(id, newValue)` 和 `onCancel`。`updateValue` 改显示。选中项可把 description wrap 到下面。

鼠标与 SelectList 类似：press/click 同行才触发。搜索启用时第一行是 Input。

## 失败与边界

submenu 返回的组件必须自己处理输入并调用 done。忘记 done 会卡在子菜单。`navigateTo` 在关闭后把光标挪到指定 id——用于「刚改了模型，跳到该行」。

## 下一课

[23-components.markdown.ts.md](/series/pi-source/tui/445-components-markdown-ts/)。
