---
title: "16 · services/consumer.ts — 远程绑定与稳定 facade"
summary: "画出 singleton use 如何立刻返回 proxy、后台 #startSingleton 去 subscribe、install 把成员表写进已有槽。能指出 rebind(false) 清副本但 不丢掉 facade 对象、re"
tags: [pi, chord]
---
源码：`packages/chord/src/services/consumer.ts`（约 660 行）  
被谁调用：`createRemoteServiceBinding`；host 内部 loopback binding。

## 本课目标

画出 singleton `use` 如何立刻返回 proxy、后台 `#startSingleton` 去 subscribe、`install` 把成员表写进已有槽。能指出 `rebind(false)` 清副本但 **不**丢掉 facade 对象、revision 如何丢弃过期的 in-flight start。

## 在系统中的位置

```text
binding.use(Service)
  创建 ServiceFacade.proxy（方法/状态都是 MemberSlot）
  若 bound：transport.subscribe → install(snapshot) → activate
binding.observe(Service, handler)
  KeyedBinding：冷 InstanceDirectory，有观察者才 subscribe
method(...args, context)
  MemberSlot 检查 trailing Context，transport.invoke
state.subscribe / .value
  ReplicatedStateReplica
```

## `MemberSlot`

一个成员既可能是方法也可能是 state，直到 snapshot 的 `setDescription`。Proxy 的 target 是空函数：

- `apply` → `#call`：`#expect("method")`，未 active 则 `service_stale_instance`，最后一个参数必须鸭子 Context，前面当 JSON args
- `get "value"` / `"subscribe"` → `#expect("state")`
- `then` 返回 undefined，避免被 await 当成 thenable
- `Symbol.toStringTag` = `"RemoteServiceMember"`

同槽先当方法再当状态（或反过来）→ `service_member_mismatch`。`#kind` 来自服务端描述，`#expectedKind` 来自客户端用法，两边对不上都是 mismatch。

`hydrate` / `update` / `clear` 委托 replica。

## `ServiceFacade`

`install(snapshot)`：address 必须匹配；已访问过的成员名必须出现在新表里（否则 `service_member_not_found`——替换不能删已经碰到的成员）。state 成员 hydrate；method 只 setDescription。

`update`：描述必须已是 state，否则内部 Error。

方法 invoke 把 `instance` 带上（singleton 不带）。

## SingletonBinding

`use` 第一次建 facade，`bound` 则 `#startSingleton`。subscribe 的 listener 看 `binding.revision`：

- `unavailable` → `facade.clear()`
- `replaced` → snapshot 不能带 instance；`install`
- `state` 且无 instance → `facade.update`

snapshot 必须 mode=singleton、恰好 1 个 instance。`activate` 在 install 之后，避免缓冲更新跑在 hydrate 前。

start 过程中若 revision 变了 / unbound / disposed，关掉这笔订阅 return。

## `KeyedBinding`

目录 `ready: false`。`observe` 用 ServiceSlot wrap 每个实例 facade（wrapObjects=true），这样观察 handler 里拿到的也是稳定 view。第一次观察且 bound 才 `#start`。

`#spawn`：建带 address 的 ServiceFacade，install，`directory.replace`。deactivate 清 replica。

更新：singleton 生命周期事件当错误；`closed` 比对 generation；`state` generation 不对就忽略（过期帧）。

观察者清零 → `onEmpty` → 从 binding 的 map 删除并 close 订阅。

## `RemoteServiceBindingImpl`

allowlist 来自 `options.services`。重复 id TypeError。`bound` 默认 true。

`ready(context)`：循环等到 `#readinessRevision` 稳定。每次新 use/observe/rebind 涨 revision。用 `awaitWithContext`，调用方可取消等待。

`rebind(bound, context)`：所有 singleton clear、close 旧订阅、按新 bound 再 start；keyed 走 `KeyedBinding.rebind`。`Promise.allSettled` 聚错。`#bindingTransition` 让 ready 能等到这次切换完。

`dispose`：active=false，clear，等 in-flight start（catch 掉）和 close。幂等。

`#assertRemotable`：`local` 服务 → `service_not_allowed`。`#assertAvailable`：不在名单、mode 混用同样 RemoteServiceError。

## 失败与边界

- 未 hydrate 时读 `state.value` 是 `undefined`。调方法在订阅完成前：binding 已 active 就会 invoke；服务端可能 not_found。host 的 `ready()` 就是为了挡住这种情况。
- listener 里的内部 Error（错 snapshot）走 `onError`，不抛给业务调用。
- `isContext` 很浅。传 `{ value(){}, toString(){} }` 会当 Context。
- 同进程 loopback 下 invoke 的 args 仍是 borrowed。

## 下一课

[17-facets.loader.ts.md](/series/pi-source/chord/350-facets-loader-ts/)：loader 失败如何反向清理。然后进 host 心脏。
