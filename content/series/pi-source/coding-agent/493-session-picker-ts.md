---
title: "19 · session-picker.ts — `--resume` 选一个 JSONL"
summary: "这是薄封装：真正的列表/搜索/删除在 SessionSelectorComponent。本文件只负责启动期 TUI 的生命周期，以及三个出口（选中、取消、强制退出）。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/session-picker.ts`  
被谁调用：`main.ts` 在交互且 `--resume` 没有给出路径时。

## 本课目标

这是薄封装：真正的列表/搜索/删除在 `SessionSelectorComponent`。本文件只负责启动期 TUI 的生命周期，以及三个出口（选中、取消、强制退出）。

## 在系统中的位置

```text
main.ts --resume
  currentSessionsLoader  → 当前 cwd 的 sessions/
  allSessionsLoader      → 全部会话
  selectSession(...)
    createStartupTui
    SessionSelectorComponent
  返回 path | null
  null → 用户取消，main 自行决定 exit
```

两个 loader 由 main 闭包提供，类型 `(onProgress?) => Promise<SessionInfo[]>`。组件可以边扫盘边回调进度。

## `selectSession`

1. `createStartupTui` + `KeybindingsManager.create()` + `setKeybindings`（选择器要认 Ctrl+C 等）。
2. `resolved` 旗标：选中和取消都只 resolve 一次。
3. 三个回调：
   - 选中 path：`ui.stop()`，`resolve(path)`
   - 取消：`resolve(null)`
   - 第三回调（组件里的强制退出，例如某些快捷键）：`ui.stop(); process.exit(0)` —— **不经过 main 的清理**
4. `showRenameHint: false`：启动期选择器不提供重命名提示，那是交互里 `/resume` 的完整选择器才有。

焦点在 `selector.getSessionList()`，不是整个 selector 外壳。

## 失败与边界

本函数不读会话文件。坏 JSONL 由 loader / SessionManager 处理。`process.exit(0)` 那条会跳过 main 后面的 telemetry。取消返回 `null` 不是 throw。

## 下一课

[20-cli-project-trust.ts.md](/series/pi-source/coding-agent/494-cli-project-trust-ts/)：把启动期 UI 接到核心信任判定。
