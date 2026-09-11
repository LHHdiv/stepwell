---
title: "79 · utils/usage.ts — 用量相加"
summary: "emptyUsage 全 0。addUsage 把 input/output/cache/totalTokens/cost 相加；cacheWrite1h 与 reasoning 仅当至少一侧有值才出现（缺省当 0 加）。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/utils/usage.ts`

`emptyUsage` 全 0。`addUsage` 把 input/output/cache/totalTokens/cost 相加；`cacheWrite1h` 与 `reasoning` 仅当至少一侧有值才出现（缺省当 0 加）。

Storage stats、v3 导入、compaction 多次 complete 都走它。没有减用法：usage ledger 只 append。

## 下一课

[80 · truncate.ts](/series/pi-source/agent/321-harness-utils-truncate-ts/)。
