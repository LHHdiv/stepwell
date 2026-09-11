---
title: "44 · runtime/lane.ts — 一条车道：command 锁、accept、drive、糖"
summary: "抓住三块：command 协议、accept 三种 intent、drive 所有权。prompt/compact 只是 accept+drive。不要从第 1 行线性看到第 2000 行。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/lane.ts`（约 2000 行）  
实现 `AgentLane`。这是 harness 的 Agent.ts 对位物。

## 本课目标

抓住三块：**command 协议**、**accept 三种 intent**、**drive 所有权**。prompt/compact 只是 accept+drive。不要从第 1 行线性看到第 2000 行。

## 在系统中的位置

```text
lane.prompt(...)
  acceptRun  → TX 写入 prompt entries + op.meta/state=starting + lane.state
  drive      → 若无 activeDrive 则 new Drive，void driveOperation(...)
               等待 drive.completion
```

## `command` / `settleOperation` / `continueOperation`

`command(plan)`：

1. 若有 `idleOwner`（runWhenIdle），等它或 stateChange
2. `session.mutate`：idleOwner 仍在则返回 idle_blocked 再试
3. plan(this.state, mutator) 得到 LaneCommand
4. commit 时 **先** `this.state = next` 再 materialize，然后 emitBatch（锁外 await delivery）
5. planner/commit/materialize throw → onFault

注释强调：这里禁止调厂家、工具、钩子、定时器。那些在 command 返回之后、drive 过程里。

`settleOperation`：当前必须有 operation；commit 时自动附上 `setValue(pi.op.state, next)`；finish 时写 `pi.result`、lane.state.current=null、last=id，内存 operation=null。

`continueOperation`：若 `cancel_requested`，**不跑 planner**，返回 `{ kind: "cancel_requested" }`。新副作用必须走这条，避免取消后还开 HTTP。

## accept

忙 → Result LaneBusy（return，不 commit）。

**run**：skill/模板解析失败是 Result。pending assistant → InvalidMessage。然后选 inbox（steer/followUp 按 mode，write/nextRun 总带上），把 pendingEntry 物化成树上的消息，intent.promptEntryIds = 用户句 id。state=`starting`。

**compaction**：prepareCompaction，无可压 → NothingToCompact。否则写 preparation + state=`summary.deciding` reason=manual boundary=finish。

**navigation**：循环观察 tip（准备摘要时 tip 可能被别人改——同进程只有一条 mutation line，主要防准备期间的并发）。目标=当前 tip、根+label、摘要却缺两端 → InvalidNavigation。有摘要则 summary.deciding + commit_navigation boundary；否则 `navigation.ready_to_commit`。

## drive 所有权

`command` 里 claim：

- 当前 operation 就是这个 id 且无 activeDrive → 安装 Drive，`installed: true`
- 已有同一 Drive → observe 不重复跑过程
- 已有别人的 Drive → occupied，等它 completion 再 loop
- 无当前 operation 但 `pi.result/id` 在 → 直接 settled
- 否则 mismatch

installed 时 `void driveOperation(this, drive).then(settle, onFault)`。调用方 `await drive.completion`。

## 糖方法

`prompt`/`skill`/`promptFromTemplate` → `driveRunRequest`：accept + drive waitForRetry。waiting deferred 变成 `SuspendedRun`。unwaited retry → fault。

`compact`/`navigateTree`：drive 完结构操作后 `continueAfterStructural`：再 accept 空 prompt，把 inbox 里的 followUp/nextRun 接着跑；LaneBusy/InvalidMessage 则没有续跑。

`resume`：pollDeferred+waitForRetry。`abort`：requestAbort + drive。

`enqueue`：pendingEntry + inbox append + queue_update。空文本且无图、pending 助手、给非 user 加图 → InvalidMessage。

`waitForIdle` / `runWhenIdle`：观察 activeDrive 与 inbox；idle 时独占 `idleOwner` 跑回调（例如切模型）。

`watch`：captureLaneSnapshot（transcript 到 compaction、queues、streaming frames、running tools、retry、deferred handle）。

`setModel` 等改 durable `laneConfig`。

## requestAbort

若 control 已 cancel_requested，newlyRequested=false。否则写 control、抽出 steer/followUp 的 pending（返回给调用方，磁盘 inbox 去掉它们），`beginAbort(cancellation)`，commit 后 `signalAbort` 让 gate 打断正在跑的工具。

## 失败与边界

accept 与 drive 之间进程死了：restart 后 `open` 含该 operation，宿主必须 resume。糖方法在同一进程里连着调，实验 worker 也是如此；调度型宿主应只调 accept/drive。

## 下一课

[45 · restore.ts](/series/pi-source/agent/286-harness-runtime-restore-ts/) 然后 [46 · drive.ts](/series/pi-source/agent/287-harness-runtime-drive-ts/) 状态机分发。
