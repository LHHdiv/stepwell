---
title: "75 · extensions/index.ts — 内置扩展清单"
summary: "目前只有一项：{ name: \"llama.cpp\", factory: llamaExtension, hidden: true }。hidden 表示不出现在普通扩展列表里，但仍注册 provider 和 /llama。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/extensions/index.ts`  
被谁调用：`main.ts` 把 `builtInExtensions` 放进 `extensionFactories`。

## 本课目标

目前只有一项：`{ name: "llama.cpp", factory: llamaExtension, hidden: true }`。hidden 表示不出现在普通扩展列表里，但仍注册 provider 和 `/llama`。

## 订阅 / 绘制

本文件无运行时。工厂在资源加载时调用。

## 下一课

[76-llama.index.ts.md](/series/pi-source/coding-agent/607-llama-index-ts/)
