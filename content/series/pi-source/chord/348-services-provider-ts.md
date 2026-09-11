---
title: "15 · services/provider.ts — 远程服务的权威侧"
summary: "能走通一次 subscribe：先 #publishPending 挤出脏 state，登记 subscriber（此时 active=false，更新进 buffer），返回 snapshot，调用方 activate() 再放缓冲。"
tags: [pi, chord]
---
源码：`packages/chord/src/services/provider.ts`（约 586 行）  
被谁调用：FacetKernel 组装时 `new RemoteServiceProvider(远程 provisions)`；适配器用 `createRemoteServiceEndpoint(provider)`。

## 本课目标

能走通一次 subscribe：先 `#publishPending` 挤出脏 state，登记 subscriber（此时 `active=false`，更新进 buffer），返回 snapshot，调用方 `activate()` 再放缓冲。能指出 singleton `replace` 不经过 unavailable、keyed 的 generation 如何 fence 住旧调用。

## 在系统中的位置

```text
new RemoteServiceProvider([{ service, mode }, ...])   只登记目录，还没有 impl
provide / spawn / withdraw / replace / validateReplacement
invoke(call, context)
subscribe(id, mode, listener) → { snapshot, activate, close }
createRemoteServiceEndpoint：把 $chord.service 控制调用接到上面
```

构造时 `local: true` 直接 TypeError。重复 id TypeError。catalogue 冻成 `{ serviceId, mode }[]`。

## 分类实现 `classifyRemoteServiceImplementation`

own 可枚举键，排序后逐个：

- 必须是 data 属性（不要 accessor）
- 函数 → method
- `getReplicatedStateInternals` 命中 → state
- 其它 → TypeError not remotely exposable
- 零成员 → TypeError

`validateRemoteServiceImplementation` 只是分类丢结果，host 的 keyed spawn 在连接前用它。

## `provide` / `withdraw` / `replace`

`provide`：已有 singleton 则 `service_mode_mismatch`（文案是 already has a provider）。记下 `singletonShape`（名字→kind）。`#createInstance` 给每个 state 成员 `subscribe` ops，转成 `#emit { type: "state" }`。

`withdraw`：active=false，卸 listener，删 singleton，`emit unavailable`。**facade 对象还在**，只是变冷。

`validateReplacement`：分类 + 比 shape，不改活对象。reload 激活前调用。

`replace`：建新 instance，旧的 active=false，换上，`emit replaced` 带完整 snapshot（每个 state 是 `["r", currentValue]`，不是增量）。消费者 `install` 进原 facade，不经过 unhydrated。

shape 变了：`service_member_mismatch`。

## keyed `spawn`

空 key TypeError。活 key 重复 → mismatch。generation = 旧+1。emit `spawned`。返回的 close 幂等：active=false，emit `closed`。

`#resolveInstance`：singleton 不允许带 address；keyed 必须带。generation 不对 → `service_stale_instance`。这就是旧 facade 调新实例会被拒的原因。

## `invoke`

取 member，必须是 method，`Reflect.apply(method, impl, [...args, context])`。返回值 **断言成** `JsonValue | undefined`，不做 `isJsonValue`。void 方法返回 `undefined`（JSON 里没有 undefined，适配器应编码成缺省结果）。

## `subscribe` 的缓冲契约

```text
#publishPending          每个 state.publish(deliveryContext) 挤脏
subscribers.add          active=false
snapshot = #snapshot()   此刻的完整目录
返回
  activate(): 按序 listener(buffer...)；terminated 则 close
  close(): 删掉，清空 buffer
```

`#emit`：未 activate 的进 buffer；已 activate 的同步 listener。listener 抛错收集后 `throwCollectedErrors`。

dispose：singleton unavailable、每个 keyed closed、未 activate 的标 `terminated`（activate 时会关掉）、已 activate 的直接 closed。emit 失败聚合。

`#snapshot` keyed 实例按 key `localeCompare` 排序，保证快照稳定。

## `createRemoteServiceEndpoint`

一个 consumer 一条 endpoint，内部 `Map<subscriptionId, ServiceSubscription>`。

- `catalogue` → `provider.catalogue` 当 JsonValue
- `subscribe`：id 已存在抛；`provider.subscribe` 后 **立刻 activate**（和手动 subscribe 的「先拿 snapshot 再 activate」不同——控制面路径上 snapshot 作为 invoke 返回值，更新经 `publish` 回调异步出去。activate 立刻放行是为了不丢 invoke 返回之后、客户端装 snapshot 之前的更新；客户端必须先装返回的 snapshot 再处理后续 publish）
- `unsubscribe`：close + delete
- 其它 → `provider.invoke`

`publish` 回调的 Promise 用 `.catch(() => {})` 吞掉。适配器发送失败不会炸 provider。这是有意的：传输错误由适配器自己的连接状态处理。

`dispose` 关所有订阅，不 dispose provider（provider 可能还服务别的 endpoint）。

## 失败与边界

- 订阅时 singleton 还没有 provide → `service_not_found`。host 激活顺序保证 provide 在 consumer activate 之前；外部 source 可能暂缺。
- `use(service)` 在 provider 上返回 **实现对象本身**，不是 facade。这给同进程「我就是 provider」用。facet 消费者不要走这条。
- 未捕获的 method 异常会穿出 invoke。适配器应捕获并变成消毒错误。
- `#emit` 没有订阅者时直接 return，state 的 source listener 仍在；下一次 subscribe 靠 `#publishPending` + snapshot 里的完整 `r` 追上。

## 下一课

[16-services.consumer.ts.md](/series/pi-source/chord/349-services-consumer-ts/)：对端如何把 snapshot 变成可调用的 Proxy。
