---
title: "15 · hooks.ts — 有序聚合，过 effect gate 才跑副作用"
summary: "分清：哪些钩子失败只记 handlererror 继续，哪些（beforetool）失败当成 block。为什么所有钩子都要 gate.admit。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/hooks.ts`  
被谁调用：`Harness.hooks`；drive 过程 `runWithGate` / `runToolWithGate`。

## 本课目标

分清：哪些钩子失败只记 `handler_error` 继续，哪些（before_tool）失败当成 block。为什么所有钩子都要 `gate.admit`。

## `HookRegistry`

`on(name, handler, { id? })` 追加到该 name 的数组，返回 splice 取消。close 后 `on` throw。`has(name)` 给 drive 短路。

`runWithGate`：`gate.admit` → `withAbortSignal(gate.signal, context)` → `throwIfAborted` → `runAdmitted`。取消赢了 admission 就抛 `AbortRequested`，drive 外层 catch 后 `await cancellation`。

工具钩子单独 `runToolWithGate`：每个 registration 包一层 `startHarnessSpan("pi.harness.hook")`（规范里目前真正开工的 span）。

## 聚合规则（按 name）

| 钩子 | 聚合 | 失败 |
|---|---|---|
| `before_run` | 各 handler 可追加 `messages`，后面的人看到已注入的 prompt | 记错误，继续 |
| `before_drive` | `invokeAllFailClosed`：任一 throw 则整次失败 | 失败会打断 drive 开端 |
| `before_run_end` | 最后一个给出的 `followUp` 字符串胜出 | 记错误，继续 |
| `transform_context` | 流水线改 messages / systemPrompt | 记错误，继续用当前值 |
| `before_request` | 流水线 patch streamOptions | 记错误 |
| `before_payload` | 流水线替换 payload | 记错误 |
| `after_response` | 流水线替换 settled message | 记错误 |
| `before_tool` | 改 args；任一 `block` 立刻停；handler throw 视为 block(reason=message) | 失败 = 拦截工具 |
| `after_tool` | 字段覆盖累加 | 记错误，已执行的工具结果仍在 |
| `before_compaction` / `before_navigation` | **第一个**给出 `decline` 或现成 summary/compaction 的人赢；两者同时给会报错并 skip 这个 handler | 记错误，试下一个 |

`before_run` 注入的 pending assistant 会在 `startRun` 里变成 `SessionInvariantError`（fault）。

## streamOptions patch

`applyStreamOptionsPatch`：`headers`/`metadata` 里 `undefined` 删键；整个 `headers: undefined` 清空。`createStreamOptionsPatch` 做 diff，给 before_request 的聚合返回值用。结构步骤会把 `deferred` 强制 false。

## 失败与边界

钩子不是事务的一部分。`before_tool` 的 block 结果会进随后的 tool outcome 事务。崩溃发生在 hook 已跑、事务未 commit：钩子会再跑一遍。不要在 before_run 里发邮件除非按 operationId 去重。

## 下一课

[16 · messages.ts](/series/pi-source/agent/257-harness-messages-ts/)：declaration merging 如何让压缩摘要变成模型能读的 user 消息。
