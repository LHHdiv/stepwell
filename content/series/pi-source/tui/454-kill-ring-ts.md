---
title: "32 · kill-ring.ts — Emacs 剪切环"
summary: "push(text, { prepend, accumulate? })：accumulate 时与最后一条合并（反向删 prepend）。peek 最新。rotate 把最新挪到队头，yank-pop 用。无大小上限——长时间连续 k"
tags: [pi, tui]
---
源码：`packages/tui/src/kill-ring.ts`

## 本课目标

`push(text, { prepend, accumulate? })`：accumulate 时与最后一条合并（反向删 prepend）。`peek` 最新。`rotate` 把最新挪到队头，yank-pop 用。无大小上限——长时间连续 kill 会涨。

空 text 忽略。Editor/Input 的 `lastAction==="kill"` 决定下一次是否 accumulate。

## 下一课

[33-undo-stack.ts.md](/series/pi-source/tui/455-undo-stack-ts/)。
