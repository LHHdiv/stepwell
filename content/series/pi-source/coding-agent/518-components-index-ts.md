---
title: "32 · components/index.ts — 扩展能拿到的组件清单"
summary: "这不是运行时注册表。InteractiveMode 自己从各文件直接 import，不经过本 index。本文件决定哪些组件算稳定 SDK。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/index.ts`  
被谁调用：`src/index.ts` 再导出；扩展 `import { FooterComponent, ... } from "@earendil-works/pi-coding-agent"`。

## 本课目标

这不是运行时注册表。InteractiveMode 自己从各文件直接 import，不经过本 index。本文件决定**哪些组件算稳定 SDK**。

未再导出的内部件：`config-selector`（给 `pi config`）、`countdown-timer`、`custom-entry`、`earendil-announcement`、`markdown-transform`、`mermaid`、`session-selector-search`、`settings-submenu`、`status-indicator`、`visual-truncate`。扩展要用渲染能力，走已导出的 Message/Tool 组件或 `ui.custom()`。

## 订阅与绘制

本文件无组件、无事件。

## 下一课

真正的输入盒：[33-custom-editor.ts.md](/series/pi-source/coding-agent/520-custom-editor-ts/)
