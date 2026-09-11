---
title: "81 · client/index.ts — 再导出 pi-client"
summary: "实验 server/client 用 @earendil-works/pi-client 的 Unix/Radius transport。coding-agent 包把这条路径再导出，让外部 import from \"@earendil"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/client/index.ts`  
内容：`export * from "@earendil-works/pi-client"`。

## 本课目标

实验 server/client 用 `@earendil-works/pi-client` 的 Unix/Radius transport。coding-agent 包把这条路径再导出，让外部 `import from "@earendil-works/pi-coding-agent/client"`（若 package.json exports 配了）不必直接依赖 pi-client 版本。

本文件无逻辑、无事件、无 UI。

## 下一课

Bun 入口：[82-bun.cli.ts.md](/series/pi-source/coding-agent/618-bun-cli-ts/)
