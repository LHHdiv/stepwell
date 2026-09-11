---
title: "39 · native-module-path.ts — 搜索 .node 的位置"
summary: "getNativeModuleCandidates(nativePath) 去重后的顺序："
tags: [pi, tui]
---
源码：`packages/tui/src/native-module-path.ts`

## 本课目标

`getNativeModuleCandidates(nativePath)` 去重后的顺序：

1. `require.resolve("@earendil-works/pi-tui")` 的上一级 + nativePath（已安装包）
2. 本模块目录的上一级（源码 `src/` 的上级是 package root）
3. 本模块目录（dist 旁若被错误打包）
4. `process.execPath` 目录（单文件二进制把 prebuild 放旁边）

resolve 失败（standalone）跳过 1。测试可注入 `moduleUrl` / `execPath` / `resolvePackage`。

## 失败与边界

所有候选都 fail → helper undefined。不要 throw。

## 下一课

[40-native-modifiers.ts.md](/series/pi-source/tui/462-native-modifiers-ts/)。
