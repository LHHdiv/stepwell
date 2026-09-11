---
title: "56 · model-selector.ts — /model 搜索列表"
summary: "无 session 订阅。打开时 refreshModelCatalogs 后台跑，状态字写在列表上方（Refreshing / 成功 / 错误）。搜索框 Input.onChange 用 fuzzyFilter + getModelS"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/model-selector.ts`  
谁创建：`showModelSelector`。

## 订阅什么

无 session 订阅。打开时 `refreshModelCatalogs` 后台跑，状态字写在列表上方（Refreshing / 成功 / 错误）。搜索框 `Input.onChange` 用 `fuzzyFilter` + `getModelSelectorSearchText`。键盘：上下、确认、取消、Tab 在 all/scoped 之间切、某键把当前项设为默认模型。

组件 `closed` 后还在飞的 refresh 被 AbortController 取消。

## 画什么

边框、标题、可选 scoped 提示、搜索框、过滤后的 `provider/id` 列表（当前模型打勾）、刷新状态、键位。错误（catalog 失败）黄/红字。

## 失败与边界

scoped 为空时 scope 切到 all。列表数据来自 `modelRuntime.getAvailableSnapshot()` 的拷贝，刷新完成要重建 `allModels`。

## 下一课

[57-thinking-selector.ts.md](/series/pi-source/coding-agent/568-thinking-selector-ts/)
