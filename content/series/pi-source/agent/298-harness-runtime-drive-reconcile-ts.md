---
title: "57 · drive/reconcile.ts — cancel_requested 之后只收尾、不开新活"
summary: "drive 发现 control 已是 cancelrequested。beginAbort+signalAbort 确保 gate 关闭，跑着的工具收到 AbortRequested。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive/reconcile.ts`

## 入口

drive 发现 control 已是 cancel_requested。`beginAbort`+`signalAbort` 确保 gate 关闭，跑着的工具收到 AbortRequested。

## 按叶子

| at | 动作 |
|---|---|
| assistant.effect_pending | recoverCancelledAssistantEffect（合成 aborted 消息并结算） |
| tools | runTools（sequential 收尾，不 start 新 planned 的 execute——runTools 见 cancel 分支） |
| deferred.suspended | best-effort cancelDeferred，然后 aborted 终端 |
| deferred.effect_pending | cancelDeferred + recoverCancelled |
| starting / checkpoint / ready / retry_wait / summary.* / navigation.ready_to_commit | 直接 aborted 终端（没有不确定的外部 effect 要结算） |

`cancelDeferredBestEffort`：模型不在 registry 则跳过；`models.cancelDeferred` throw 吞掉。本地必须继续 reconcile。

`publishAbortedTerminal`：cleanup writes、result status=aborted、按 intent 发 compaction_end/run_end/navigation_end。run 里若正在做 resume_checkpoint 的摘要，先发 compaction_end aborted 再 run_end。

## 失败与边界

summary 的 run 嵌套压缩若 boundary 不是 resume_checkpoint → invariant。终端事务之后 operation 从 lane 消失，inbox 里 abort 时抽出的 steer/followUp 已经在 requestAbort 返回给用户，不丢回队列。

## 下一课

[58 · terminal.ts](/series/pi-source/agent/299-harness-runtime-drive-terminal-ts/)。
