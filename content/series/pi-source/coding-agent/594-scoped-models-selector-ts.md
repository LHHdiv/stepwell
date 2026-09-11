---
title: "70 · scoped-models-selector.ts — /scoped-models 启用集"
summary: "无 session。搜索过滤；空格切换启用；某组键全开/全关；对已启用列表上下移动改循环顺序。EnabledIds = string[] | null，null 表示全部启用（不写过滤）。列表覆盖全部模型时 normalize 回 nu"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/scoped-models-selector.ts`  
谁创建：`showModelsSelector`。

## 订阅什么

无 session。搜索过滤；空格切换启用；某组键全开/全关；对已启用列表上下移动改循环顺序。`EnabledIds = string[] | null`，`null` 表示全部启用（不写过滤）。列表覆盖全部模型时 normalize 回 `null`。

## 画什么

边框、说明、搜索、每行 checkbox + `provider/id`，启用的排在前面保持用户顺序。

## 失败与边界

保存的是 id 列表到 settings。空列表（全部关掉）合法但随后 cycleModel 会无处可去——调用方应警告。

## 下一课

[71-config-selector.ts.md](/series/pi-source/coding-agent/596-config-selector-ts/)
