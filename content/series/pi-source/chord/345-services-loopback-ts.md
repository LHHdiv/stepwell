---
title: "12 · services/loopback.ts — 同进程远程语义"
summary: "一句话：loopback 不是「走捷径返回实现对象」，而是把 invoke / subscribe 直接接到同一个 RemoteServiceProvider。同进程的远程服务仍然有 snapshot、generation、replac"
tags: [pi, chord]
---
源码：`packages/chord/src/services/loopback.ts`（17 行）  
被谁调用：`FacetKernel.#assembleProviders` 给远程可暴露的本地服务建 `RemoteServiceBindingImpl({ transport: createLoopbackServiceTransport(provider) })`。

## 本课目标

一句话：loopback 不是「走捷径返回实现对象」，而是把 `invoke` / `subscribe` 直接接到同一个 `RemoteServiceProvider`。同进程的远程服务仍然有 snapshot、generation、replacement、state 批次。这样 facet 以后被挪到另一个进程，语义不变。

## 在系统中的位置

```text
facet A provide(RemoteService, impl)
facet B use(RemoteService)
  B 拿到的是 Binding.use() 的 ServiceFacade
  Facade.invoke → transport.invoke → provider.invoke → impl.method(args, context)
  Facade 的 state → provider.subscribe → 源的 sourceListeners
```

`service.local === true` 的不走这条。它们 bind 的是实现对象本身（经 ServiceSlot）。

## `createLoopbackServiceTransport`

```ts
return {
  invoke: (call, context) => provider.invoke(call, context),
  subscribe: async (serviceId, mode, listener) => {
    const subscription = provider.subscribe(serviceId, mode, listener);
    return {
      snapshot: subscription.snapshot,
      activate: () => subscription.activate(),
      close: () => subscription.close(),
    };
  },
};
```

`subscribe` 标了 `async` 只为满足 `Promise<ServiceSubscription>`。没有排队、没有结构化克隆。`args` 是 borrowed——同进程调用方改数组，实现立刻看到。这是文档写明的。真隔离要自己拷，或走真正的序列化 transport。

`close` 忽略 context：本地 subscribe.close 是同步的。

## 失败与边界

- 没有断开。loopback 不会发 transport 级 disconnect。host dispose 时 provider.dispose 会给订阅者 `unavailable` / `closed`。
- 异常原样穿过，不会变成消毒信封。同进程调试更方便，也意味着栈会泄漏到调用方——应用别把 loopback 当安全边界。PLANNING：local 是 trusted composition。
- 和未来 `rpc/loopback.ts`（计划中的 in-memory duplex peer）不是同一个东西。现在没有 peer。

## 下一课

[13-services.wire.ts.md](/series/pi-source/chord/346-services-wire-ts/)：跨进程时控制面调用长什么样。
