---
title: "10 · services.handle.ts — 本地稳定 facade"
summary: "理解为什么 use(Service) 不能直接返回实现对象：setup 顺序、热替换、访问守卫都靠「slot 可变、view 不变」。能指出方法 Proxy 如何把 this 绑回实现。"
tags: [pi, chord]
---
源码：`packages/chord/src/services/handle.ts`  
被谁调用：`FacetKernel` 的 `HostServiceSlots.getSingleton`；keyed observe 时给每个实例再包一层。

## 本课目标

理解为什么 `use(Service)` 不能直接返回实现对象：setup 顺序、热替换、访问守卫都靠「slot 可变、view 不变」。能指出方法 Proxy 如何把 `this` 绑回实现。

## 在系统中的位置

```text
env.use(Foo)  → slot.view(assertAccess) → ServiceView.proxy
activate 之后  slot.bind(implementation 或 remote facade)
reload        slot.bind(新实现)          同一 view 下一跳走新对象
dispose       slot.unbind()
```

远程消费者不走 ServiceSlot（他们走 `ServiceFacade`）。但 **本地** 调远程可暴露服务时，slot 的 target 是 loopback binding 的 facade，`wrapObjects=true`。本地-only 服务 `wrapObjects=false`，非函数字段原样返回。

## `ServiceSlot`

```ts
constructor(serviceId: string, wrapObjects: boolean)
view<T>(assertAccess): T
bind(implementation: object): void
unbind(): void
resolve(property, assertAccess): { value, receiver }
```

`resolve` 先 `assertAccess()`（facet 必须 active），没有 implementation 就 `Service ${id} is disconnected`。`Reflect.get(impl, property, impl)` —— receiver 是实现，getter 里的 `this` 正确。

每个 serviceId 在 host 里一个 slot。多次 `use` 同一 token 在同一 facet 返回同一 view（host 的 `singletonViews` Map）；不同 facet 各有 view，但背后同一 slot。

## `ServiceView`

`proxy = new Proxy(Object.create(null), { get: #getMember })`。没有 `ownKeys`，枚举是空的——这是能力对象，不是 POJO。

`#getMember`：

1. `resolve()` 得当前值
2. 非 object，或（非函数且不 wrapObjects）→ 原样返回（每次都现取，所以字段热替换立刻可见）
3. 函数，或 wrapObjects 下的对象 → 缓存一个 `ValueView`

成员槽懒创建。绑定前访问方法也会建槽——调用时再 resolve。reload 后同名方法仍是同一个函数 proxy，内部 resolve 到新 impl。

## `ValueView`

target 是 `() => undefined`（可 apply）或空对象。

- `apply`：resolve 得函数，`Reflect.apply(fn, receiver, args)`。不是函数就 TypeError。
- `get`：只对 **函数** 子属性再包 ValueView（深层方法）。非函数子字段每次现取。

这让 `service.foo.bar()` 在 wrapObjects 时也能把 `this` 指到 `foo` 对象。本地 class 实例当服务实现时用得上。

## 失败与边界

- 访问 disconnected 的 slot：Error，不是 RemoteServiceError。这是本地图错误。
- `assertAccess` 在 setting_up / dead 时由 FacetLifecycle 抛。setup 里 `use()` 只拿到 proxy，**调用方法**才触发 assert——所以 setup 期间声明依赖合法，调用非法。
- wrapObjects=false 时返回的裸对象引用在替换后仍指向旧 impl。这是 local 服务的代价：任意 JS 契约，Chord 不能把所有字段都包成懒槽。远程路径没有这个问题。
- Proxy 没有 `has` / `set`。给 facade 赋值没有意义。

## 下一课

[11-services.instances.ts.md](/series/pi-source/chord/344-services-instances-ts/)：keyed 实例目录和观察任务的取消。
