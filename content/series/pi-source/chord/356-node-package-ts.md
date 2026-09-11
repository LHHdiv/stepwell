---
title: "23 · node/package.ts — 包约定打成 entry map"
summary: "能解释 defaultFacets 与 package.json#chord.facets 的覆盖规则：约定文件存在才纳入；false 关掉约定；配置的路径必须存在且不能逃出包目录。"
tags: [pi, chord]
---
源码：`packages/chord/src/node/package.ts`  
被谁调用：`bundleFacetPackage`。

## 本课目标

能解释 `defaultFacets` 与 `package.json#chord.facets` 的覆盖规则：约定文件存在才纳入；`false` 关掉约定；配置的路径必须存在且不能逃出包目录。

## 在系统中的位置

```text
bundleFacetPackage({ packagePath, outdir, defaultFacets? })
  readFacetPackageMetadata
  resolveFacetEntries
  bundleFacets({ plugin: { id: name, version }, entries, external: peers+chord.external 及其 /* })
```

宿主（Pi）传入 `defaultFacets: { worker: "src/worker.ts", presentation: "src/presentation.ts" }` 这类约定。插件可以在 `chord.facets` 里改路径或禁用。

## `readFacetPackageMetadata`

`packagePath` 可以是目录或 `package.json` 文件。`realpath` 后读 JSON。必须有非空 `name`、`version`。

`peerDependencies`：键排序后当 external。非法对象抛。

`chord` 配置只允许 `facets` / `external` / `sourceMap`。未知字段抛。缺省：`sourceMap: true`，空 facets，空 external。

`chord.facets`：值是相对路径字符串或 `false`。空名、空路径非法。

## `resolveFacetEntries`

1. 对每个 default：相对包目录解析，禁止绝对路径、禁止 `..` 逃出。`stat` ENOENT → 跳过（约定文件不存在就没有这个 entry）。不是文件抛。`realpath` 后再查一次没有逃出（防 symlink 出包）。
2. 对每个 configured：`false` → `delete entries[name]`。否则路径必须存在且是文件，覆盖 default。
3. 一个 entry 都没有 → `has no configured or conventional facet entries`。

## external 展开

每个 peer 和 `chord.external` 项变成 `specifier` 和 `specifier/*`，再交给 bundleFacets（那里还会无条件加 Chord）。

## 失败与边界

- 不执行 `prepublishOnly`、不装依赖。
- symlink 出包：`validateCanonicalPackageEntry` 挡住。
- `chord.facets.worker: "./src/x.ts"` 指向不存在 → 抛，不会静默跳过（和 default 的 ENOENT 跳过不同）。配置是显式的，写了就必须在。
- package name 当 plugin.id。scoped 名 `@example/foo` 合法。

## 下一课

[24-node.bundle-loader.ts.md](/series/pi-source/chord/357-node-bundle-loader-ts/)：完整性校验、vm 编译、artifact 运输。Chord 最后一课。
