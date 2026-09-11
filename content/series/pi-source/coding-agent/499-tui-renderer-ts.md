---
title: "22 · tui-renderer.ts — 交互皮和 pi-tui 的焊点"
summary: "分清 TuiMainScreen 和 TuiAltScreen。本文件是 composition root：coding-agent 不自己读写 tty raw mode，全部交给 @earendil-works/pi-tui。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/tui-renderer.ts`（79 行）  
被谁调用：`InteractiveMode` 构造函数、`switchTuiMode`；实验客户端 TUI 也复用。

## 本课目标

分清 `TuiMainScreen` 和 `TuiAltScreen`。本文件是 composition root：coding-agent **不**自己读写 tty raw mode，全部交给 `@earendil-works/pi-tui`。

## 在系统中的位置

```text
InteractiveMode
  createInteractiveTui({ tuiMode, showHardwareCursor, logDirectory, ... })
    tuiMode === "fullscreen" → TuiAltScreen  (备用屏、选中复制、URL 点击)
    tuiMode === "regular"    → TuiMainScreen (主屏滚动，像普通终端输出)
  createInteractiveTuiReference(() => this.renderer)
    Proxy：组件持有的 TUI 句柄在切 fullscreen 时自动跟到新 renderer
```

## `createInteractiveTui`

`terminal` 默认 `new ProcessTerminal()`（stdin/stdout）。测试可注入假 Terminal。

### fullscreen → `TuiAltScreen`

进备用屏（alternate screen buffer），退出时主屏内容还在。额外能力：

- **搜索高亮**：`theme.bg("searchMatchBg")` + underline / inverse。
- **跳到最新**：底部条 `↓ Jump to latest message · <shortcut>`，快捷键文案来自 `keyDisplayText("tui.altScreen.bottom")`。
- **`openUrl: openBrowser`**：点击 Markdown 链接用系统浏览器。Windows 走 rundll32，不经过 `cmd /c start`。
- **右键粘贴**：`onRightClickPaste`，InteractiveMode 绑到剪贴板读文本再当 bracketed paste 喂给焦点组件。
- **划选复制**：`copyOnSelect` 来自设置；`copySelection` 调 `copyToClipboard`，失败返回 false（TUI 会继续用 OSC 52 之类的后备）。

### regular → `TuiMainScreen`

没有搜索条、没有划选复制。聊天像日志一样往主屏刷，退出后历史还在滚动缓冲里。`fullscreenExitOutput === "transcript"` 时，`stopInteractiveTui` 会先切回 regular 再 stop，把对话留在主屏。

## `createInteractiveTuiReference`

`InteractiveMode` 把 `this.ui` 传给 Editor、Footer、扩展。切 TUI 模式时 `this.renderer` 换成新实例，旧对象已经 `stop()`。Proxy 每次 `get` 都 `getTui()`。方法被调用时若 renderer 已换，重新取方法再 `apply`。

`set` / `has` / `getPrototypeOf` 一并代理，避免 `ui instanceof` 或赋值 `onDebug` 打到空对象上。

## 和 tui 包的关系

`packages/tui` 不知道 Agent。它提供：组件树、`requestRender`、键盘焦点、Overlay、Terminal 能力探测。coding-agent 在本文件选择「哪一种 Screen」，在 `interactive-mode.ts` 里把 Agent 事件变成组件 props。读 TUI 包从 `packages/tui/src/tui.ts` 的 `start`/`stop` 开始，见 [tui 模块导读](/series/pi-source/tui/422-%E6%A8%A1%E5%9D%97%E5%AF%BC%E8%AF%BB/)。

## 失败与边界

- `copyToClipboard` throw 被吃掉，返回 false。不要在这里弹错误，划选路径要求同步手感。
- logDirectory 用 `getAgentDir()`。TUI 把渲染调试日志写到 agent 目录，不是 cwd。

## 下一课

[23-chat-viewport.ts.md](/series/pi-source/coding-agent/500-chat-viewport-ts/) — fullscreen 时文档区和输入坞怎么叠。
