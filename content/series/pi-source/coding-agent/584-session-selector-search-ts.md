---
title: "65 · session-selector-search.ts — /resume 搜索语法"
summary: "不画。parseSearchQuery："
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/session-selector-search.ts`  
谁调用：`SessionSelectorComponent`。

## 订阅什么

无。纯函数。

## 画什么

不画。`parseSearchQuery`：

- `re:pattern` → 正则，忽略大小写；坏正则 `error` 字段，匹配恒 false。
- 否则按空白切 token，`"精确短语"` 用 quote。模糊 token 走 `fuzzyMatch`。

`matchSession` 在 id/name/allMessagesText/cwd 上打分。`filterAndSortSessions` 再按 `SortMode`（threaded/recent/relevance）和 `NameFilter`（all/named）排序。

## 失败与边界

未闭合引号当错误，整句不匹配，避免半截 query 把列表闪空又闪回。

## 下一课

[66-session-selector.ts.md](/series/pi-source/coding-agent/586-session-selector-ts/)
