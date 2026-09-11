---
title: "11 · services/instances.ts — keyed 目录"
summary: "能画出 ready=false 时 insert 不启动 handler、ready() 才一次性 startAll。能指出每个 (observer, entry) 一把 withCancel，close 只 cancel 那个任务。h"
tags: [pi, chord]
---
源码：`packages/chord/src/services/instances.ts`  
被谁调用：本地 `LocalKeyedServiceRegistry`；远程 `KeyedBinding`。两边共用同一套「实例 + 观察任务」语义。

## 本课目标

能画出 `ready=false` 时 insert 不启动 handler、`ready()` 才一次性 startAll。能指出每个 (observer, entry) 一把 `withCancel`，close 只 cancel 那个任务。handler 抛错除非是 abort，否则 `onError`。

## 在系统中的位置

```text
spawn(key, impl)
  directory.insert({ key, generation, service, deactivate })
observe(handler)
  若 ready：对现有每个 entry start(handler)
实例关掉
  directory.remove → deactivate + cancel 各 observer 的该任务
```

`InstanceDirectoryEntry` 最小字段：`key`、`generation`、`service`（给 handler 的对象）、`deactivate()`。远程侧 entry 还带 `facade`，deactivate 里 `active=false; facade.clear()`。

## 构造

`{ ready, onError }`。本地 registry 建目录时 `ready: true`（实例一 insert 就通知）。远程 keyed binding 建目录时 `ready: false`，等订阅快照全部 spawn 完再 `ready()`——保证 handler 第一次被叫时，该实例的 state 成员已经 hydrate。

## `insert` / `replace` / `remove`

- `insert`：key 已存在就抛。ready 则 `#startAll`。
- `replace`：同 key 不同 generation 先 `#remove` 旧的再放新的。同 generation 抛「repeated a live generation」。远程 spawn 更新用 replace，因为同 key 新 generation 是合法的。
- `remove`：identity 对不上就 return（幂等）。调用 `entry.deactivate()`，cancel 所有 observer 上该 entry 的任务。

## `ready` / `reset`

`ready()`：若已 ready return。否则对现有 entries startAll。这是「快照装完，开闸」。

`reset()`：ready=false，remove 全部 entry。rebind / 断线用。observer 集合还在，只是任务被 cancel、实例没了。下次 start 会重新 subscribe。

## `observe`

登记一个 `Observer { handler, tasks, closed }`。已 ready 则对当前 entries 各 start。返回的 stop：cancel 全部任务、从 set 删除。幂等。

`#start`：已 closed 或已有该 entry 的 task 则跳过。`withCancel(BACKGROUND_CONTEXT)`，handler 返回的 Promise 用 `.catch`：若不是 abort，`onError`。同步 throw 同样处理。

handler 收到的 `context.abortSignal` 在实例关闭时 aborted。handler 应把后续 await 绑到这个 signal 上。

## `dispose`

设 disposed，cancel 所有任务，对剩余 entry `deactivate`，清空。之后 insert/observe 抛 `Keyed service directory is disposed`。

## 失败与边界

- handler 失败默认不关掉实例。只 reportError。一个坏观察者不应杀死服务。
- 不 ready 时 observe 只登记。这是有意的：远程要等整份 keyed 快照。
- `observerCount` 给 KeyedBinding 用：降到 0 就 close 订阅，避免空订。
- generation 单调递增在 registry/provider，不在 Directory。Directory 只拒绝「活着的同一 generation 再 insert」。

## 下一课

[12-services.loopback.ts.md](/series/pi-source/chord/345-services-loopback-ts/)：同进程里如何复用远程语义。
