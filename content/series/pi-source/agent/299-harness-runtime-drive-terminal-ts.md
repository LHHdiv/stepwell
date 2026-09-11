---
title: "58 · drive/terminal.ts — 扫前缀删除操作私有地址"
summary: "并行 scan：toolargs、toolmemo、preparation、pending tooloutput。删除 meta、state、上述每一项。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive/terminal.ts`

## `operationCleanupWrites`

并行 scan：tool_args、tool_memo、preparation、pending tool_output。删除 meta、state、上述每一项。

若 at=tools，outcome_ready 的 pendingEntry id 也删（尚未挂树的结果随取消扔掉——注意 reconcile 对 tools 先 runTools 尽量 materialize/收成 interrupted，cleanup 时通常已空）。

若 assistant/deferred effect_pending：`deleteList` 对应 frame list。

## `operationResultRecord`

failed **当且仅当** 带 error。其它状态不得带 error 字段。endedAt=Date.now()。fromTipId 来自 meta.sourceTipId。

## 失败与边界

cleanup 漏删会留下孤儿 value，下次 restore 可能扫到。prefix scan 依赖 key 格式 `{operationId}:`。改 values.ts 的 key 布局必须同步这里。

## 下一课

[59 · progress.ts](/series/pi-source/agent/300-harness-runtime-progress-ts/)：流式帧与工具 checkpoint 的非阻塞写。
