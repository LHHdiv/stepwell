---
title: "20 · package-workspaces.mjs — 找出所有工作区目录"
summary: "看懂这 20 行递归：什么叫「一个包」、为什么必须跳过 dist 和 nodemodules、以及它和根 package.json 的 workspaces glob 不是同一份名单。发版脚本用的是「磁盘上有 package.json "
tags: [pi, root]
---
源码：`scripts/package-workspaces.mjs`  
被谁调用：`sync-versions.js`、`release-packages.mjs`（再被 publish / release / consumer / check-runtime-deps 间接调用）。自己不是 npm script。

## 本课目标

看懂这 20 行递归：什么叫「一个包」、为什么必须跳过 `dist` 和 `node_modules`、以及它和根 `package.json` 的 `workspaces` glob **不是同一份名单**。发版脚本用的是「磁盘上有 package.json 的目录」，不是 npm 的 workspace 配置。

## 在仓库中的位置

```text
findPackageDirectories(root = "packages")
  若 directory/package.json 存在 → 收入
  再递归子目录，跳过 dist / node_modules
  返回 sort() 后的路径数组
```

默认根是 `"packages"`，相对 **process.cwd()**。所以调用方必须在仓库根执行。`sync-versions.js` 允许 `process.argv[2]` 改这个根，测试里才会把临时目录传进去。

## 文件做什么

`SKIPPED_DIRECTORIES = dist, node_modules`。若递归进 `node_modules`，会把每一个依赖的 package.json 都当成「工作区包」，`sync-versions` 会试图改 lodash 的版本。若递归进 `dist`，有人把编译产物里的 package.json 当成包，发版名单会脏。

遇到 package.json 仍继续往下访子目录。因此 `packages/session-backends/sqlite-node` 和 `packages/coding-agent/examples/extensions/with-deps` 都会被找到——只要它们有 package.json。`packages/coding-agent/install-lock` 也会被找到；`sync-versions.js` 再按路径后缀把它滤掉。

返回值排序，保证 changelog 更新、日志输出稳定。

## 关键逻辑

为什么不直接读根 `workspaces` 字段？因为 glob `packages/*` 不会列出 `packages/session-backends/sqlite-node`，而发版必须包含它。扫描磁盘比维护第二份名单更不容易漏。代价是：一个偶然的 `package.json`（例如 example 里的 fixture）也会进名单。`release-packages.mjs` 用 `private !== true` 再滤一层。

失败会怎样：

- cwd 不在仓库根 → 找不到 `packages/`，`readdirSync` throw，发版脚本第一句就死
- 有人在 `packages/foo/tmp/package.json` 留下垃圾 → 可能被当成公开包（若没标 private）尝试 publish
- 把 `install-lock` 标成非 private → sync-versions 和 publish 都会碰到这份生成物

## 和启动链的关系

无。纯发版/检查基础设施。产品 CLI 不 import 它。

## 下一课

在这份名单上滤公开包：[21-release-packages.mjs.md](/series/pi-source/root/025-release-packages-mjs/)。
