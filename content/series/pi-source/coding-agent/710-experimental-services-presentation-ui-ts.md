---
title: "149 · services/presentation-ui.ts — 插件用的本地 UI"
summary: "{ local: true }。select(title, items, selectedValue) / showStatus。实验 TUI 把 select 接到自己的 SelectList overlay。比 Interactiv"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/presentation-ui.ts`

`{ local: true }`。`select(title, items, selectedValue)` / `showStatus`。实验 TUI 把 select 接到自己的 SelectList overlay。比 InteractiveMode 的 `ExtensionUIContext` 窄得多：没有 editor、没有 widget。

## 下一课

[150-experimental.services.worker.ts.md](/series/pi-source/coding-agent/711-experimental-services-worker-ts/)
