---
title: "72 · renderers/grep.ts — grep 的 TUI"
summary: "renderCall：pattern、path、glob、limit。renderResult：匹配行原样（已含 path:line:）；details 上的 match limit / 50KB / 行截断画成 muted notic"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/renderers/grep.ts`

`renderCall`：pattern、path、glob、limit。`renderResult`：匹配行原样（已含 path:line:）；details 上的 match limit / 50KB / 行截断画成 muted notice。无匹配显示 No matches。

不调用 rg。

## 下一课

[73-tools-renderers-find.ts.md](/series/pi-source/coding-agent/601-tools-renderers-find-ts/)。
