---
title: "51 · drive/recovery.ts — 用已提交的 frame 前缀合成 interrupted"
summary: "规范：不重挂厂家流。committed frames 是「最新 durable 部分」，不证明请求如何结束。合成消息：stopReason: \"error\"，usage 清零，errorMessage 说明「前面是已提交的部分，更新的 "
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive/recovery.ts`

## 政策

规范：不重挂厂家流。committed frames 是「最新 durable 部分」，不证明请求如何结束。合成消息：`stopReason: "error"`，usage 清零，errorMessage 说明「前面是已提交的部分，更新的 live 输出可能缺失，外部结果未知」。

没有 frame 则 content 空、provider/model 用配置身份、api `"unknown"`。

## `recoverAssistantGeneration`

drive 看到 `assistant.effect_pending` 且 control 仍 running（进程重启后的第一次 drive）。continueOperation 读 frames → reduceAssistantMessageFrames → 发 recovery 的 message_start/end → `publishResponse(..., { recovery: true })`。publishResponse 会按这条 error 消息走 retry 或 failed 或 overflow——`isRetryableAssistantError` 对合成 error 通常允许 retry（若 attempt 未满）。

## `recoverCancelledAssistantEffect`

reconcile 时 effect_pending（assistant 或 deferred）：用 `settleOperation` 读 frames（取消后仍要结算预留 id），同样合成 interrupted，publishResponse。cancel 分支会把消息标 aborted 并 may_finish。

## 失败与边界

合成消息 **会** 作为真实 assistant entry 落树（否则预留 id 空洞）。模型下次看到一条 error 助手句。这是有意的：账单可能已发生，transcript 必须有对应行。

## 下一课

[52 · retry.ts](/series/pi-source/agent/293-harness-runtime-drive-retry-ts/) 很小，然后 deferred / tools。
