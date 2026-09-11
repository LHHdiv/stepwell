---
title: "43 · index.ts — 根导出"
summary: "对照你读过的文件，看哪些没从根出去：TuiBase、layout.ts 的函数、native-modifiers、alt-screen-search、AltScreenFlashContainer、layout-node。它们是内部件，"
tags: [pi, tui]
---
源码：`packages/tui/src/index.ts`

## 本课目标

对照你读过的文件，看哪些**没**从根出去：`TuiBase`、`layout.ts` 的函数、`native-modifiers`、`alt-screen-search`、`AltScreenFlashContainer`、`layout-node`。它们是内部件，AltScreen 自己用。

根上有：Marked（方便主题）、所有公共组件、EditorComponent、fuzzy、keybindings、keys、latex、getNativeClipboard、StdinBuffer、ProcessTerminal、terminal-colors、terminal-image、TUI 接口、两种 Screen、utils 宽度函数。

`native-platform` 只导出 clipboard 类型和 `getNativeClipboard`，不导出 `getNativePlatformHelper`（避免产品依赖修饰键探测细节）。

## 失败与边界

从根 import 会拉进 marked。tree-shake 依赖打包器。coding-agent 交互一次全用到，无所谓。

## 下一课

TUI 源码课结束。产品如何把 Agent 事件变成这些组件：coding-agent `modes/interactive/`。实验多进程 presentation 仍用本包画屏，服务绑定在 Chord。
