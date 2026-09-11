---
title: "73 · tools/write.ts — 覆盖写，排队，成功才一句确认"
summary: "resolveToolPath + withFileMutationQueue。队列内再检查 abort，writeFile（合同：创建父目录）。成功返回 Successfully wrote to ${path}，details un"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/tools/write.ts`

`resolveToolPath` + `withFileMutationQueue`。队列内再检查 abort，`writeFile`（合同：创建父目录）。成功返回 `Successfully wrote to ${path}`，details undefined。

失败 getOrThrow → execute throw → isError。`replay` 未设，恢复当 never：崩溃在 write 后、outcome 前会合成 interrupted，**可能已经写盘**。这是规范「没有 exactly-once」的实例。需要幂等应自己用 invocation memo。

## 下一课

[74 · edit.ts](/series/pi-source/agent/315-harness-tools-edit-ts/)。
