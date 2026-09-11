---
title: "03 · context/index.ts — 调用作用域与取消"
summary: "画出 Context 链表：Empty → WithValue → WithAbort。能指出 withCancel 如何和父 signal 组合、awaitWithContext 取消时不取消底层 Promise、withoutAbo"
tags: [pi, chord]
---
源码：`packages/chord/src/context/index.ts`  
出口：`@earendil-works/chord/context`（**不是**根包，避免 `withCancel` 这种通用名污染根 API）  
被谁调用：facet host 激活时用 `BACKGROUND_CONTEXT`；consumer 的 `ready` 用 `awaitWithContext`；Pi harness 再包一层。

## 本课目标

画出 Context 链表：Empty → WithValue → WithAbort。能指出 `withCancel` 如何和父 signal 组合、`awaitWithContext` 取消时**不**取消底层 Promise、`withoutAbortSignal` 只给强制 cleanup 用。

## 在系统中的位置

```text
BACKGROUND_CONTEXT          根，永不取消
  withContextValue(key, v)  挂一个应用值（权限、telemetry）
  withAbortSignal(signal)   本调用可取消
  withCancel()              派生独立 AbortController
```

Context **不当业务值过 RPC**。对端看到的是取消控制帧（Pi 协议负责）加上可选的不透明 JSON metadata。接收适配器 `withAbortSignal` 出一份新的本地 Context。

## `BaseContext`

抽象类：`value` / `toString` 留给子类；`abortSignal` getter 就是 `this.value(ABORT_SIGNAL_CONTEXT_KEY)`。取消被做成普通键，所以 `withoutAbortSignal` 只要再挂一个 `undefined` 覆盖。

键本身：

```ts
const ABORT_SIGNAL_CONTEXT_KEY: ContextKey<AbortSignal | undefined> = Object.freeze({
  token: Symbol("chord.abortSignal"),
});
```

不导出。外面不能伪造这个键，只能走 `withAbortSignal`。

## `EmptyContext`

`BACKGROUND_CONTEXT` 和 `TODO_CONTEXT` 都是它。`value` 永远 `undefined`。`toString` 返回构造时的名字，调试时能在链路里看到根。

- `BACKGROUND_CONTEXT`：进程级根。host 激活、订阅投递、没有调用者的合成事件都用它。
- `TODO_CONTEXT`：占位。源码里目前几乎没业务使用，留给「我知道这里该有 context 但还没接」的调用点。

## `ContextValue<T>`

不可变链表节点。`value(key)`：token 相同则返回本节点的值（**包括**用 `undefined` 覆盖父值），否则问 parent。所以 `withoutAbortSignal` 能把父 signal 盖掉。

`toString`：`${parent}.WithValue(${description})`。嵌套几次就能在日志里读出派生链。

## `createContextKey` / `withContextValue`

```ts
createContextKey<T>(description: string): ContextKey<T>
withContextValue<T>(key, value, parent): Context
```

`description` 进 `Symbol(description)`，只用于 toString。Pi 可以 `createContextKey<User>("pi.user")` 而不让 Chord 知道 User 是什么。

## `withAbortSignal` / `withoutAbortSignal`

`withAbortSignal(signal, context)`：

- 父没有 signal → 直接挂传入的 signal
- 父有 → `AbortSignal.any([parent, signal])`，任一触发都取消

父 context 对象不变。这是派生，不是变异。

`withoutAbortSignal`：挂 `undefined`。注释写明 **只给强制 cleanup**。卸载时必须跑完 `dispose`，不能因为调用者已经 abort 就跳过释放。host 的 terminate 路径会用到这个思路（实际多半直接 `BACKGROUND_CONTEXT`）。

## `withCancel`

```ts
{ context, cancel } = withCancel(parent)
```

新建 `AbortController`，`withAbortSignal(controller.signal, parent)`。`cancel(reason)` 就是 `controller.abort`。keyed 观察任务（`instances.ts`）每个实例一把：实例关掉只 abort 那个 handler，不动别的观察者。

## `awaitWithContext`

等一个 Promise，但 context 取消时 **只 reject 这个 waiter**。底层 Promise 继续跑——Chord 不拥有那份工作的取消权。这和 `AbortSignal.any` 不同：它不是把 abort 转发给 Promise。

已 aborted 则立刻 `Promise.reject(abortError(signal))`。`abortError`：reason 已是 Error 就原样抛；否则 `DOMException("The operation was aborted", "AbortError")`。

`ready()` 用它：绑定还在 hydrate，调用者取消就别死等，但订阅自己的启动 Promise 不会被掐掉（consumer 另有 revision 丢弃逻辑）。

## 失败与边界

- Context 不是可枚举字典。没有 `keys()`、没有删除（只能覆盖）。
- `AbortSignal.any` 需要较新的 Node（本包 engines `>=22.19.0`）。
- 取消不会回滚已经发生的 `publish` 或已经执行的远程方法。那是应用事务，Chord 不管。
- `isContext` 在 consumer 里是鸭子类型：有 `value` 函数和 `toString` 函数。普通对象碰巧长这样会被当成 Context——远程方法会少一个业务参数。契约要求最后一个参数必须是真 Context。

## 下一课

[04-api.ts.md](/series/pi-source/chord/337-api-ts/)：把这些类型收成可以 `import { createFacetHost, defineService }` 的工厂。
