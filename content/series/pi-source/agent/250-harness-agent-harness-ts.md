---
title: "09 · agent-harness.ts — 可恢复运行时的公共表面"
summary: "把 AgentHarness / AgentLane 当成「另一套 Agent」。能说出：accept 和 drive 为什么拆开、prompt 只是两者的组合、事件和钩子与 AgentEvent 的对应关系、现行 CLI 为什么看不到"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/agent-harness.ts`  
实现：`runtime/harness.ts` 的 `createAgentHarness`。本文件几乎全是类型。

## 本课目标

把 `AgentHarness` / `AgentLane` 当成「另一套 Agent」。能说出：`accept` 和 `drive` 为什么拆开、`prompt` 只是两者的组合、事件和钩子与 `AgentEvent` 的对应关系、现行 CLI 为什么看不到这些方法。

## 何时会走到这里

现行 `pi`、TUI、`-p`、RPC：**不会**。它们停在 `Agent.prompt`。

会走到：

```text
experimental/session-worker.ts
  AgentHarness.create({ session, models, model, tools, toolContext: { env } }, context)
    → { harness, open }     【open = 上次没跑完的 operation】
  harness.lane("main")
  lane.prompt(...) 或 对 open 里的 operationId 调 lane.drive / resume
```

`create` **不启动**厂家请求、工具、钩子、定时器。只 restore 会话、把未完成 operation 列表交给宿主。宿主（worker、alarm、HTTP 层）决定何时 `drive`。

## 四原语，其余都是糖

规范 Part 5 的核心：

| 方法 | 做什么 |
|---|---|
| `accept(request)` | 原子写入 `pi.op.meta` + `pi.op.state` + 可能的用户 entry。lane 忙则 `LaneBusy` |
| `drive({ operationId, waitForRetry, pollDeferred })` | 按当前 `state.at` 推进，直到 settled 或 durable wait |
| `requestAbort(operationId)` | 把 control 写成 `cancel_requested`，抽出未消费的 steer/followUp |
| `inspectExecution` | 当前 tip、配置模型、是否有 operation |

糖：

- `prompt` / `skill` / `promptFromTemplate` = accept run + drive（`waitForRetry: true`）
- `compact` / `navigateTree` = accept 结构操作 + drive，成功后再尝试空 prompt 续跑 inbox
- `resume` = 对当前 operation drive，并 `pollDeferred: true`
- `abort` = requestAbort + drive
- `steer` / `followUp` / `nextRun` = 把消息写入 `pi.pending.entry` + inbox

`DriveOutcome`：`settled` 带 `OperationResultRecord`；`waiting` 分 `retry`（带 `notBefore`）和 `deferred`（带 `DeferredHandle`）。糖方法遇到 retry 且已经 `waitForRetry` 仍返回 waiting，视为 invariant 错误（fault）。

## `AgentLane` vs `Agent`

| | Agent | AgentLane |
|---|---|---|
| 状态 | 进程内数组 | 磁盘上的 entry 树 + values |
| 并发 prompt | throw | `LaneBusy` Result |
| 崩溃 | 靠 JSONL 监听器尽量补 | 读 `pi.op.state` 从叶子继续 |
| 取消 | `abort()` 掐 AbortSignal | 先 durable `cancel_requested`，再 reconcile |
| 返回 | `Promise<void>` + 事件 | `Result<...>`，预期失败不 throw |

所有异步方法最后一个参数是 `Context`（chord 的调用上下文）。同步的 `hooks.on` / `events.on` 不带 Context；回调被调用时才传入。

## 事件 `HarnessEvent`

比 `AgentEvent` 多：`run_start/end`、`compaction_*`、`navigation_*`、`retry_*`、`run_suspend/resume`、`entry_added`、`queue_update`、`value_update`、`config_update`、`fault`、`handler_error`、`usage`。lane 事件带 `lane` 字段；`recovery?: true` 表示这是崩溃后合成的回放，UI 不应当成新的实时流。

`LaneSnapshot` 是 `watch()` 的投影：transcript、queues、当前 operation 的 streamingMessage / runningTools / retry / deferred。`reduceLaneSnapshot`（课 61）让远程消费者只收事件也能维持同一份快照。`watchSession` 在本切片抛 `SliceNotImplemented`。

## 钩子 `HookMap`

对应 loop 的 `beforeToolCall` / `transformContext` 等，但按 operation 生命周期切得更细：`before_run`、`before_drive`、`before_run_end`、`before_request`、`before_payload`、`after_response`、`before_tool`、`after_tool`、`before_compaction`、`before_navigation`。

钩子结果在「消费它的那次事务」里才变 durable。崩溃可能重跑钩子——规范 non-goal：钩子副作用必须幂等。

## `AgentHarnessOptions`

必填：`session`、`models`、`model`。工具是 `AgentHarnessTool`（execute 签名不同）。`toolContext` 可以是对象或 `(context) => TContext`。`systemPrompt` 也可以是函数，拿到 toolContext 再拼。`toProviderMessages` 默认 `convertToLlm`（课 16）。

## 失败与边界

- 预期失败走 `Result.err`（LaneBusy、UnknownSkill、Closed…），不要用 try/catch 当控制流。
- 存储损坏 / invariant 走 `HarnessFault`，之后所有方法 throw 同一 fault，lane 被 seal。
- `open` 非空时宿主必须 `resume` 或 `drive`，否则磁盘上的 effect_pending 工具不会被 reconcile。

## 下一课

[10 · harness/types.ts](/series/pi-source/agent/251-harness-types-ts/)：Result、工具 execute 签名、FileSystem/Shell。实现从 [43 · runtime/harness.ts](/series/pi-source/agent/284-harness-runtime-harness-ts/) 读。
