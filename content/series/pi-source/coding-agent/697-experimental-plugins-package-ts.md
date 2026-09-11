---
title: "136 · experimental/plugins/package.ts — 插件包配置与打包"
summary: "normalizePluginPackagePaths 去重绝对路径。server 级 profile plugin-packages-<serverId>.json；session 级另一份，按 sessionPath 哈希。crea"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/plugins/package.ts`

`normalizePluginPackagePaths` 去重绝对路径。server 级 profile `plugin-packages-<serverId>.json`；session 级另一份，按 sessionPath 哈希。`createServerPluginPackage` 调 `bundleFacetPackage`，默认 entry `src/session.ts` / `src/tui.ts`。`build()` 产出 artifact 给 presentation。

## 下一课

服务定义从 agent-controller 起：[137-experimental.services.agent-controller.ts.md](/series/pi-source/coding-agent/698-experimental-services-agent-controller-ts/)
