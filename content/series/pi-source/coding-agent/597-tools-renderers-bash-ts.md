---
title: "71 · renderers/bash.ts — shell 的直播输出"
summary: "createShellRenderers(\"$\" | \"PS>\")：bash 与 powershell 共用。BASHUPDATETHROTTLEMS = 100 与 execute 里 schedule 一致。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/renderers/bash.ts`

`createShellRenderers("$" | "PS>")`：bash 与 powershell 共用。`BASH_UPDATE_THROTTLE_MS = 100` 与 execute 里 schedule 一致。

`renderCall`：`$ command` + 可选 timeout 灰色后缀。非法 command 参数红色 invalid。

`renderResult`：折叠预览 5 行；展开全量（仍是已经 truncateTail 的文本）。跑的时候用 `startedAt` 显示秒表。截断时提示 tmp 路径和 50KB 限制。`BashResultRenderComponent` 按宽度缓存折行，避免每次 keypress 重算。

execute 的 `onUpdate({ content: [] })` 一开始就来，renderer 能立刻画「已开始」。

## 下一课

[72-tools-renderers-grep.ts.md](/series/pi-source/coding-agent/599-tools-renderers-grep-ts/)。
