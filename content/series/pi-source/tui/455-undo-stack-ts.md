---
title: "33 · undo-stack.ts — 克隆快照"
summary: "push 用 structuredClone。pop 直接返回，不再克隆。无 redo。Editor 在变更前 push { lines, cursorLine, cursorCol }。"
tags: [pi, tui]
---
源码：`packages/tui/src/undo-stack.ts`

## 本课目标

`push` 用 `structuredClone`。`pop` 直接返回，不再克隆。无 redo。Editor 在变更前 push `{ lines, cursorLine, cursorCol }`。

`structuredClone` 不能克隆函数；快照必须是纯数据。无限增长——Editor 应在合适点 `clear`（提交后）。

## 下一课

[34-word-navigation.ts.md](/series/pi-source/tui/456-word-navigation-ts/)。
