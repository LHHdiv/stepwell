---
title: "22 · node/bundle.ts — esbuild 打成内容寻址 CJS"
summary: "能指出：每个 entry 独立 build、@earendil-works/chord 永远 external、输出写到临时目录再原子 rename、integrity 是文件字节的 sha256。知道 supported.dynami"
tags: [pi, chord]
---
源码：`packages/chord/src/node/bundle.ts`  
被谁调用：`bundleFacets`；`bundleFacetPackage` 转调。

## 本课目标

能指出：每个 entry 独立 build、`@earendil-works/chord` 永远 external、输出写到临时目录再原子 rename、integrity 是文件字节的 sha256。知道 `supported.dynamic-import: false` 是为了让动态 import 降成 loader 的受限 require。

## 在系统中的位置

```text
bundleFacets({ plugin, entries, outdir, external?, sourceMap?, ... })
  mkdir parent
  临时目录 `.${outdir basename}.tmp-${uuid}`
  每个 entry 按名字排序后 bundleEntry
  写 chord-facets.json
  replaceDirectory(tmp, outdir)     先把旧的 rename 成 .old-uuid
```

失败删临时目录。replace 若第二步 rename 失败且已经挪走旧目录，会把 backup 改回去。

## `bundleEntry` 的 esbuild 选项

关键项：

- `format: "cjs"`，`outExtension: { ".js": ".cjs" }`
- `banner: { js: '"use strict";' }`
- `entryNames: facet-${shortHash(name)}-[hash]` — 内容变则文件名变
- `external`: Chord 根和 `chord/*`，加上调用方名单
- `platform` 默认 `node`，target 默认 `node22.19`（和 engines 对齐）；browser/neutral 默认 `es2022`
- `supported: { "dynamic-import": false }` — 动态 import 变成 require 路径，才能走受限 require
- `legalComments: "none"`，`logLevel: "silent"`，`metafile: true`
- sourceMap 只在 `sourceMap === true` 时 external；`package.ts` 默认 true

校验：恰好一个 `.cjs` 且有 entryPoint；不得有额外输出（除 `.map`）；输出必须是临时目录下的单文件名。

`externalImports` 来自 metafile `imports` 里 `external: true` 的 path，排序去重。integrity：`sha256-` + 文件字节 base64（**不是** utf8 文本 hash——和 loader 用 utf8 读再 hash 对文本 CJS 一致，因为源是 UTF-8 JS）。

esbuild 失败：抽出 `errors[].location` 拼进 `Could not bundle facet entry ${name}`。

## `validateOptions`

空 plugin id、空 version 字符串、零 entry、空 entry 名/路径、空 external specifier → TypeError。

## `replaceDirectory`

```text
rename(outdir, outdir.old-uuid)   ENOENT 则当没有旧的
rename(tmp, outdir)               失败则把 old 改回
rm(old)
```

加载器不会看到写到一半的 outdir。窗口只在两次 rename 之间：旧的已经不在原路径。调用方应避免一边 build 一边 load 同一路径；通常 load 的是已经发布的目录。

## 失败与边界

- Chord 必须 external：插件和宿主共享 branding symbol、WeakMap、ContextKey。
- 其它依赖默认打进 bundle。peer 由 package.ts 再加进 external。
- 不跑生命周期脚本、不 npm install。缺依赖就是 esbuild 报 cannot resolve。
- `shortHash` 是 entry **名字** 的 sha256 前 12 位，不是源内容。内容 hash 在 esbuild 的 `[hash]` 和 integrity。
- 本文件 import `esbuild`。不要从主包间接 import 到这里。

## 下一课

[23-node.package.ts.md](/series/pi-source/chord/356-node-package-ts/)：从插件的 package.json 读 `chord.facets`。
