---
title: "134 · experimental/plugin.ts — 实验插件的稳定 API 面"
summary: "只 re-export：AgentController、PresentationUI、SlashCommands 及请求类型。插件 resolveExternal(\"@earendil-works/pi-coding-agent/exp"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/plugin.ts`

只 re-export：`AgentController`、`PresentationUI`、`SlashCommands` 及请求类型。插件 `resolveExternal("@earendil-works/pi-coding-agent/experimental/plugin")` 指到本文件，这样打包后的 facet 不绑死内部路径。

## 下一课

[135-experimental.plugins.bundled.ts.md](/series/pi-source/coding-agent/696-experimental-plugins-bundled-ts/)
