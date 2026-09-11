---
title: "103 · telemetry.ts — 安装/更新 ping 开关"
summary: "isInstallTelemetryEnabled(settings, env=PITELEMETRY)：环境变量若存在，只有 1/true/yes 为开，其它为关（可强制关）。未设则用 settings enableInstallTe"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/telemetry.ts`

`isInstallTelemetryEnabled(settings, env=PI_TELEMETRY)`：环境变量若存在，只有 `1/true/yes` 为开，其它为关（可强制关）。未设则用 settings `enableInstallTelemetry`（默认 true）。归因头（42 课）和 changelog 后的版本 ping 都问它。不是会话内容分析（那是另一开关 `enableAnalytics`）。

## 下一课

[104-timings.ts.md](/series/pi-source/coding-agent/662-timings-ts/)。
