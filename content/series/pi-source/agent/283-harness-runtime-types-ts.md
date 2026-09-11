---
title: "42 · runtime/types.ts — Drive、LaneCommand、过程返回值"
summary: "watchSession 用。message 写明「later AgentHarness slice」。不是 HarnessFault。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/types.ts`  
被谁调用：lane.command / settleOperation；drive.ts 循环；每个 drive/* 过程。

## `SliceNotImplemented`

`watchSession` 用。message 写明「later AgentHarness slice」。不是 HarnessFault。

## `Config<TContext>`

进程内 harness 配置（工具、resources、streamOptions、retry、compaction、队列模式、toolExecution、toolContext、systemPrompt、toProviderMessages、entryProjectors）。**不进磁盘**。lane 的 durable 配置只有 model/thinkingLevel/activeToolNames。

## `LaneState`（runtime）

比 session 的 `LaneState`（inbox + operation ids）多：`tipId`、`configuration`、完整 `operation: { meta, state } | null`。restore 把三份 value 拼成这个。lane 内存里这份是权威投影，commit 成功后同步替换，禁止 in-place mutate。

## `LaneCommand` / `OperationCommand`

planner 在 mutation 回调里只能选：

- `commit`：writes + next LaneState + **同步** `materialize(commit)` + 可选 events
- `return`：不写盘（把结果装箱，避免 Promise 被当成 thenable 在锁内 await）
- `reject`：预期错误，不 fault
- operation 额外：`finish` = 写 result、清 operation、inbox/tip patch

`materialize` 若返回 Promise → TypeError → fault。seq 必须在锁内读完，不能异步回头问。

## `Drive` 类

一次 process-local 推进：

- `operationId`、剥掉 abort 的 `context`
- `waitForRetry`：糖方法 true；调度器可 false，到期再 drive
- `deferredPermits`：`pollDeferred` true 则 1，否则 0（每 pass 最多 poll 一次）
- `gate` + `closeSignal`：关 harness 时 abort 孩子
- `completion` Promise：settle/fail/closeGate 结束
- `beginAbort` / `signalAbort`：与 requestAbort 的 cancellation promise 衔接

`ProcedureResult`：`continue`（外层再读 at）、`waiting`、`settled`。

## 失败与边界

`completion.catch(() => {})` 防止未观察 reject。closeGate 既关 gate 又 reject completion。

## 下一课

[43 · runtime/harness.ts](/series/pi-source/agent/284-harness-runtime-harness-ts/)：create 与 lane 获取。
