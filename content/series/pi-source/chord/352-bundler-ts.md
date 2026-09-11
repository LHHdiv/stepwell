---
title: "19 · bundler.ts — Node 打包子路径入口"
summary: "知道这条入口会拉进 esbuild。主运行时 import \"@earendil-works/chord\" 不会执行到这里。"
tags: [pi, chord]
---
源码：`packages/chord/src/bundler.ts`（9 行）  
出口：`@earendil-works/chord/bundler`

## 本课目标

知道这条入口会拉进 esbuild。主运行时 `import "@earendil-works/chord"` 不会执行到这里。

## 在系统中的位置

```text
bundleFacetPackage(options)   ← 从 package.json 读约定
  bundleFacets(options)       ← 已有 id 和 entry map
```

coding-agent experimental 的 `plugins/package.ts` 走 `bundleFacetPackage`。测试和自定义宿主若已经解析好 entry，走 `bundleFacets`。

## 导出

类型：`BundleFacetsOptions`、`BundleFacetsResult`、`FacetBundlePlatform`、`FacetBundleEntry`、`FacetBundleManifest`、`BundleFacetPackageOptions`、`BundleFacetPackageResult`。

函数：`bundleFacets`、`bundleFacetPackage`。

清单类型从 `node/manifest.ts` 再导出一份，方便只依赖 `/bundler` 的调用方不必再 import `/node`。

## 失败与边界

无自身逻辑。失败全在 `node/bundle.ts` / `node/package.ts`。

## 下一课

[20-node.ts.md](/series/pi-source/chord/353-node-ts/)：加载侧对称的入口。
