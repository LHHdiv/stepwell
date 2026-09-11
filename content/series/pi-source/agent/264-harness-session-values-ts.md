---
title: "23 · session/values.ts — 类型化地址，没有第三套 key"
summary: "把 pi.op.state 这种字符串看成 Value\\<T\\> 对象，不要在业务代码里拼 \"pi.op.state/\" + id。规范：namespace/key 就是持久化地址。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/values.ts`  
被谁调用：所有 commit 的 setValue/appendList；restore；fork 过滤命名空间。

## 本课目标

把 `pi.op.state` 这种字符串看成 **Value\<T\> 对象**，不要在业务代码里拼 `"pi.op.state/" + id`。规范：namespace/key 就是持久化地址。

## `value` / `list`

`namespace` 非空、不得含 `\0`；key 不得含 `\0`。返回 frozen 对象，带 phantom `storedValueType` 以区分 `Value<LaneState>` 和 `Value<string>`。

`setValue` / `deleteValue` / `appendList` / `deleteList` 产出 Write。`NoInfer<T>` 防止把宽类型写进窄地址。

`resolveListReadOptions`：默认 limit 1000、order asc；limit 必须正安全整数，上限 10_000。

## 内置地址

| 工厂 | 含义 |
|---|---|
| `branchTip(name)` | 该分支当前 tip，`string \| null` |
| `laneConfig(name)` | 模型/思考/activeTools |
| `laneState(name)` | currentOperationId、lastOperationId、inbox |
| `operationMeta` / `operationState` | 操作的不可变意图 / 可变完全状态 |
| `operationResult` | 结束后的观察记录，活在 lane 上 |
| `operationToolArgs` / `operationToolMemo` | 单次调用的参数与幂等 memo |
| `operationPreparation` | 压缩/分支摘要的 durable 准备 |
| `pendingEntry` | 尚未挂到树上的消息/custom |
| `pendingToolOutput` | 工具未结算时的 checkpoint 快照 |
| `pendingAssistantFrames` | **list**：流式 frame，结算时整表删除 |
| `sessionName` / `entryLabel` | 用户可见元数据 |

`*Prefix` 工厂用 key 前缀给 `scanValues` 用：例如清掉某 operation 的全部 tool_args。

## 失败与边界

应用自定义地址不得以 `pi.` 开头——fork-policy 遇到未知 `pi.*` 会 throw。list 只能 append 或整表 delete，没有按元素删。

## 下一课

[24 · commit.ts](/series/pi-source/agent/265-harness-session-commit-ts/)：Write 如何变成带 seq 的 CommittedWrite。
