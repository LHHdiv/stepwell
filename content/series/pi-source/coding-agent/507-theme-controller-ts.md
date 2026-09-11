---
title: "26 · theme-controller.ts — 交互模式的主题控制器"
summary: "theme.ts 管「如何上色」；本类管「现在该用哪张、要不要跟着系统亮暗变」。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/theme/theme-controller.ts`  
被谁调用：`InteractiveMode` 构造、`init` 里 `applyFromSettings`、`/theme` 选择器、扩展 `ui.setTheme`。

## 本课目标

`theme.ts` 管「如何上色」；本类管「现在该用哪张、要不要跟着系统亮暗变」。

## 生命周期

构造时：从 `COLORFGBG` 猜 `terminalTheme`，`resolveThemeSetting` 得到名字，`initTheme(name, true)` 开文件监视。

`applyFromSettings`（init 里 await，此时 TUI 已 `start`，OSC 查询才有意义）：

1. 设置是 `auto`（`parseAutoThemeSetting` 命中 `light/dark` 这种）→ `detectTerminalThemeForAuto`（100ms），`setAutoSync(true)`，按亮暗选对应名字。
2. 设置是具体名字 → 关 auto，`applyThemeName`。
3. 设置未写 → 探测背景，成功且 confidence 为 high 时 **写回** `settingsManager.setTheme` + `flush`。第一次启动「检测到 dark 就记住」。

## auto 同步

`setAutoSync(true)` 打开 `ui.setTerminalColorSchemeNotifications`。终端发 OSC 亮暗变化 → `onTerminalColorSchemeChange` → `applyTerminalTheme`。若当前设置不再是 auto 对，关掉同步。

切 fullscreen/regular 时 `rebindTui()`：旧 TUI 死了，监听要绑到新 `this.ui`（Proxy 后面的新 renderer）。

## `setThemeName` / `setThemeInstance` / `preview`

- `setThemeName`：关 auto，加载，成功则记下 `currentThemeSetting`。是否 persist 由调用方（设置面板会 `settingsManager.setTheme`）。
- `setThemeInstance`：扩展直接塞 `Theme` 对象，名字变成 `"<in-memory>"`。
- `preview`：选择器上下移动时只 `setTheme` + `invalidate`，不改 setting。取消时 InteractiveMode 再 `applyFromSettings` 还原。

`disableAutoSync` 在 shutdown 时调用，避免退出过程中 OSC 回调还去 `requestRender`。

## 失败与边界

- `applyThemeName` 失败会 `showError` 并落到 dark。`currentThemeSetting` 在 `setThemeName` 里只在 success 时更新，避免设置里记下坏名字。
- 探测超时当 dark/low confidence，不写 settings，下次启动再问。

## 下一课

[27-interactive-mode.ts.md](/series/pi-source/coding-agent/508-interactive-mode-ts/) — 键盘如何变成 `session.prompt`。
