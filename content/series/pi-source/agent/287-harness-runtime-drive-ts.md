---
title: "46 · runtime/drive.ts — 按 at 分发，直到 settled 或等待"
summary: "这是 harness 版 runLoop。没有两层 while 跟模型说话；外层 for(;;) 每次看 operation.state.at 调一个过程。过程返回 continue 就再读状态（必须变了，否则 invariant「no"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive.ts`  
被谁调用：`Lane.drive` 安装 Drive 之后 `driveOperation(lane, drive)`。

## 本课目标

这是 harness 版 `runLoop`。没有两层 while 跟模型说话；外层 `for(;;)` 每次看 `operation.state.at` 调一个过程。过程返回 continue 就再读状态（必须变了，否则 invariant「no progress」）。

## 骨架

```text
若 control.running：before_drive（AbortRequested 则 await cancellation）
for (;;) {
  若 cancel_requested → reconcileOperation
  否则 switch (at) {
    starting              → startRun
    checkpoint            → runCheckpoint
    assistant.ready|retry_wait → runGeneration
    assistant.effect_pending   → recoverAssistantGeneration
    tools                 → runTools
    deferred.*            → runDeferred
    summary.deciding      → runStructuralDecision
    summary.ready         → runStructuralGeneration
    summary.effect_pending→ recoverStructuralGeneration
    summary.retry_wait    → runStructuralRetryWait
    navigation.ready_to_commit → commitNavigation
  }
  settled → return
  waiting → return
  状态没变且不是刚被 cancel → throw no progress
}
```

`currentOperation`：lane.state.operation 必须存在且 id 匹配，否则 invariant。

注意：**`assistant.effect_pending` 在正常流里不应由本次 drive 的 performGeneration 返回后再分发到 recover**。正常路径是 generation.ts 内部 publishResponse 把状态改走。若 drive 进来就看到 effect_pending，说明 **上次进程死在厂家流窗口**——走 recover，用已提交的 frames 合成 interrupted 消息，不再挂流。

## 失败与边界

AbortRequested 不是 fault：await cancellation 后 continue，下一圈会看到 cancel_requested 或已经 finish。其它 throw 到 lane.drive 的 fail 路径 → fault。

## 下一课

从 starting 读起：[47 · boundary.ts](/series/pi-source/agent/288-harness-runtime-drive-boundary-ts/) 与 [48 · checkpoint.ts](/series/pi-source/agent/289-harness-runtime-drive-checkpoint-ts/)。
