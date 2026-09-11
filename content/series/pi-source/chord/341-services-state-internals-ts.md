---
title: "08 · services/state-internals.ts — WeakMap 品牌"
summary: "明白「一个对象是不是 replicated state」不是 instanceof，而是 WeakMap。这样跨 vm / 跨打包副本也能、也只能认出同一运行时注册过的对象。"
tags: [pi, chord]
---
源码：`packages/chord/src/services/state-internals.ts`  
被谁调用：`state.ts` 构造源时 `register`；`provider.ts` 分类实现时 `get`。

## 本课目标

明白「一个对象是不是 replicated state」不是 `instanceof`，而是 WeakMap。这样跨 vm / 跨打包副本也能、也**只能**认出同一运行时注册过的对象。

## 在系统中的位置

```text
new MutableReplicatedStateImpl
  registerReplicatedStateInternals(this, { sequence, value, publish, subscribe })
provider.classifyRemoteServiceImplementation
  getReplicatedStateInternals(descriptor.value)  → 有则 member.kind = "state"
```

远程契约不允许随便一个 `{ value, subscribe }` 鸭子。必须是 Chord 注册过的实例。这把应用自己写的 store 挡在远程成员表之外。

## `ReplicatedStateInternals`

```ts
interface ReplicatedStateInternals {
  readonly sequence: number;
  readonly value: unknown;
  publish(context: Context): void;
  subscribe(listener: (ops, sequence, context) => void): () => void;
}
```

注意这里的 `subscribe` 听的是 **ops 批次**，不是完整值。那是给 provider 往连接上推 `type: "state"` 用的。应用 listener 走 `ReplicatedState.subscribe`（完整值），两套表。

`publish` 暴露出来是因为 `provider.#publishPending`：新订阅建立前先把各 state 成员 flush 一次，避免快照里的 sequence 落后于未发布的脏改。

## `register` / `get`

模块级 `WeakMap<object, ReplicatedStateInternals>`。key 是 `MutableReplicatedStateImpl` 实例本身（应用拿到的那个对象）。实现被 GC 后条目消失，没有显式 unregister。

`get`：非 object / null → undefined。不会抛。

## 失败与边界

- 两个 Chord 副本（host 打进包、插件又打进一份）→ WeakMap 不共享 → provider 会说「member is not remotely exposable」。这就是 bundler **必须 external `@earendil-works/chord`** 的原因。
- 不要把 internals 对象交给应用。只有 register/get 两个函数，且 get 不在根导出。
- replica（`ReplicatedStateReplica`）**不** register。它不能当远程成员源。

## 下一课

[09-services.state.ts.md](/series/pi-source/chord/342-services-state-ts/)：源如何 flush，副本如何 hydrate / 检测序号缺口。
