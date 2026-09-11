---
title: "94 · keybindings.ts — 应用快捷键表"
summary: "在 pi-tui 的 TUIKEYBINDINGS 上加 app.：interrupt、model cycle、session tree、clipboard 图、fork… KeybindingsManager.create() 读 a"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/keybindings.ts`  
被谁调用：交互 mode；startup TUI 用默认表。

在 `pi-tui` 的 `TUI_KEYBINDINGS` 上加 `app.*`：interrupt、model cycle、session tree、clipboard 图、fork… `KeybindingsManager.create()` 读 `agentDir/keybindings.json`，`migrateKeybindingsConfig` 改旧键名。

`useWindowsKeybindings`：win32 或 WSL。若干默认从 ctrl+- 换成 alt+z，避免终端吞键。

declaration merging 把 `AppKeybindings` 并进 TUI 的 `Keybindings` 接口。扩展 shortcut 与本表冲突规则见 runner。

## 下一课

[95-output-guard.ts.md](/series/pi-source/coding-agent/644-output-guard-ts/)。
