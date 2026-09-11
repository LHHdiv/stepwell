---
title: "25 · mutation-line.ts — 一个 Session 一把互斥锁"
summary: "23 行看懂：所有 read-modify-write 排成一条 promise 链。这不是存储层的 commitQueue（MemoryStorage 还有自己的），而是 Session 对象 上的逻辑锁，保证 planner 看到的"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/mutation-line.ts`  
被谁调用：`StorageBackedSession.beginMutation`；`close` 时 `seal`。

## 本课目标

23 行看懂：所有 read-modify-write 排成一条 promise 链。这不是存储层的 commitQueue（MemoryStorage 还有自己的），而是 **Session 对象** 上的逻辑锁，保证 planner 看到的 `Lane.state` 与即将 commit 的 writes 之间没有别人插队。

## `run`

若已 seal，立刻 reject。否则 `tail.then(operation)`。无论成功失败，tail 都接到 `undefined`，这样一次失败不会毒死整条线——但 seal 之后新的 run 会 reject。

## `seal(error)`

记下 `sealedError`，返回当前 tail（等正在跑的 mutation 结束）。close 用它排空。

## 失败与边界

`run` 不 catch operation 的错误：错误传给这次 run 的调用方，下一次 run 仍会执行（除非 seal）。Session.mutate 的 try/finally 里 `mutator.end()` 总会 release 这条线。

不要在 mutation 回调里 `await session.setValue(...)`：setValue 内部又 `mutate` → 再 `run` 排到当前 tail 后面 → 等自己结束 → 死锁。

## 下一课

[26 · session.ts](/series/pi-source/agent/267-harness-session-session-ts/)：StorageBackedSession 如何把这条线和 Storage 焊在一起。
