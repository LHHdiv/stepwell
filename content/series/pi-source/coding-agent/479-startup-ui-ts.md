---
title: "12 · startup-ui.ts — 进交互 TUI 之前的临时屏幕"
summary: "分清「启动期 TUI」和「交互模式 TUI」。这里造的是一次性小屏幕：问完就 stop()，不进入 InteractiveMode。读完应能指出：主题从哪来、官方发行才弹 first-time setup、取消/提交如何不双关。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/startup-ui.ts`  
被谁调用：`main.ts`（第一次启动、session cwd 丢失询问）；`cli/session-picker.ts`、`cli/project-trust.ts`。

## 本课目标

分清「启动期 TUI」和「交互模式 TUI」。这里造的是一次性小屏幕：问完就 `stop()`，不进入 `InteractiveMode`。读完应能指出：主题从哪来、官方发行才弹 first-time setup、取消/提交如何不双关。

## 在系统中的位置

```text
main.ts
  SettingsManager.create(...)
  shouldRunFirstTimeSetup() → showFirstTimeSetup()
  信任 / cwd 丢失 / --resume
    createStartupTui()
    showStartupSelector / showStartupInput
    ui.stop()
  然后才 createAgentSessionRuntime → InteractiveMode
```

启动期没有 `AgentSession`。能用的只有全局设置、主题包、`ProcessTerminal`。

## 官方发行判定

`isOfficialDistribution` 要求三件同时等于官方值：`PACKAGE_NAME`、`APP_NAME`、`CONFIG_DIR_NAME`。fork / 改名发行走假，避免把别人的产品当成 pi 弹欢迎页。

`shouldRunFirstTimeSetup` 还要：

- `PI_EXPERIMENTAL=1`
- 没有 `PI_AGENT_DIR` 覆盖
- `~/.pi/agent/settings.json` 还不存在

四条全真才弹 `FirstTimeSetupComponent`。

## `createStartupTui`

1. `setCapabilityOverrides`：设置里的终端能力覆盖（真彩、超链接等）。
2. `loadStartupThemes`：用**内存、不信任项目**的 SettingsManager 去 `DefaultPackageManager.resolve`，只加载已启用主题。坏主题吞掉，诊断留给后面的 ResourceLoader。
3. `initTheme`：设置里的 theme，或环境变量检测的终端底色。
4. `setKeybindings(KeybindingsManager.create())`：默认绑定，不读用户 `keybindings.json`（那是交互 mode 的事）。
5. `new TuiMainScreen(ProcessTerminal, showHardwareCursor, agentDir)`。

`startStartupTui` 先 `ui.start()`，再异步 `detectTerminalThemeForAuto`（100ms）。设置不是 auto 就不探测。

## 三个对话框

共同骨架：`settled` 旗标防双关；`finish` 里 `clearStartupTui`（清屏 + 25ms）再 `ui.stop()`。

| 函数 | 组件 | 提交写盘 |
|---|---|---|
| `showStartupSelector` | `ExtensionSelectorComponent` | 否，只返回选项值 |
| `showStartupInput` | `ExtensionInputComponent` | 否，返回字符串 |
| `showFirstTimeSetup` | `FirstTimeSetupComponent` | 是：`setTheme` + `setEnableAnalytics` + `flush` |

取消（Esc）返回 `undefined` / 不写盘。first-time 取消后进程仍继续，只是没有默认主题/分析开关。

## 失败与边界

主题包坏了不炸启动。探测超时用环境变量底色。`clearStartupTui` 的 25ms 是给终端一次 redraw，避免 stop 后残影进下一屏。

## 下一课

[13-auth-check.ts.md](/series/pi-source/coding-agent/480-auth-check-ts/)：`pi auth check` 如何问 ModelRuntime「这家有没有能用的凭证」。
