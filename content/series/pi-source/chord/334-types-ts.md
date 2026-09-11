---
title: "01 · types.ts — Chord 全部公共形状"
summary: "能指着这份文件说出：Context 为什么不是 Harness Context、Service 的 local 和 SERVICETYPE 各挡什么、远程契约如何在类型层拒绝非法成员、快照/更新五种 ServiceProviderUpd"
tags: [pi, chord]
---
源码：`packages/chord/src/types.ts`  
被谁调用：几乎所有 Chord 文件 `import type`；根 `index.ts` 再导出给 Pi 适配器。

## 本课目标

能指着这份文件说出：Context 为什么不是 Harness Context、Service 的 `local` 和 `SERVICE_TYPE` 各挡什么、远程契约如何在类型层拒绝非法成员、快照/更新五种 `ServiceProviderUpdate` 对应生命周期哪一步。读后面的 host / provider 时不再回头猜字段。

## 在系统中的位置

```text
types.ts
  Context / ContextKey / JsonValue          ← context/、json.ts 实现
  ReplicatedState / MutableReplicatedState  ← services/state.ts
  Service / RemoteServiceContract           ← api.defineService
  Facet / FacetHost / FacetLoader           ← facets/host.ts、api.ts
  RemoteServiceTransport / Binding          ← consumer.ts；Pi 适配器实现 transport
  ServiceCall / Snapshot / Update           ← provider.ts、wire.ts
```

本文件几乎没有运行时。唯一运行时副作用是 `import type { Op }` 和 `export type { RemoteServiceError }`——类型再导出。

## `Context` 与 `ContextKey`

```ts
interface ContextKey<T> {
  readonly token: symbol;
  readonly valueType?: (value: T) => T;   // 幽灵字段，只挡类型
}

interface Context {
  readonly abortSignal: AbortSignal | undefined;
  value<T>(key: ContextKey<T>): T | undefined;
  toString(): string;
}
```

这是 Go 风格的调用作用域：取消 + 类型化的不可变键值。Chord **不**内置 telemetry、身份、权限。Pi 的 harness 在 `packages/agent/src/harness/context.ts` 用 Chord 的 `Context` 自己挂键。远程方法的业务参数不能带 Context 过线——对端适配器构造一份新的本地 Context，把取消信号和本地身份装进去。

`valueType` 没有运行时值。两个 `ContextKey<string>` 和 `ContextKey<number>` 因为幽灵函数签名不同而不能互换。

## `JsonValue` 与 `JsonRepresentation<T>`

```ts
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
```

没有 `undefined`、没有 class、没有稀疏数组。`JsonRepresentation<T>` 把应用类型映射成「过线时应该长什么样」：unknown/any 变成 `JsonValue`；对象递归；不能表示的变成 `never`。

这是**静态**闸门。运行时闸门在下一课 `isJsonValue`。Chord 的服务运行时故意不做递归校验，序列化器自己负责。

## Replicated state

```ts
interface ReplicatedState<T> {
  readonly value: T | undefined;   // 源永远有值；副本 hydrate 前是 undefined
  subscribe(listener: (value, context, delivery) => void): () => void;
}

interface MutableReplicatedState<T extends object> extends ReplicatedState<T> {
  readonly value: T;
  readonly state: T;               // 可写代理，所有写入必须走这里
  publish(context: Context): void;
}
```

`ReplicatedStateDelivery` 只有 `hydrate | update` 和 `sequence`。监听器拿到的是不可变值，可能和别的 revision 结构共享未改子树（`applyImmutable`）。**不要依赖对象身份。**

## `Service<T>` 与远程契约

```ts
interface Service<T> {
  readonly id: string;
  readonly local: boolean;
  readonly [SERVICE_TYPE]?: (value: T) => T;
}
```

`SERVICE_TYPE` 是 `unique symbol` 幽灵字段：`Service<Foo>` 和 `Service<Bar>` 不能互相赋值。`id` 是运行时身份；类型是编译期身份。

`RemoteServiceContract<T>` 走一串条件类型：每个成员必须是

- `ReplicatedState<JSON>`，或
- `(...args: JSON[], Context) => Promise<JSON | void>`

否则成员名出现在 `InvalidRemoteMemberNames<T>`，整个 `T` 变成 `never`。`defineService` 的重载用它：远程服务若不传 `{ local: true }`，非法契约在调用处就红。

**类型挡不住恶意对端。** provider 仍会 `classifyRemoteServiceImplementation` 做运行时分类。

## 目录、快照、更新

| 类型 | 用途 |
|---|---|
| `ServiceCatalogueEntry` | `{ serviceId, mode }` 广告 |
| `ServiceInstanceAddress` | keyed 的 `{ key, generation }` |
| `ServiceMemberSnapshot` | `method` 或 `state`（带 sequence + ops） |
| `ServiceInstanceSnapshot` | 一个实例的成员表；singleton 没有 `instance` |
| `ServiceSubscriptionSnapshot` | 一次订阅的完整目录 |
| `ServiceCall` | `{ serviceId, instance?, member, args }`。`args` 是借来的不可变 JSON，Chord 不克隆 |
| `ServiceProviderUpdate` | `state` / `unavailable` / `replaced` / `spawned` / `closed` |

五种更新对应生命周期：

- `state`：某成员 publish 了一批 ops
- `unavailable`：singleton 被 withdraw（facade 仍在，变冷）
- `replaced`：singleton 热替换，快照直接装进原 facade
- `spawned` / `closed`：keyed 实例出现或关掉

## Transport 与 Binding

```ts
interface RemoteServiceTransport {
  invoke(call, context): Promise<JsonValue | undefined>;
  subscribe(serviceId, mode, listener, context): Promise<ServiceSubscription>;
}
```

Chord 不规定帧、路由、信封。适配器在边界上保证 strict JSON。`ServiceSubscription` 先给 `snapshot`，调用 `activate()` 才开始放缓冲的更新——避免「快照和第一批 update 赛跑丢事件」。

`RemoteServiceBinding` 在 `RemoteServices` 上多了 `rebind(bound, context)`：连接断开时 `bound=false` 清副本；重连再 hydrate。这是 Pi client 换 socket 时用的钩子。

## Facet 环境

`FacetEnvironment` 是 setup 期间唯一能碰的 API：

- `use` / `observe`：声明硬依赖
- `provide` / `provideMany`：声明提供
- `replicatedState`：造可变状态
- `own` / `onActivate` / `onDeactivate`：资源与生命周期

`FacetOptions.serviceSources` 是「图外的远程目录」。host 组装时先问各 source 的 `catalogue()`，再 `open()` 绑定本图真正用到的 id。`acceptsUnavailableServices` 允许暂时没有的服务由某个 source 暂管——实验连接层用它在会话还没 attach 时先把图搭起来。

## 失败与边界

- 本文件不抛错。错误形状在 `services/errors.ts`。
- `JsonRepresentation` 对函数、symbol、class 得到 `never`；这只在类型检查时出现。
- `ServiceCall.args` 注释写明 borrowed：调用方改数组，provider 看到的就是改过的。loopback 同进程尤其危险。跨进程序列化会自然切开。

## 下一课

[02-json.ts.md](/series/pi-source/chord/335-json-ts/)：运行时如何认定一份值是有限、无环、纯 JSON。
