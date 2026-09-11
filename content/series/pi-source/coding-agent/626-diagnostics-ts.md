---
title: "86 · diagnostics.ts — 资源加载诊断形状"
summary: "ResourceDiagnostic：warning | error | collision + message + 可选 path。collision 带 ResourceCollision（resourceType、name、win"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/diagnostics.ts`

`ResourceDiagnostic`：`warning | error | collision` + message + 可选 path。collision 带 `ResourceCollision`（resourceType、name、winner/loser path 与 source）。Skill 重名、扩展命令重名走这个结构。ResourceLoader 收集后交给 main 打印；error 通常 `exit(1)`，warning 继续。

## 下一课

[87-event-bus.ts.md](/series/pi-source/coding-agent/628-event-bus-ts/)。
