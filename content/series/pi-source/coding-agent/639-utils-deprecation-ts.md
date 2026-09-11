---
title: "92 · utils/deprecation.ts — 去重的黄字警告"
summary: "warnDeprecation(message)：同一 message 进程内只印一次。clearDeprecationWarningsForTests 清空 Set。给旧设置项、旧 API 用，避免循环里刷屏。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/deprecation.ts`

`warnDeprecation(message)`：同一 message 进程内只印一次。`clearDeprecationWarningsForTests` 清空 Set。给旧设置项、旧 API 用，避免循环里刷屏。

## 下一课

[93-utils.pi-user-agent.ts.md](/series/pi-source/coding-agent/641-utils-pi-user-agent-ts/)
