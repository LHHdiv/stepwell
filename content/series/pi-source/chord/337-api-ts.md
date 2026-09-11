---
title: "04 · api.ts — 根上能调用的工厂"
summary: "分清「创建 host」和「定义 token」：createFacetHost 立刻 activate；defineFacet / defineService 只是 identity + 校验。能画出 combineFacetLoader"
tags: [pi, chord]
---
源码：`packages/chord/src/api.ts`  
被谁调用：根 `index.ts` 再导出；coding-agent experimental 的 `defineFacet` / `createFacetHost` / `replicatedState` 都落在这里。

## 本课目标

分清「创建 host」和「定义 token」：`createFacetHost` 立刻 `activate`；`defineFacet` / `defineService` 只是 identity + 校验。能画出 `combineFacetLoaders` 失败时如何反向 dispose。

## 在系统中的位置

```text
defineService / defineFacet / replicatedState     声明期，无 I/O
createStaticFacetLoader / combineFacetLoaders     加载期
createFacetHost(options)                          运行期：new FacetKernel → activate
createRemoteServiceBinding                        运行期：new RemoteServiceBindingImpl
```

真正的图算法在 `facets/host.ts`。本文件是薄壳，方便根 API 不把 Kernel 类漏出去。

## `createFacetHost`

```ts
const kernel = new FacetKernel(options);
await kernel.activate();
return Object.freeze({
  services: kernel.provider,
  reload: (facets) => kernel.reload(facets),
  dispose: () => kernel.dispose(),
});
```

返回的 `FacetHost` 是冻结对象：`services` 是已经组装好的 `RemoteServiceProvider`（只含远程可暴露服务）。`reload` 是形状保持的热替换，不是结构性换图——加/删 facet 或改依赖会在 host 里抛错。

失败时 `activate` 自己 `terminate` 并可能 `AggregateError`。调用方拿不到半开的 host。

## `createStaticFacetLoader`

把一份已有的 `Facet[]` 冻成 loader。`load()` 每次返回同一批引用，`dispose` 是空函数。内置 facet（worker 里的 AgentController / Models / Transcript）走这条，不经过 bundler。

## `combineFacetLoaders`

按数组顺序 `await loader.load()`。某次 load 抛错：

1. 已经成功的 `LoadedFacets` **反向**交给 `disposeLoadedFacets`
2. 若 cleanup 也失败 → `AggregateError([原错, ...cleanup])`
3. 否则原错原样抛

成功则返回合并后的 `facets`（flatten）和一个总 `dispose`：同样反向、幂等（`disposed` 旗标）。cleanup 一个错就抛那个；多个就 AggregateError。

这是「内置 + 磁盘插件」的标准拼法。experimental worker：`combine` 其实发生在 worker 自己先 load builtins、再 load plugins、再 `createFacetHost({ facets: [...builtins, ...plugins] })`——host 吃的是已经 load 好的数组。`combineFacetLoaders` 给「先合成一个 loader 再交给别人 load」用，例如 `experimental/plugins/bundled.ts`。

## `defineFacet`

`return facet`。零运行时。存在是为了在调用处获得类型检查，并作为「这是一份 facet 字面量」的标记。default export 一份 `defineFacet({...})` 是 bundler 期望的模块形状。

## `defineService`

两个重载：

- `{ local: true }` → `Service<T>`，T 任意
- 否则可选 `{ local?: false }`，且 `RemoteServiceContract<T>` 不能是 `never`

实现：

```ts
if (id.length === 0) throw TypeError
if (id.startsWith("$chord.")) throw TypeError  // 保留给控制面
return Object.freeze({ id, local: options?.local ?? false })
```

注释有 TODO：保留命名空间是否该属于 Chord。现在已经属于。`$chord.service` 的 catalogue/subscribe/unsubscribe 用的就是这个前缀。

重复 `defineService("pi.models")` 会得到两个不同对象，但 `id` 相同。图里用 `id` 判重，不靠对象身份。token 对象主要携带 `local` 和类型参数。

## `createRemoteServiceBinding`

`new RemoteServiceBindingImpl(options)`。options 要 allowlist、transport、可选 `bound`/`onError`/`assertAccess`。host 内部给远程可暴露的本地服务也建了一个 binding，transport 是 loopback。

## `replicatedState`

`new MutableReplicatedStateImpl(initial)`。facet 环境里的 `env.replicatedState` 同样直接 new 这个类——`api.replicatedState` 给「不在 facet setup 里」的测试和 provider 用。

## 失败与边界

- `defineService("")`、`$chord.*`：TypeError，定义期就死，不要拖到 activate。
- `combineFacetLoaders` 的 dispose 只 dispose 自己 load 出来的那批。host.dispose 不会自动 dispose loader——experimental worker 必须自己在 host 之后 `loadedPlugins.dispose()`。
- `createFacetHost` 返回的 freeze 对象没有 kernel 引用的显式字段；reload/dispose 闭包抓住 kernel。重复 dispose 由 kernel 的 phase 机处理。

## 下一课

[05-index.ts.md](/series/pi-source/chord/338-index-ts/)：根 barrel 导出了什么、刻意没导出什么。
