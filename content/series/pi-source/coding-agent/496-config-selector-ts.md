---
title: "21 · config-selector.ts — `pi config` 入口皮"
summary: "这是另一条 CLI 进程：不创建 AgentSession。打开 ConfigSelectorComponent，让用户开关扩展/Skill/主题/包，写回 settings。关闭后 Promise resolve，进程由调用方退出。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/config-selector.ts`  
被谁调用：`package-manager-cli.ts`（`pi config` / 包管理 TUI），不是 `main.ts` 的会话路径。

## 本课目标

这是另一条 CLI 进程：不创建 AgentSession。打开 `ConfigSelectorComponent`，让用户开关扩展/Skill/主题/包，写回 settings。关闭后 Promise resolve，进程由调用方退出。

## 在系统中的位置

```text
package-manager-cli.ts
  SettingsManager + DefaultPackageManager.resolve
  selectConfig({ resolvedPaths, settingsManager, cwd, agentDir, writeScope, projectModeAvailable })
    initTheme
    TuiMainScreen + ConfigSelectorComponent
    关闭 → stopThemeWatcher
```

`writeScope: "global" | "project"` 决定改哪份 `settings.json`。`projectModeAvailable` 为假时 UI 不能切到项目范围（通常是项目未信任）。

## `selectConfig`

`initTheme(..., true)` 的第二参强制立即应用。TUI 用 `ProcessTerminal`，硬件光标和 shrink 清屏来自设置。

两个结束回调：

- 正常关闭：`ui.stop()` + `stopThemeWatcher()` + `resolve()`
- 强制退出：同样 stop，然后 `process.exit(0)`

`resolved` 防止正常关闭被调两次。焦点在 `selector.getResourceList()`。

## 失败与边界

组件内部的安装/删除失败由 package-manager 报在 TUI 里，本文件不 catch。`stopThemeWatcher` 必须成对调用，否则文件监视会让进程挂住。这不是启动期 `createStartupTui`，主题 watcher 是完整交互主题系统。

## 下一课

[22-experimental-cli.ts.md](/series/pi-source/coding-agent/498-experimental-cli-ts/)：实验命令树的根，`pi experimental …`。
