---
title: "21 · components/select-list.ts — 过滤列表"
summary: "过滤是 value 前缀（startsWith），不是 fuzzy。可见窗口绕 selectedIndex 居中。hover 不改选中（注释：可见范围以选中为中心）。键盘走 tui.select.。"
tags: [pi, tui]
---
源码：`packages/tui/src/components/select-list.ts`  
被谁调用：Editor 自动补全下拉；命令面板。

## 本课目标

过滤是 **value 前缀**（`startsWith`），不是 fuzzy。可见窗口绕 `selectedIndex` 居中。hover **不**改选中（注释：可见范围以选中为中心）。键盘走 `tui.select.*`。

## 要点

`setFilter` 重置 index 0。空匹配画 `theme.noMatch("  No matching commands")`。

两列：label 固定/可配置 primary 宽，description 单行化后塞剩余。`truncatePrimary` 可定制截断。

`handleInput`：up/down/page、enter confirm、esc cancel。`handleMouse`：wheel 改 index；左键 press 记 index，click 同一行才 onSelect。

`onSelectionChange` 在 index 变时。

## 失败与边界

- filter 不模糊。模糊在 SettingsList / CombinedAutocompleteProvider。
- 必须有焦点才能键盘操作。Editor 把补全列表的输入自己转发。

## 下一课

[22-components.settings-list.ts.md](/series/pi-source/tui/444-components-settings-list-ts/)。
