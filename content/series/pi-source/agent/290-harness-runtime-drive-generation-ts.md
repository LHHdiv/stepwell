---
title: "49 · drive/generation.ts — 意图提交之后才打厂家"
summary: "规范 0.4 的窗口：先 TX 把状态写成 assistant.effectpending（预留 responseEntryId、usageId），再 streamHarnessAssistant。崩溃发生在窗口内 → 下次 drive"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive/generation.ts`

## 本课目标

规范 0.4 的窗口：先 TX 把状态写成 `assistant.effect_pending`（预留 responseEntryId、usageId），再 `streamHarnessAssistant`。崩溃发生在窗口内 → 下次 drive 走 recover，不重挂同一条 HTTP。

## `prepareGeneration`

模型 registry 里找不到 → configuration_failure（不占 response id）。activeToolNames 有缺 → 同样失败。读 bounded context、resolveSystemPrompt（字符串或函数(toolContext)）、`before_request` patch streamOptions。

## `publishGenerationIntent`

commit 空 writes（只改 op.state）到 effect_pending。attempt==1 发 `turn_start`。retry 再问不发新的 turn_start。

## `performGeneration`

`openAssistantResponse` 得到 observer（frame 进 pending list + 事件）。`streamHarnessAssistant`：transform_context、before_payload、after_response 都过 gate。真正 `models.streamSimple` 包在 `gate.admit` 里，sessionId 为 `{sessionId}:{lane}`。finally `response.close()` drain frames。

## `runRetryWait`

未到 notBefore：若 `waitForRetry` 假，返回 waiting；真则 `gate.admit(waitUntil)`。到点后状态回到 assistant.ready，发 retry_start。

`runGeneration`：retry_wait 叶子走 wait；ready 叶子 prepare → 失败则 publishConfigurationFailure；否则 intent → perform → publishResponse。

## 失败与边界

configuration_failure 在 **intent 之前** 结束 operation（failed），因为还没有不确定的厂家副作用。intent 之后的失败由 response.ts 分类：可重试则 retry_wait，否则 failed，overflow 则切 summary。

## 下一课

[50 · response.ts](/series/pi-source/agent/291-harness-runtime-drive-response-ts/)：结算分类表。
