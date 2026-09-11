---
title: "09 · services/state.ts — 源与冷副本"
summary: "画出两条订阅表：应用 listener（完整值 + hydrate/update）和 source listener（ops + sequence）。能指出构造时第一次 flush 的意义、publish 空 ops 直接 return"
tags: [pi, chord]
---
源码：`packages/chord/src/services/state.ts`  
被谁调用：`api.replicatedState`、`env.replicatedState`；consumer 的每个 state 成员背后是 `ReplicatedStateReplica`。

## 本课目标

画出两条订阅表：应用 listener（完整值 + hydrate/update）和 source listener（ops + sequence）。能指出构造时第一次 flush 的意义、`publish` 空 ops 直接 return、副本 `update` 缺口会 `clear` 再抛。

## 在系统中的位置

```text
MutableReplicatedStateImpl          权威源，永远有 value
  publish → sourceListeners(ops)    provider 推线上
         → listeners(value)         本地 subscribe
ReplicatedStateReplica              冷的，value 初始 undefined
  hydrate(base ops) / update / clear
```

## `MutableReplicatedStateImpl`

构造：

```ts
this.#tracker = track(initial);
this.#publishedValue = applyImmutable(undefined, this.#tracker.flush()) as T;
registerReplicatedStateInternals(...)
```

第一次 flush 必是 `["r", clone]`。`applyImmutable(undefined, r)` 得到与 tracker 断开的不可变快照。之后改 `state` 代理只脏 tracker，**不**改 `#publishedValue`，直到 `publish`。

`value` getter 返回上次发布的快照。`state` getter 返回 tracker 代理。

### `publish(context)`

1. `ops = tracker.flush()`；空则 return（不涨 sequence）
2. `#sequence += 1`（从 0 起，第一次用户 publish 是 1；构造 flush 不占 sequence——hydrate 快照用的是当前 sequence + 完整 `r`）
3. `#publishedValue = applyImmutable(old, ops)`
4. 先通知 `#sourceListeners`（ops），再通知 `#listeners`（值，`kind: "update"`）

两套都是拷贝数组再迭代，listener 里 unsubscribe 安全。

### `subscribe`（应用）

先 `publish(serviceDeliveryContext())`——把未发布的脏改挤出去，让新听众看到最新。然后登记，立刻以 `kind: "hydrate"` 同步投递当前值。

这意味着：源上的 subscribe **总是立即有值**。也意味着 subscribe 可能意外 publish 别人还没 publish 的改动。facet 作者应养成「改完就 publish」的习惯，不要依赖 subscribe 的隐式 flush。

## `ReplicatedStateReplica`

构造只要一个 `reportError`。`value` 在 hydrate 前是 `undefined`。

`subscribe`：若已有值，立即 hydrate 投递；否则只登记，等 hydrate。listener 异常被 `#deliver` 抓住，交给 `reportError`，不打断其它 listener。

`hydrate(sequence, ops, context)`：ops 必须 `isBase`，否则抛。`applyImmutable(undefined, ops)`。然后 `#deliverAll` hydrate。

`update(sequence, ops, context)`：

- 还未 hydrate → 抛
- `sequence !== #sequence + 1` → **先 `clear()`** 再抛「gap」。调用方必须重新订阅拿 base，不能继续 apply
- 否则 applyImmutable，deliver update

`clear()`：值和 sequence 都回到 undefined。disconnect / unavailable / stale 走这里。已有 listener 不会收到「空」通知——他们下次看到的是新的 hydrate。

## `serviceDeliveryContext`

返回 `BACKGROUND_CONTEXT`。TODO：若投递将来有自己的生命周期，再加取消。合成事件没有调用者。

## 失败与边界

- 源的应用 listener **不**包 try/catch。源上抛会打断后续 listener，并可能穿出 `publish`。副本才隔离。不对称是历史形状，测试时不要在源 listener 里扔。
- sequence 从 0 起，hydrate 快照带当前 sequence（可能是 0，若从未 publish）。consumer 装快照时用快照里的 sequence。
- Chord 不抑制「值没变」的 publish。flush 出空 ops 才会跳过；你把字段改回去仍可能发出 `s` 再 `s`。
- 不持久化。进程挂了，replica 全冷。

## 下一课

[10-services.handle.ts.md](/series/pi-source/chord/343-services-handle-ts/)：本地 `use()` 拿到的稳定 Proxy。
