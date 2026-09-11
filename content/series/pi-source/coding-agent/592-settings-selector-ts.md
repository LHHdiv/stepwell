---
title: "69 · settings-selector.ts — /settings 主列表"
summary: "无 session。SettingsList（tui）展示 SettingItem[]。点进一项可能换成 SelectSubmenu / SteppedSubmenu / ThemeSelector / ShowImagesSelect"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/settings-selector.ts`  
谁创建：`showSettingsSelector`。

## 订阅什么

无 session。`SettingsList`（tui）展示 `SettingItem[]`。点进一项可能换成 `SelectSubmenu` / `SteppedSubmenu` / `ThemeSelector` / `ShowImagesSelector` 等，确认后经 `SettingsCallbacks` 写回 `settingsManager` 并常立刻 `applyRuntimeSettings`。

`SettingsConfig` 是当前值的快照（autoCompact、默认模型、图片、thinking、theme、tuiMode、快捷键相关、telemetry…）。Callbacks 是 InteractiveMode 闭包，真正改 session/settings。

## 画什么

边框 + 分组设置行（名、当前值、说明）。子弹窗期间主列表被换成 submenu 组件。

## 失败与边界

列表很长，靠 SettingsList 内部滚动。改 TUI mode（regular/fullscreen）会调 InteractiveMode `switchTuiMode`，可能因 overlay 失败而失败——callback 应 showError。

## 下一课

[70-scoped-models-selector.ts.md](/series/pi-source/coding-agent/594-scoped-models-selector-ts/)
