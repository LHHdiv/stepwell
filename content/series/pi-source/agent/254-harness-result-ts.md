---
title: "13 · result.ts — 预期失败是值，不是异常"
summary: "会用 tag 做穷尽匹配。分清 LaneBusy（再 prompt 太早）和 HarnessFault（存储/不变式坏了，整个 harness 废了）。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/result.ts`  
被谁调用：`agent-harness.ts` re-export；`Lane.accept` / `drive` / `prompt` 的返回类型。

## 本课目标

会用 `_tag` 做穷尽匹配。分清 `LaneBusy`（再 prompt 太早）和 `HarnessFault`（存储/不变式坏了，整个 harness 废了）。

## `Result` 与 `TaggedError`

这里的 `Result.ok` / `Result.err` / `isOk` / `isErr` 和 `types.ts` 的 `ok`/`err` 同构，但是 **另一份函数**。lane 公开 API 用这份（带 `Result.ok` 命名空间）。

`TaggedError("LaneBusy")` 工厂：生成的类 `extends Error`，有 `_tag`、把 props assign 到实例、`toJSON` 去掉循环、静态 `is()`。`matchError(error, { LaneBusy: ..., Closed: ... })` 按 tag 分派。

## 业务错误一览

| 类 | 何时 |
|---|---|
| `LaneBusy` | 已有 currentOperation，又 accept |
| `OperationMismatch` | drive/abort 的 operationId 不是当前的 |
| `NoActiveRun` / `NoActiveOperation` | 糖方法找不到可 abort 的东西 |
| `NothingToResume` | resume 时 operation 为 null |
| `NothingToCompact` | 路径空或最后一条已是 compaction |
| `InvalidMessage` | pending assistant、空 steer 等 |
| `InvalidNavigation` | 目标就是当前 tip、根节点还想贴 label |
| `UnknownSkill` / `UnknownTemplate` / `UnknownTarget` | 名字或 entry id 不存在 |
| `InvalidLane` | 空名或含 `\0` |
| `Closed` | harness/session 已 close；作为 Result 返回给还在飞的糖方法 |

`NoActiveRun` 仍导出，现行代码更常用 `NoActiveOperation`。

## 致命错误

`HarnessFault`：message 固定包装 `"AgentHarness storage or invariant fault"`，`cause` 是原错误。一旦 fault，hooks/events close，所有 lane seal，之后 API throw 同一个 fault。

`HarnessClosed`：`close()` 时生成，message 为 `"AgentHarness was closed while the operation was active"`。正在跑的 drive 被 gate.close。

## 失败与边界

`SessionInvariantError` 在 `session.ts`，不是 tagged error。它一旦从 planner/drive 冒出来，被 `onFault` 收成 `HarnessFault`。不要在应用层 catch `SessionInvariantError` 当「用户点错了」。

## 下一课

[14 · events.ts](/series/pi-source/agent/255-harness-events-ts/)：这些 Result 之外，UI 靠事件总线看进度。
