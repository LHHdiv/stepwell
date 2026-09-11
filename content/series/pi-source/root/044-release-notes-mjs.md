---
title: "40 · release-notes.mjs — changelog 变成 GitHub Release 正文"
summary: "changelog 里的链接是相对 packages/coding-agent/ 写的（x）。GitHub Release 正文没有这个 base path，相对链接会 404。本脚本把它们改成 https://github.com/e"
tags: [pi, root]
---
源码：`scripts/release-notes.mjs`  
被谁调用：`npm run release:fix-links` → `fix-github-releases`；二进制 workflow 在创建 GitHub Release 时通常 `extract` 出某一版的笔记（以 yml 为准）。两条子命令：`extract` 和 `fix-github-releases`。

## 本课目标

changelog 里的链接是相对 `packages/coding-agent/` 写的（`[x](docs/foo.md)`）。GitHub Release 正文没有这个 base path，相对链接会 404。本脚本把它们改成 `https://github.com/earendil-works/pi/blob/vX.Y.Z/packages/coding-agent/docs/foo.md`，并把历史 `badlogic/pi-mono` URL 改到当前 repo，把 `blob/main/` 钉成当时的 tag——否则以后 main 上删文件，旧 Release 笔记全坏。

## 在仓库中的位置

```text
extract --version 0.85.1 [--changelog --out --repo --base-path --tag]
  从 CHANGELOG 取出 ## [0.85.1] 节
  normalizeReleaseNoteLinks(..., tag)

fix-github-releases [--tag --since-tag v0.74.0 --dry-run]
  gh api 列出 releases
  对 >= since-tag 的每一条 body 做同样 normalize
  gh release edit --notes-file
```

默认 changelog：`packages/coding-agent/CHANGELOG.md`。其它包的 changelog 不进 GitHub Release 主文——Release 是给 CLI 用户看的。

## 文件做什么

### 抽节

标题正则 `## [version]` 可选 `- YYYY-MM-DD`。一直读到下一个 `## [`。没有该节则输出一行 `Release ${version}`，不失败——空笔记总比 workflow 挂掉好。

### 改写链接

`INLINE_MARKDOWN_LINK_RE` 只处理 `[text](url)` 和图片。`normalizeLinkTarget`：

- 旧 org/repo 前缀替换
- `blob|tree` + `main|master` 换成当前 tag
- 已有 scheme、`//`、纯 hash 不改
- 相对路径用 `basePath` join，逃出仓库（`../`）则放弃改写
- 目录（原 path 以 `/` 结尾或 basename 无点）走 `tree/`，文件走 `blob/`
- `encodeURI` 路径，保留 query 和 fragment

`fix-github-releases` 把 notes 写到临时文件再 `gh release edit`，避免命令行长度和引号问题（AGENTS.md 对 gh comment 也要求 `--body-file`）。

`--since-tag` 默认 `v0.74.0`：更老的历史可能格式不同或 repo 迁移前的笔记，默认不批量改。`--dry-run` 只打印 would update。

## 关键逻辑

失败会怎样：

- 无 `gh` 认证：list/edit 失败
- 改写逻辑把该相对的链接改错：用户点 Release 笔记 404。dry-run 先看
- extract 时 changelog 日期格式不标准导致正则不匹配：得到空的 fallback 一行，Release 看起来像没写 notes
- 并发 edit 同一 release：后写覆盖。fix 脚本是维护工具，不是热路径

## 和启动链的关系

无。只影响 GitHub UI 上的发行说明。`pi --version` 不读它。

## 下一课

npm 齐了之后改 pi.dev 的 latest 指针：[41-publish-release-announcement.mjs.md](/series/pi-source/root/045-publish-release-announcement-mjs/)。
