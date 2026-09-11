---
title: "43 · runtime/harness.ts — 管 lanes，自己不是 lane"
summary: "对照 09 的接口看实现：配置存在 configStore 引用里（lane 闭包读最新），restore 不启动 effect，fault 是一票否决。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/harness.ts`  
`AgentHarness.create` → `createAgentHarness` → `new Harness`。

## 本课目标

对照 09 的接口看实现：配置存在 `configStore` 引用里（lane 闭包读最新），restore 不启动 effect，fault 是一票否决。

## `createAgentHarness`

validate 工具名、retry、compaction。`seed` LaneConfiguration 来自 options.model / thinkingLevel / activeToolNames（默认全部工具名）。`restoreSession` 得到 `Map<laneName, LaneState>`。`open` 列表：每个仍有 operation 的 lane 一条，cancel_requested 则 `aborting: true`。restore throw → `HarnessFault`，没有半开的 Harness 对象。

## `Harness`

字段：session、models、HookRegistry、EventBus、`lanesByName`、seed、configStore、close/fault 错误。

构造：为每个 restored 名 `buildLane`。hooks 的 reportError 发 `handler_error` kind=hook。

### `lane(name, options?, context)`

空名或含 `\0` → InvalidLane throw（不是 Result）。然后 `session.mutate`：

- 内存已有 → 返回
- 磁盘是完整 lane → restoreLaneState，build，放进 map
- 磁盘只有 branch.tip → 用该 tip，写上 seed 的 config+idle state
- 完全没有 → tip = `options.createAt ?? null`，createAt 必须是已有 entry 或 null
- 缺 entry → UnknownTarget

新 lane 发 `lane_created`。commit 在 mutate 内，事件在锁外 await。

### 全局 get/set

name/label 走 session 值地址 + `value_update` 事件。tools/resources/streamOptions/retry/compaction/queue modes 只改 **内存** configStore，发 `config_update`。这些不是 durable——重启用 create 时的 options。lane 的 model 才是 durable。

`watchSession` throw SliceNotImplemented。

### fault / close

`fault`：第一次生效，seal 所有 lane，关 hooks/events，发 `fault` 事件。之后 `assertOpen` throw 该 fault。

`close`：HarnessClosed，seal lanes（返回 idle callbacks），关 hooks/events，session.close，all settle。多次 close 返回同一 promise。

## 失败与边界

`lanes()` 只列出 **本进程已 build** 的 lane，不是磁盘上全部 branch。纯数据分支（只有 tip）要先 `lane(name)` 才会 attach 成 AgentLane。create 时 restore 只收录完整三件套的名字。

## 下一课

[44 · runtime/lane.ts](/series/pi-source/agent/285-harness-runtime-lane-ts/)：两千行的车道实现，accept/drive 糖方法都在这。
