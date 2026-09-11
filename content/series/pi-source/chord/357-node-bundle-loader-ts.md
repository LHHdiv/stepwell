---
title: "24 · node/bundle-loader.ts — vm 编译的一代代码"
summary: "能指出为何不用 import() / require() 加载插件：Node ESM/CJS 缓存会把旧代钉死。compileFunction + 受限 require 让 dispose 后没有模块缓存引用。能画出 integrity"
tags: [pi, chord]
---
源码：`packages/chord/src/node/bundle-loader.ts`（约 416 行）  
被谁调用：`createFacetBundleLoader`；artifact 运输对端。

## 本课目标

能指出为何不用 `import()` / `require()` 加载插件：Node ESM/CJS 缓存会把旧代钉死。`compileFunction` + 受限 `require` 让 dispose 后没有模块缓存引用。能画出 integrity 失败、未声明 external、default export 不是 facet 时的报错点。

## 在系统中的位置

```text
createFacetBundleLoader({ manifestPath, entry, verifyIntegrity?, resolveExternal? }).load()
  read+validateManifest
  read file, verify sha256
  executeCommonJsModule → exports
  facetsFromModule(default)
  dispose: facets = frozen []     放开引用
```

## `readFacetBundleManifest` / `validateManifest`

JSON.parse 失败包成 `Could not read ...` 带 cause。校验：

- format / formatVersion
- plugin.id 非空；version 若在则非空
- 至少一个 entry；entry 名非空
- `file` / `sourceMap` 必须是相对文件名（`basename(file)===file`，不能 `..`、不能绝对）
- integrity 以 `sha256-` 开头且后面非空
- externalImports 字符串数组、无重复

返回全 freeze。

## `verifySource`

utf8 文本的 sha256 base64 必须等于 integrity 去掉前缀。对不上：`Facet bundle integrity check failed for ${file}`。`verifyIntegrity: false` 可关（调试）。artifact 路径也会 verify。

## `executeCommonJsModule`

对每个 external specifier：非 builtin 则 `validatePackageSpecifier`（不能 `.` `/` `#` `:` `\`、不能 `.` `..` 段）。`resolveExternalTarget`：调用方 `resolveExternal` → 否则对 `@earendil-works/chord` 及其 `/context` `/node` 指到本包源/编译文件 → 否则 `import.meta.resolve`。

`require` 被换成：只允许名单里的 specifier，实际 `createRequire(modulePath)(target)`。未声明的 `require("foo")` → `undeclared external import`。

`compileFunction(source, ["exports","require","module","__filename","__dirname"], { filename })` 然后 `Reflect.apply`。不进 `Module._cache`。

## `facetsFromModule`

必须是 record。`default` 是一个 facet 或数组。每个要有非空 `id` 和 `setup` 函数。重复 id 抛。没有 default 时 `exported` 是 undefined，会走 invalid ID。

CJS 的 `module.exports = defineFacet(...)` 在 interop 下可能整模块就是 facet；这里只看 `.default`。bundler 打出来的 ESM-style `exports.default = ...` 才匹配。测试里手写 CJS 也要 `__esModule` + `default`。

## artifact

`readFacetBundleArtifact`：读源、verify、可选读 map，冻成 artifact。

`createFacetBundleArtifactLoader`：每次 load `mkdtemp("chord-facet-")`，写下 cjs + 清单 + map，再 `createFacetBundleLoader`。dispose：先 loaded.dispose，再 `rm` 临时目录；load 失败也 rm。`temporaryDirectory` 可指定父目录。

`validateArtifact`：format/version/entryName/source，再假装成单 entry 清单走 `validateManifest`，sourceMap 有无与 contents 一致，verifySource。

## `resolveExternal` 缺省

在 ts 源码运行时用 `.ts` 扩展，编译后 `.js`。这让单仓测试不用先 build Chord。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 清单 version 错 | Unsupported ... version |
| 完整性失败 | 不执行代码 |
| 未声明 require | 执行中抛，load 包一层 `Could not load facet bundle entry plugin/entry: ...` |
| setup 不是函数 | 不 activate，load 失败 |
| dispose 后仍握着旧 facet 对象 | 那是调用方泄漏；GC 不能收 vm 函数 |
| 插件开了 timer 没 own() | 同样泄漏。Chord 不能杀 isolate（计划中的 future） |

reload 协调：先 load 候选，`host.reload(candidate.facets)`，失败 dispose 候选；成功再 dispose **上一代** LoadedFacets。host 仍路由旧 provider 直到 cutover。

## 下一课

Chord 源码课结束。若要看谁真正 `createFacetHost`，打开 coding-agent `experimental/services/worker.ts` 和 `experimental/client-tui.ts`。普通 `pi` 交互主链仍然不走这里。终端课在 [../tui/](/series/pi-source/tui/422-%E6%A8%A1%E5%9D%97%E5%AF%BC%E8%AF%BB/)。
