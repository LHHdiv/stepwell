---
title: "135 · experimental/plugins/bundled.ts — facet bundle 装卸"
summary: "createSessionPluginFacetLoader(manifestPaths)：worker 侧按 chord bundle entry: \"session\" 加载。没有 session entry 的包返回空 facets"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/plugins/bundled.ts`

`createSessionPluginFacetLoader(manifestPaths)`：worker 侧按 chord bundle `entry: "session"` 加载。没有 session entry 的包返回空 facets。

`createPresentationFacetData(artifacts)` 把构建产物塞进 JSON，经网络到 presentation。`createPresentationFacetLoaders` 只信任 server 选中的 artifact，客户端不能自己扫磁盘（Radius 场景下也没那些路径）。

external `PI_PLUGIN_API` 解析到 `plugin.ts`。

## 下一课

[136-experimental.plugins.package.ts.md](/series/pi-source/coding-agent/697-experimental-plugins-package-ts/)
