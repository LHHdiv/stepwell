---
title: "21 · release-packages.mjs — 哪些包真的会发到 npm"
summary: "记住过滤条件只有一句：pkg.private !== true。evals、example 扩展、install-lock 都是 private，不会被 publish。漏标 private 等于授权发版脚本把它推上 npm。"
tags: [pi, root]
---
源码：`scripts/release-packages.mjs`  
被谁调用：`publish.mjs`、`release.mjs`（检查 npm 是否已注册）、`coding-agent-consumer.mjs`（pack 所有公开包）、`check-runtime-deps.mjs`（只扫公开包的 src）、`publish-release-announcement.mjs`（等这些包在 registry 上可下载）。

## 本课目标

记住过滤条件只有一句：`pkg.private !== true`。`evals`、example 扩展、`install-lock` 都是 private，不会被 publish。漏标 `private` 等于授权发版脚本把它推上 npm。

## 在仓库中的位置

```text
getPublicWorkspacePackages()
  findPackageDirectories()
  读每个 package.json
  filter private !== true
  map → { directory, name, version }
```

返回值丢掉其余字段，调用方拿不到 `dependencies`。需要完整 manifest 的脚本（shrinkwrap）自己读 `packages/coding-agent/package.json`。

## 文件做什么

对每个目录 `JSON.parse` 整份 package.json，展开进对象后再滤。`private` 缺省视为公开（npm 默认如此）。新包如果只写了 `name`/`version` 忘了 `"private": true`，会进入 publish 名单。

`directory` 是相对路径如 `packages/ai`，后续 `cwd: pkg.directory` 的 `npm publish` 依赖这一点。

## 关键逻辑

锁步发版的前提是这份名单上所有 `version` 相同。`publish.mjs` 会断言 `Set(versions).size === 1`。`release.mjs` 在 bump 前用 `npm view` 确认每个名字已经在 npm 上注册过——新包必须先手动发一次，不能靠 release 脚本做 first publish（first publish 还涉及 npm 组织权限）。

失败会怎样：

- evals 忘了 private → 发一个没人要用的 `@earendil-works/pi-evals`，或因缺 files 字段发空包
- 公开包从名单里消失（改名目录但 package.json 坏了）→ 那一包漏发，用户 `npm i pi-coding-agent` 可能装到新 CLI + 旧 `pi-ai` 范围依赖……不过 shrinkwrap 会把内部包钉到同版本；仍会让独立 `npm i pi-ai` 的用户落后
- JSON 语法错误 → 整条发版链 parse 失败，此时版本可能已经 bump（若在 release.mjs 后半段）——所以 release 把「读名单」放在 bump 之后也有风险；注册检查在 bump 前，pack 在 bump 后

## 和启动链的关系

无。决定的是「npm 上存在哪些 Pi 包」，不是进程从哪进。

## 下一课

锁步版本如何写回各包依赖：[22-sync-versions.js.md](/series/pi-source/root/026-sync-versions-js/)。
