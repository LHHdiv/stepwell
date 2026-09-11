---
title: "20 · node.ts — Node 加载子路径入口"
summary: "对照 bundler：打包出 chord-facets.json + .cjs，加载走本入口的 createFacetBundleLoader / artifact API。不要从主包 import 这些，否则浏览器或非 Node 环境"
tags: [pi, chord]
---
源码：`packages/chord/src/node.ts`  
出口：`@earendil-works/chord/node`

## 本课目标

对照 bundler：打包出 `chord-facets.json` + `.cjs`，加载走本入口的 `createFacetBundleLoader` / artifact API。不要从主包 import 这些，否则浏览器或非 Node 环境会碰到 `node:vm`。

## 在系统中的位置

```text
readFacetBundleManifest(path)
createFacetBundleLoader({ manifestPath, entry, resolveExternal? })
readFacetBundleArtifact({ manifestPath, entry })     给运输
createFacetBundleArtifactLoader({ artifact, resolveExternal? })  对端物化再 load
```

experimental 的 bundled plugin loader 用这些。session worker 在另一进程 `createFacetBundleArtifactLoader` 收插件。

## 导出

函数：`createFacetBundleArtifactLoader`、`createFacetBundleLoader`、`readFacetBundleArtifact`、`readFacetBundleManifest`。

常量：`FACET_BUNDLE_FORMAT`（`"chord.facet-bundle"`）、`FACET_BUNDLE_FORMAT_VERSION`（`2`）、`FACET_BUNDLE_MANIFEST_FILE`（`chord-facets.json`）、artifact 的 format / version。

类型：loader options、artifact、manifest、plugin、entry。

## 失败与边界

无自身逻辑。`formatVersion` 不匹配会在 `validateManifest` 拒收。版本 2 是当前契约。

## 下一课

[21-node.manifest.ts.md](/series/pi-source/chord/354-node-manifest-ts/)：清单字段精确形状。
