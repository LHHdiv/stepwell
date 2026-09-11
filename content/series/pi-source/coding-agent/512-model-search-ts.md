---
title: "29 · model-search.ts — 模型模糊搜索的拼接串"
summary: "两行函数，差在「裸 id 是否放在搜索串最前」。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/model-search.ts`  
被谁调用：自动补全 `/model ` 参数用 `getModelSearchText`；模型选择器用 `getModelSelectorSearchText`。

## 本课目标

两行函数，差在「裸 id 是否放在搜索串最前」。

## 两个函数

`getModelSearchText`：`"${id} ${provider} ${provider}/${id} ${provider} ${id}${name}"`。补全时用户常打 `gpt` 或 `opus`，裸 id 靠前有利于 fuzzy 命中。

`getModelSelectorSearchText`：**故意不把裸 id 放在开头**。选择器里精确输入 `openai/gpt-5` 时，若裸 `gpt-5` 排最前，openrouter 的 `openai/gpt-5` 代理 id 会和官方挤在一起且排序发飘。provider 前缀靠前，精确 `provider/id` 更稳。

都不订事件、不画 UI。

## 下一课

[30-model-catalog-refresh.ts.md](/series/pi-source/coding-agent/514-model-catalog-refresh-ts/)
