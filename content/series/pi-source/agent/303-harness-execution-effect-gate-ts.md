---
title: "62 · execution/effect-gate.ts — 副作用入场券"
summary: "取消不是「随便 abort 一个 fetch」。必须先 durable cancelrequested，再 beginAbort(cancellation)，再 signalAbort。gate 保证：admission 之后 的 in"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/execution/effect-gate.ts`  
被谁调用：Drive 构造 `createGate()`；hooks、streamSimple、tool.execute 的 admit。

## 本课目标

取消不是「随便 abort 一个 fetch」。必须先 durable `cancel_requested`，再 `beginAbort(cancellation)`，再 `signalAbort`。gate 保证：**admission 之后** 的 invoke 要么跑完，要么看到 AbortRequested 并 `await cancellation`（那是 requestAbort 的事务）。

## 状态

`open` → `aborting`（持有 cancellation promise）→ `closed`（HarnessClosed/Fault）。

`gate.admit(fn)`：aborting 时 throw `AbortRequested(cancellation)`；closed throw error；否则同步调用 fn（fn 里再开 promise 也算已 admit）。

`signal`：AbortController，signalAbort 时 abort(AbortRequested)。工具的 context.abortSignal 就是它。

`control.close`：关 gate 并 abort controller。

## 为何分成 Gate 和 GateControl

过程只拿 Gate（能 admit、能读 signal），不能自己 beginAbort。所有权在 Drive / requestAbort。

## 失败与边界

`admit` 是同步检查。已经 admit 的 execute 不会被第二次 check 拦住，只靠 AbortSignal。这是「intent 已写则 effect 可能发生」的代码对应物。

## 下一课

[63 · assistant.ts](/series/pi-source/agent/304-harness-execution-assistant-ts/)。
