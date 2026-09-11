---
title: "44 · auth/credential-store.ts — 带队列的内存凭证"
summary: "看 modify 如何按 providerId 串行：promise 链，前一个的 reject 被 catch(() => {}) 吞掉以免卡住队列，但当前 task 的结果仍传给调用方。"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/credential-store.ts`  
被谁调用：`createModels()` 默认；测试。产品用文件版实现同一接口。

## 本课目标

看 `modify` 如何按 providerId 串行：promise 链，前一个的 reject 被 `catch(() => {})` 吞掉以免卡住队列，但当前 task 的结果仍传给调用方。

## `enqueue`

```ts
const previous = this.chains.get(providerId) ?? Promise.resolve();
const queued = (async () => {
  await previous.catch(() => {});
  signal.throwIfAborted();
  return task();
})();
const tail = queued.catch(() => {});
this.chains.set(providerId, tail);
return raceWithAbortSignal(queued, signal);
```

`tail` 永不 reject，链不会断。`raceWithAbortSignal` 让 abort 的调用方立刻失败，但 **task 仍会跑完**（链已经在等它）——这和 login 那段「mutate 开始了就写完」一致。abort 发生在 `throwIfAborted` 之前则 task 不跑。

`read` / `list` **不**进队列：可能读到正在 modify 的中间态。OAuth 双检锁依赖 modify 内再读 current，不依赖外部 read 的线性化。

`modify` 的 `fn` 返回 `undefined`：不改 map，resolve 仍是 current。`delete` 进同一队列。

## 失败与边界

abort 已排队的 modify：调用方看到 abort，写入可能仍发生。跨进程无锁——产品必须换文件锁实现。list 不暴露 secrets，只 `{ providerId, type }`。

## 下一课

工厂辅助函数：[45-auth-helpers.ts.md](/series/pi-source/ai/106-auth-helpers-ts/)。
