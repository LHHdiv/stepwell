---
title: "99 · utils/changelog.ts — 解析包内 CHANGELOG"
summary: "parseChangelog(path) 按 ## [x.y.z] 切开。compareVersions、getNewEntries(entries, lastVersion) 给启动「What's New」：只显示比上次运行新的段。n"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/changelog.ts`

`parseChangelog(path)` 按 `## [x.y.z]` 切开。`compareVersions`、`getNewEntries(entries, lastVersion)` 给启动「What's New」：只显示比上次运行新的段。`normalizeChangelogLinks` 把相对链接换成 GitHub 绝对 URL。`getChangelogPath` 指向包内文件。

InteractiveMode 对续写会话跳过 changelog（避免每次 resume 刷更新说明）。

## 下一课

[100-utils.version-check.ts.md](/series/pi-source/coding-agent/655-utils-version-check-ts/)
