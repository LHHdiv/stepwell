---
title: "26 · session.ts — Storage 上面的 Session / Branch"
summary: "分清三层对象：StorageBackedSessionMutation（一次互斥能力）、StorageBackedBranch（一条 tip）、StorageBackedSession（仓库+树）。再记住：pending 助手消息进不了"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/session.ts`  
被谁调用：`MemorySessionRepo` / `JsonlSessionRepo` 打开会话时 `new StorageBackedSession`；`AgentHarness` 拿的就是这个接口。

## 本课目标

分清三层对象：`StorageBackedSessionMutation`（一次互斥能力）、`StorageBackedBranch`（一条 tip）、`StorageBackedSession`（仓库+树）。再记住：pending 助手消息进不了树。

## 错误类

| 类 | 含义 |
|---|---|
| `SessionInvariantError` | 内部状态自相矛盾，harness 应 fault |
| `SessionInvalidBranchError` | 空名或含 `\0` |
| `SessionBranchExistsError` | createBranch 重名 |
| `SessionPendingAssistantMessageError` | 试图 persist `stopReason: "pending"` |
| `SessionUnknownTargetError` | createBranch 的 at 不是已有 entry |

## Mutation

`beginMutation`：在 mutationLine.run 里构造 mutator，并把 `grant` 给调用方；line 内部 `await finished`，`end()` 才 resolve。因此同一时刻只有一个 mutator。

`commit`：已 commit 过再 commit → reject。pending assistant 在进 `storage.commit` 前 throw。`end` 等这次 commit settle（成功或失败都算），再 release。mutator 上的读方法在 active 时直接转 storage。

`mutate(cb)` = begin + try cb + finally end。

## Session 读/写

读：getEntries / getValue / scanValues / readList / scanBranch / getStats / getName / getLabel / findEntries（把 cursor 翻成 fromSeq/toSeq）。

`createBranch`：名字合法、不存在、at 为 null 或已有 entry，然后 `setValue(branchTip(name), at)`。没有隐式 `main`——规范：会话可以零分支，`main` 只是普通名字。harness.lane("main") 才会创建 lane 配置。

`appendToBranch`：生成 id，parent=当前 tip，同时更新 tip。给 Branch.appendMessage 用。lane 的 accept 不走这条，自己组 writes。

`close`：seal mutation line → storage.close → onClose（repo 用来从 open map 删除）。

## Branch

`getTipId`、`findEntries`（默认从 tip newestFirst）、`findEntry`、`appendMessage` / `appendCustomEntry`。

## 失败与边界

close 后所有公开方法 throw `"Session is closed"`。正在进行的 mutator 仍可把已调用的 commit 做完，然后 end。

idGenerator 默认 uuidv7。测试可注入，便于稳定 id。

## 下一课

[27 · session/context.ts](/series/pi-source/agent/268-harness-session-context-ts/)：从 tip 往根走，如何变成模型上下文。
