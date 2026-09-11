---
title: "67 · tools/renderers/index.ts — 只渲染、不加载执行器"
summary: "createAllToolRenderers()：八个名字 → { renderCall, renderResult }。powershell 与 bash 都是 createShellRenderers，prompt 不同。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/renderers/index.ts`  
被谁调用：交互 TUI 的 `ToolExecutionComponent`；HTML 导出。注释写明：import 本文件而不是 `tools/index.ts`，能少约 17MB 模块图（typebox schema + spawn 实现）。

## API

`createAllToolRenderers()`：八个名字 → `{ renderCall, renderResult }`。powershell 与 bash 都是 `createShellRenderers`，prompt 不同。

`withBuiltInRenderers(name, definition)`：扩展没给 renderer 时填内置。过去这查找在组件里，迫使所有 presentation 依赖执行代码。

## 和 executeToolCalls 的关系

零。loop 不调用 renderer。流式 `onUpdate` 的 details 被 renderResult 读来画进度。

## 下一课

[68-tools-renderers-read.ts.md](/series/pi-source/coding-agent/591-tools-renderers-read-ts/)。
