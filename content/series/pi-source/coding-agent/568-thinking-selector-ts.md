---
title: "57 · thinking-selector.ts — 思考档位列表"
summary: "无 session。搜索框过滤 SelectList。确认走 onSelect(level)；可选另一快捷键 onSelectAsDefault。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/thinking-selector.ts`  
谁创建：`/thinking` 无精确匹配时。

## 订阅什么

无 session。搜索框过滤 `SelectList`。确认走 `onSelect(level)`；可选另一快捷键 `onSelectAsDefault`。

## 画什么

边框、搜索、档位名（当前项前打勾）+ 描述（off/minimal/…/max 的 token 量说明）。

## 失败与边界

只列出 `session.getAvailableThinkingLevels()`，模型不支持的档不会出现。

## 下一课

[58-theme-selector.ts.md](/series/pi-source/coding-agent/570-theme-selector-ts/)
