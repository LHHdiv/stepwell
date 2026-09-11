---
title: "82 · package-manager.ts — npm/git 技能包"
summary: "settings packages[] 里的字符串或过滤对象 → 本地安装路径上的 extensions/skills/prompts/themes。本课按职责读，不必一行行背 npm spawn。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/package-manager.ts`（约 2700 行）  
被谁调用：`DefaultResourceLoader.reload` 的 `resolve()`；`pi config`；`/reload` 装缺失包。

## 本课目标

settings `packages[]` 里的字符串或过滤对象 → 本地安装路径上的 extensions/skills/prompts/themes。本课按职责读，不必一行行背 npm spawn。

## `PackageSource`

字符串 = 装整个包且 autoload 全资源。对象可 `autoload: false` 再显式 `extensions/skills/prompts/themes` glob。scope：user 装到 agentDir 下的包根，project 装到 `cwd/.pi` 相关目录。

源类型：npm 名（可带版本）、git URL（`parseGitUrl`）、本地路径。

## `resolve(onMissing?)`

扫配置 → 已安装则收集 `package.json` 的 `pi` manifest 和约定目录 → 未安装调用 `onMissing(source)` 得 `install | skip | error`。交互会问；print 通常 skip 或 error。`PI_OFFLINE` 不联网装。

返回 `ResolvedPaths`：每条带 `enabled`（config 选择器可关）和 `PathMetadata`（source/scope/origin）。

## `install` / `update` / `remove`

npm：`settings.npmCommand` 或默认 npm，timeout 10s 查 registry，并发限制。git：clone/pull，并发 4。进度 `ProgressCallback` 给 TUI。`installAndPersist` 同时改 settings.json。

`getExtensionTempFolder`：解压/构建中转，装完再移到最终路径。Linux 空 `process.env` 时从 `/proc/self/environ` 补（某些包装启动器）。

## 失败与边界

项目包是否 resolve 仍受信任：未信任时 SettingsManager 项目 packages 为空，loader 看不到它们。恶意包等于在用户权限下执行 postinstall——信任门是主防御。semver 用 `maxSatisfying`。stdout 被 TUI takeover 时 npm 输出改道（`isStdoutTakenOver`）。

## 下一课

[83-bash-executor.ts.md](/series/pi-source/coding-agent/620-bash-executor-ts/)：用户 `!` 命令，不是 bash 工具。
