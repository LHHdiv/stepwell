---
title: "70 · utils/deferred-tools.ts — 哪些工具现在发，哪些等 toolResult 再挂"
summary: "enabled === false：全部 immediate。"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/deferred-tools.ts`  
被谁调用：Anthropic `tool_reference`、OpenAI `additional_tools` / tool-search、Kimi deferred。

## `splitDeferredTools(context, enabled, normalizeName?)`

`enabled === false`：全部 immediate。

否则扫消息：助手 toolCall 的名字进 `usedNames`；toolResult 的 `addedToolNames` 若不在 used 里，进 `deferredNames`。当前 `context.tools` 里名字在 deferredNames 的进 `deferred` Map，其余 immediate。

含义：会话中途 `addedToolNames` 声明「这些工具从这里才存在」，厂家若支持原生延迟加载，就不要在第一轮 tools 数组里发它们（省 prompt），在对应 toolResult 位置用 reference 加载。

normalizeName：OAuth Claude Code 大小写映射要两边一致，否则 Read vs read 对不上。

## 失败与边界

tools 里重名：Map 后者赢。immediate 空、deferred 非空时，Anthropic 实现会把 deferred 改回 immediate（不能只发 reference 没有宿主工具）。未 enabled 的厂家忽略 addedToolNames，始终发全表。

## 下一课

Headers 转换：[71-utils-headers.ts.md](/series/pi-source/ai/132-utils-headers-ts/)。
