---
title: "03 · promise.ts — 手写 `Promise.withResolvers`"
summary: "知道为什么不直接 Promise.withResolvers()：仓库 TypeScript lib 还停留在 ES2024 之前。行为必须和标准一样：resolve/reject 在 Promise 执行器跑完后一定已经赋值。"
tags: [pi, client]
---
源码：`packages/client/src/promise.ts`（17 行）  
核心导出：`createPromiseResolvers`  
被谁调用：`Connection.connect` 的 handshake；`Client.#request` 的 pending map。

## 本课目标

知道为什么不直接 `Promise.withResolvers()`：仓库 TypeScript lib 还停留在 ES2024 之前。行为必须和标准一样：`resolve`/`reject` 在 Promise 执行器跑完后一定已经赋值。

## 实现

```ts
export function createPromiseResolvers<T>(): PromiseResolvers<T> {
  let resolve!: ...;
  let reject!: ...;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
```

`new Promise` 的 executor **同步**运行，所以返回时 `resolve`/`reject` 已有值。`!` 是给 TS 看的。

Connection 在 `disconnected → connecting` 时立刻把 `handshake` resolvers 放进 lifecycle，然后异步开 transport。hello 到达 `handshake.resolve(message)`；任何失败 `handshake.reject(error)`。`connect()` 的调用方 await 的就是这份 promise。

Client `#request` 同样：先登记 pending，再 `send`。response 来了 `resolve(transform(result))`。

## 失败与边界

- 没有 cancel。取消靠 `AbortSignal` 在 Client 层 `reject(abortError)` + 发 cancel 帧。resolvers 本身不知道 abort。
- 重复 resolve/reject：标准 Promise 忽略第二次。Connection 在 `#fail` 里把 lifecycle 换成 disconnected，避免二次 reject；`handshake?.reject` 只在从 connecting/connected 离开时调一次。

## 下一课

传输接口，Client 对 socket 的全部知识止于此：[04-transport.ts.md](/series/pi-source/client/393-transport-ts/)。
