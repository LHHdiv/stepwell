---
title: "21 · node/manifest.ts — 清单与 artifact 形状"
summary: "能默写一个最小 chord-facets.json，以及运输用的 artifact 比清单多了哪些字段。"
tags: [pi, chord]
---
源码：`packages/chord/src/node/manifest.ts`  
被谁调用：bundle.ts 写入；bundle-loader.ts 读入校验。

## 本课目标

能默写一个最小 `chord-facets.json`，以及运输用的 artifact 比清单多了哪些字段。

## 在系统中的位置

打包器写磁盘上的清单。加载器只信这份 JSON，不信目录里「看起来像」的其它 js。

## 常量

```ts
FACET_BUNDLE_FORMAT = "chord.facet-bundle"
FACET_BUNDLE_FORMAT_VERSION = 2
FACET_BUNDLE_MANIFEST_FILE = "chord-facets.json"
FACET_BUNDLE_ARTIFACT_FORMAT = "chord.facet-bundle-artifact"
FACET_BUNDLE_ARTIFACT_FORMAT_VERSION = 2
```

format 字符串用于拒收随手写的 JSON。version 2 与实现绑定，没有兼容层。

## `FacetBundleEntry`

| 字段 | 含义 |
|---|---|
| `file` | 相对清单的 CJS 文件名（不能带路径分隔符，见 loader 的 `resolveBundleFile`） |
| `integrity` | `sha256-<base64>` SRI |
| `externalImports` | 故意留给宿主 resolve 的 specifier |
| `sourceMap?` | 相对文件名 |

## `FacetBundleManifest`

`format` + `formatVersion` + `plugin: { id, version? }` + `entries: Record<name, Entry>`。entry 名是不透明的应用数据：`worker` / `presentation` 只是 Pi 的约定。

## `FacetBundleArtifact`

一份自包含的单 entry：清单元数据 + `entryName` + `entry` + `source` 字符串 + 可选 `sourceMapContents`。给「读出来、送到另一个 Node、物化成临时目录再 vm 编译」用。不把整个 outdir 打 tar。

## 失败与边界

本文件只有类型和常量。非法 JSON 的报错字符串在 loader 的 `validateManifest`。

## 下一课

[22-node.bundle.ts.md](/series/pi-source/chord/355-node-bundle-ts/)：esbuild 如何变成内容寻址的 `.cjs`。
