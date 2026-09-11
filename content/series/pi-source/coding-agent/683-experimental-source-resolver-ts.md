---
title: "122 · experimental/source-resolver.ts — tsconfig paths 钩子"
summary: "Node 能跑 TypeScript，但不会应用 tsconfig 的 @earendil-works/ → packages//src。内部进程 --import 本文件 registerHooks：最长前缀匹配 alias，.js "
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/source-resolver.ts`

Node 能跑 TypeScript，但不会应用 `tsconfig` 的 `@earendil-works/*` → `packages/*/src`。内部进程 `--import` 本文件 `registerHooks`：最长前缀匹配 alias，`.js` specifier 改试 `.ts`，避免静默落到过期的 dist。

匹配了 alias 但文件不存在则 throw，不准 nextResolve 进 node_modules 里的旧包。

## 下一课

[123-experimental.coordinator.ts.md](/series/pi-source/coding-agent/684-experimental-coordinator-ts/)
