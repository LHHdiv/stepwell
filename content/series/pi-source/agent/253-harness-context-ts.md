---
title: "12 · context.ts — 调用权，不是会话数据"
summary: "把 Context 和 AgentContext（系统提示+消息+工具）分开。再把 abortSignal 和 lane.requestAbort() 分开。混在一起就会以为「取消 HTTP 请求等于取消 operation」。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/context.ts`  
被谁调用：harness / session / tools 每一个异步公开方法。实现来自 `@earendil-works/chord/context`。

## 本课目标

把 `Context` 和 `AgentContext`（系统提示+消息+工具）分开。再把 `abortSignal` 和 `lane.requestAbort()` 分开。混在一起就会以为「取消 HTTP 请求等于取消 operation」。

## 再导出

`BACKGROUND_CONTEXT`、`TODO_CONTEXT`、`createContextKey`、`withAbortSignal`、`withCancel`、`withContextValue`、`withoutAbortSignal`、`awaitWithContext`。experimental worker 里大量 `TODO_CONTEXT`：占位，表示「还没把 RPC 取消接进来」。

`Drive` 构造时对传入的 context 做 `withoutAbortSignal`：drive 过程的生命周期不跟这次 RPC 的 abort 走。RPC 断了不应自动写成 `cancel_requested`。规范：Context 是进程内调用权，**从不**持久化。

## telemetry 槽

`TELEMETRY_CONTEXT_KEY = createContextKey<TelemetryContext>("pi.telemetryContext")`。

`getTelemetryContext(context)`：没有则 `NOOP_TELEMETRY_CONTEXT`。`withTelemetryContext` 派生子 context。`streamHarnessAssistant` 把这个塞进 pi-ai 的 `telemetryContext`。规范 T1：生产几乎只开 tool-hook span；trace 跨进程还没做。

## 失败与边界

- `awaitWithContext(promise, context)`：context abort 时从等待中出来。lane.drive 用它等 `drive.completion`，所以 **调用方** 取消会停止等，但磁盘上的 operation 仍在，直到 `requestAbort`。
- 共享对象（Harness、Lane、Session）不得把 caller Context 存进字段。Drive 存的是剥掉 abort 的那份。

## 下一课

[13 · result.ts](/series/pi-source/agent/254-harness-result-ts/)：lane 方法返回的 tagged error。
