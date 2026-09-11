---
title: "148 · services/plugins.ts — 插件服务名"
summary: "pi.presentation-plugins：server 上 prepareSession / reload，返回 facet artifact JSON。pi.session-plugins：worker 上 reload 热加载"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/plugins.ts`

`pi.presentation-plugins`：server 上 `prepareSession` / `reload`，返回 facet artifact JSON。`pi.session-plugins`：worker 上 `reload` 热加载 session facet。两个进程各管各的包，靠 prepare 时选中的路径对齐。

## 下一课

[149-experimental.services.presentation-ui.ts.md](/series/pi-source/coding-agent/710-experimental-services-presentation-ui-ts/)
