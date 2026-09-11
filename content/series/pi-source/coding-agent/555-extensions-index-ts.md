---
title: "50 · extensions/index.ts — 扩展子系统的桶"
summary: "再导出 types、discoverAndLoadExtensions / loadExtensions、ExtensionRunner、slash/source 类型。不再导出 loader 的 jiti 细节（VIRTUALMODU"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/extensions/index.ts`  
被谁调用：`core/index.ts`、SDK 用户 `import { defineTool, ExtensionRunner } from "@earendil-works/pi-coding-agent"`。

## 本课目标

再导出 types、`discoverAndLoadExtensions` / `loadExtensions`、`ExtensionRunner`、slash/source 类型。**不**再导出 loader 的 jiti 细节（`VIRTUAL_MODULES`）。扩展作者应从包根或本桶 import，不要深挖 `loader.ts`。

`defineTool` 从 types 经本文件到 SDK。

## 下一课

工具正课开始：[51-tools-index.ts.md](/series/pi-source/coding-agent/557-tools-index-ts/)。
