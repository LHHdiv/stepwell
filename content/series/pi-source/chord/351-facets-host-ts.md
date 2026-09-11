---
title: "18 · facets/host.ts — 依赖图与生命周期心脏"
summary: "把 phase 机画在纸上。能指出：setup 只记账、validateFacets 如何拓扑排序、远程可暴露服务为何走 loopback、reload 的 cutover 失败为何 abort 整代而不是回滚。这是本包最值得单步的文件"
tags: [pi, chord]
---
源码：`packages/chord/src/facets/host.ts`（约 906 行）  
被谁调用：`createFacetHost` → `new FacetKernel` + `activate`。

## 本课目标

把 phase 机画在纸上。能指出：setup 只记账、`validateFacets` 如何拓扑排序、远程可暴露服务为何走 loopback、reload 的 cutover 失败为何 `abort` 整代而不是回滚。这是本包最值得单步的文件。

## 在系统中的位置

```text
createFacetHost({ facets, serviceSources?, onError? })
  FacetKernel.activate
    每个 facet.setup(env)          同步声明
    resolveExternalServices        问 source.catalogue / open
    validateFacets                 缺/重/模式/环
    assembleProviders              RemoteServiceProvider + loopback binding
    bindServices                   slot.bind
    bindings.ready()               远程 hydrate
    按 activationOrder activate    onActivate，开 observe
```

## `FacetLifecycle`

状态：`setting_up → prepared → active → disposing → dead`。

- `assertSettingUp`：provide/use/observe/onActivate 只能 setup
- `assertRunning`：own、replicatedState 在 setup 或 active 都行
- `assertActive`：spawn 只能 active（setup 时 StagedServiceSpawner 先记下，connect 后再安装）
- `assertServiceAccess`：activate 才把 `#serviceAccess=true`；revoke 在 abort 时关掉

`activate`：先标 active 开访问，再 start observations（返回的 stop 推进 `#effects`），再 **await** 每个 `onActivate`。观察 handler 在 onActivate 之前已经能跑。

`dispose`：`#effects` 反向 await，单个失败记下，最后一抛 / AggregateError。幂等（dead 直接 return）。`onDeactivate` 其实是 `own(callback)`，所以也在 effects 里，和 own 的登记顺序一起反转。

## `HostServiceSlots` / `StagedServiceSpawner`

singleton：懒建 `ServiceSlot`。keyed：`bindKeyed` 后才能 observe。observe 给每个实例新建 **短命** ServiceSlot（只绑这个 instance），view 的 assertAccess 还检查 observation 是否 closed。

`StagedServiceSpawner`：activate 前 spawn 进 Map；`connect(installer)` 时把已有实例装上，之后 spawn 直接 installer。close 登记在 lifecycle.own，facet dispose 自动关实例。reload 时旧 keyed 随旧 facet dispose 关掉，新 generation 从 1 或继续 registry 的计数器——本地 registry 是 host 级的，generation Map 还在，所以同一 key 新 facet spawn 会得到更大 generation。

## `activate` 失败

try 里任何一步失败 → `#terminate()`（dispose 生命周期、keyed registry、bindings、slots、provider），cleanup 错误和原错聚成 `Facet generation startup and cleanup failed`。调用方看不到半开 host。

## 图校验 `validateFacets`

1. 外部 catalogue + 本地 provide 写入 `providers` Map。重复 provide、host 与 facet 抢同一 id、singleton/keyed 混用 → Error。
2. 每个 require 必须能解析。模式不一致 → Error。缺 provider → `requires local/${id}/${mode}, but no facet provides it`（文案里的 local 是历史用词，外部服务也会走这条如果没进 external map）。
3. 依赖边：require 的 provider 是另一个 facet 才连边。自己 provide 又 use 同一 token **不成环**。
4. Kahn 拓扑。剩下入度 >0 的就是环：`Facet dependency cycle: a, b`。

返回的顺序是 **provider 先于 consumer**。activate 正序，dispose 反序。

外部服务：catalogue 冲突（两个 source 广告同一 id）直接抛。缺货时若恰好一个 `acceptsUnavailableServices` 的 source，按消费者声明的 mode 暂管。多于一个 deferred source 抛。

## 组装：为何远程可暴露也 loopback

`#assembleProviders`：所有非 local provision 进 `RemoteServiceProvider`。再 `RemoteServiceBindingImpl` + loopback transport。本地 keyed 进 `LocalKeyedServiceRegistry`。

`#bindServices`：

- local singleton → slot.bind(实现对象)
- 远程 singleton → slot.bind(`internalBinding.use(service)` 的 facade)
- keyed 类似，bindKeyed 到 registry 或 binding

所以 `env.use(远程服务)` 拿到的永远是 facade，reload `provider.replace` 时对象身份不变。

`#assertServiceTargetAccess`：phase 必须是 activating / active / reloading / disposing。setup 和 assembling 时 loopback invoke 会被拒。

## `reload(facets)` — 形状保持替换

约束：每个 id 必须已存在；`sameFacetShape`（require/provide 的 id+mode 集合相等）；远程 singleton `validateReplacement` 成员 shape 不变。

顺序：

```text
对每个新 facet setup（旧的仍在路由）
activate 候选（仍未切 slot）
再 validateReplacement（激活后 impl 已定）
切 slot / provider.replace          ← cutover
dispose 旧 facet 反向
connect 新的 keyed spawn
```

setup 或 activate 失败：dispose 候选，phase 回到 active，**旧图不变**。cleanup 再失败会 `#abort()` 整代——`revoke` 所有 handle 然后 terminate。

cutover 之后失败：`#abort(previous)`，host 进入 dead。**没有回滚。** 注释和 PLANNING：committed 的应用效果在 reload 事务之外。

当前 reload **不**支持加/删 facet（structural replacement 仍是计划）。传入未激活的 id 会抛 `is not active`。

## `#environment` 要点

- `provide` 只收非 null 非数组 object
- `use` 同一 facet 同一 id 复用 view
- `observe` 把 start 函数交给 lifecycle.observe，activate 时才订阅
- `replicatedState` 直接 `new MutableReplicatedStateImpl`
- `onDeactivate` = `own`

setup 若返回 thenable：`void Promise.resolve(result).catch(() => {})` 然后抛 `setup must be synchronous`。吞掉拒绝是为了避免 unhandled rejection，但异步工作已经被踢出去了——那是作者的 bug。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 空 / 重复 facet id | 构造或 reload 立即抛 |
| 缺 provider / 环 / 模式错 | activate 失败，terminate |
| 远程 hydrate 失败 | 同上 |
| onActivate 抛 | 该代启动失败 |
| reload 改了 provide 列表 | shape 检查失败，旧图保留 |
| dispose 时 phase 不是 active | 抛 cannot be disposed while X |
| 重复 dispose | phase dead，return |

`onError` 默认空函数。keyed handler / replica listener 的错走这里，不炸 host。

## 下一课

运行时到此结束。下一课起是 Node 打包：[19-bundler.ts.md](/series/pi-source/chord/352-bundler-ts/)。
