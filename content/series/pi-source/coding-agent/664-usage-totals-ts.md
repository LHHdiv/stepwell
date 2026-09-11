---
title: "105 · usage-totals.ts — 会话账单汇总"
summary: "扫 SessionEntry：assistant usage 按 provider/model 分桶；toolResult.usage、compaction、branchsummary 进 Tools/summaries。输出按 cos"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/usage-totals.ts`  
被谁调用：`/session`、footer 花费。

扫 `SessionEntry`：assistant usage 按 `provider/model` 分桶；toolResult.usage、compaction、branch_summary 进 `Tools/summaries`。输出按 cost 降序。`createUsageTotals` / `addUsageToTotals` 给增量 UI。

只读条目，不调 API。

## 下一课

[106-core-index.ts.md](/series/pi-source/coding-agent/666-core-index-ts/)。
