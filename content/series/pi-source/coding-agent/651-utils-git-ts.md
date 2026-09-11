---
title: "98 · utils/git.ts — 解析 git 包源"
summary: "parseGitUrl(source) 识别 git:、github:、https://github.com/...、git@host:path、ssh://。返回 { host, path, ref } 或 null。给自动补全 so"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/git.ts`

`parseGitUrl(source)` 识别 `git:`、`github:`、`https://github.com/...`、`git@host:path`、`ssh://`。返回 `{ host, path, ref }` 或 null。给自动补全 source tag（`p:git:github.com/user/repo@ref`）和 package-manager 用。

不是 `git` 命令封装。footer 的分支名在 `FooterDataProvider`（core），用自己的 git 调用。

## 下一课

[99-utils.changelog.ts.md](/series/pi-source/coding-agent/653-utils-changelog-ts/)
