---
title: "53 · drive/deferred.ts — 厂家异步续跑：每 pass 一次 poll"
summary: "stopReason: \"deferred\" 时 operation 不结束，进入 deferred.suspended。宿主稍后 drive({ pollDeferred: true }) 或 resume()。没有 permit 则"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive/deferred.ts`

## 本课目标

`stopReason: "deferred"` 时 operation 不结束，进入 `deferred.suspended`。宿主稍后 `drive({ pollDeferred: true })` 或 `resume()`。没有 permit 则返回 waiting + DeferredHandle，让调度器去盯厂家。

## `readDeferredSourceHandle`

源 entry 必须是 deferred 助手且 handle 的 provider/modelId/api 与配置一致。否则 invariant。

## poll

`deferredPermits` 用掉一次。streamOptions.deferred **强制 false**（poll 不能再 deferred）。before_request step=`"deferred"`。intent 写成 `deferred.effect_pending`（预留新的 response/usage id——每次 poll 一条新助手 entry）。

`consumeAssistantStream` 连到 `models.fetchDeferred`（在 generation 的对称位置）。结算仍走 `publishResponse`：可能再 suspended、转 tools、完成、或失败。

`runDeferredSuspended`：无 permit → waiting。`recoverDeferredPoll`：effect_pending 进来走 recover 合成。`runDeferred` 分发。

## 失败与边界

模型从 registry 消失 → configuration_failure，结束 run。远程 cancel 在 reconcile 里 best-effort，失败忽略（课 57）。

## 下一课

[54 · tools.ts](/series/pi-source/agent/295-harness-runtime-drive-tools-ts/) 与 [55 · tool-placement.ts](/series/pi-source/agent/296-harness-runtime-drive-tool-placement-ts/) 一起读。
