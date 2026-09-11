---
title: "104 · timings.ts — `PI_TIMING=1` 启动剖面"
summary: "未开环境变量时所有函数空操作。开启后 time(\"label\") 记录距上次的 ms。两个 namespace：main、extensions。printTimings 打到 stderr。ResourceLoader.reload 会"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/timings.ts`

未开环境变量时所有函数空操作。开启后 `time("label")` 记录距上次的 ms。两个 namespace：`main`、`extensions`。`printTimings` 打到 stderr。ResourceLoader.reload 会 `resetTimings("extensions")`。用来找「扩展 jiti 慢」还是「包 resolve 慢」，不是运行时 tracer。

## 下一课

[105-usage-totals.ts.md](/series/pi-source/coding-agent/664-usage-totals-ts/)。
