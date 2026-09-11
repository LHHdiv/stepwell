---
title: "17 · facets/loader.ts — 反向 dispose"
summary: "看清 Promise.allSettled + flatMap rejected：cleanup 继续跑完，错误以数组返回，由调用方决定 AggregateError 还是丢掉。"
tags: [pi, chord]
---
源码：`packages/chord/src/facets/loader.ts`（6 行）  
被谁调用：`combineFacetLoaders`；host 不直接用。

## 本课目标

看清 `Promise.allSettled` + `flatMap rejected`：cleanup 继续跑完，错误以数组返回，由调用方决定 AggregateError 还是丢掉。

## 在系统中的位置

```text
combineFacetLoaders.load 失败
  disposeLoadedFacets(loaded.reverse())
host 不管 LoadedFacets —— 那是协调者（experimental worker）的所有权
```

模块加载和 facet 激活是两个所有权域。loader.dispose 释放模块引用（bundle-loader 把 facets 数组换成空冻数组，让 vm 函数可被 GC）。host.dispose 释放激活过的生命周期。必须先停 host 再 dispose loader，否则活着的 facet 还指着要卸的代码。

## `disposeLoadedFacets`

```ts
const results = await Promise.allSettled(loaded.map((entry) => entry.dispose()));
return results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
```

并行 dispose。顺序已经由调用方 reverse 过；并行意味着「反向」只是数组顺序上的礼貌，并不保证时间上严格串行。当前 LoadedFacets.dispose 几乎都是同步清引用，冲突少。若将来 dispose 有依赖，应改成串行。

不抛。空数组 = 全成功。

## 失败与边界

- `dispose` 必须幂等。combine 的总 dispose 有 `disposed` 旗标；单个 loader 自己也要防重入。
- 静态 loader 的 dispose 是空函数，反向清理成本为零。

## 下一课

[18-facets.host.ts.md](/series/pi-source/chord/351-facets-host-ts/)：图校验、激活顺序、形状保持的 reload。本包最值得单步的文件。
