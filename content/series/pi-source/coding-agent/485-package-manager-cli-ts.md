---
title: "15 · package-manager-cli.ts — install / update / list / config"
summary: "看一条没有 Agent、没有 TUI 聊天的命令路径如何改 settings.json、如何自更新 Pi。跟执行链用 -p 时走 print-mode；跟 pi install npm:@foo/bar 时走本文件。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/package-manager-cli.ts`（约 1100 行）  
被谁调用：`main.ts` 在进 Runtime 之前 `handleConfigCommand(args)` / `handlePackageCommand(args)`。返回 `true` 表示这条 argv 已处理完，`main` 不再创建会话。

## 本课目标

看一条**没有 Agent、没有 TUI 聊天**的命令路径如何改 `settings.json`、如何自更新 Pi。跟执行链用 `-p` 时走 print-mode；跟 `pi install npm:@foo/bar` 时走本文件。

## 在系统中的位置

```text
main(argv)
  handleConfigCommand ? → selectConfig TUI → process.exit(0)
  handlePackageCommand ?
    install/remove → DefaultPackageManager.installAndPersist / removeAndPersist
    list           → 打印 user/project 两段
    update --models → ModelRuntime.refresh
    update --self   → npm/pnpm 或 managed-install 换版本
    update --extensions → packageManager.update
```

业务实现在 `core/package-manager.ts`。本文件是 CLI 皮：解析、信任、进度、自更新策略。

## 命令解析 `parsePackageCommand`

识别 `install | remove | uninstall | update | list`。`uninstall` 是 `remove` 的别名。其它 argv 返回 `undefined`，让 `main` 继续。

update 的目标是互斥组合：

| argv | `UpdateTarget` |
|---|---|
| `update`（无参数） | `{ type: "self" }`，并 `showExtensionsSkippedNote` |
| `update --self` / `update pi` | self |
| `update --extensions` | 全部已装包 |
| `update --extension <src>` 或位置参数 source | 单个包 |
| `update --models` | 只刷模型目录 |
| `update --all` 或 `--self --extensions` | self + extensions |

`--all` 不能和 `--self` / `--models` / 位置 source 混用。冲突写进 `conflictingOptions`，执行前打印红字、exitCode=1。

`-l/--local` 只对 install/remove 合法。`--approve` / `--no-approve` 覆盖项目信任。`--force` 只对 update 的 self 有意义。

## 项目信任 `createCommandSettingsManager`

包命令会读写 `settings.json`（用户级或项目级）。项目级必须先信任：

- `update` 只用**已保存**的信任（`useSavedProjectTrustOnly`），避免 `pi update` 突然弹信任对话框。
- install/remove/config 在 TTY 时走完整 `resolveProjectTrusted`，可以弹 UI。
- `-l` 且项目未信任：红字「Use --approve」，不改文件。

## `handleConfigCommand`

打开 `cli/config-selector.ts` 的资源开关 TUI（extensions/skills/prompts/themes 启用与否）。Tab 在 global / project 之间切。结束 `process.exit(0)`，连 `exitCode` 都不经过 `main` 的后半。

## `handlePackageCommand` 四条

### install / remove

`packageManager.installAndPersist(source, { local })`。source 形如 `npm:@foo/bar`、`git:github.com/user/repo`、本地路径。进度回调把 `start` 事件 dim 打到 stdout。

remove 找不到包：红字 + exitCode=1，仍返回 `true`（argv 已消费）。

### list

按 user / project 两段打印。`filtered` 的包加 `(filtered)`。没有包则 dim「No packages installed.」

### update --models

`ModelRuntime.create` + `refresh({ allowNetwork: true, force: true })`，15 秒 abort。这是「刷新模型目录」不是「下载权重」。

### update --self

1. `getLatestPiRelease` 问安装器 API。版本不新且没 `--force`：绿字 already up to date。
2. **managed install**（`PI_MANAGED_INSTALL_ROOT` 指向带 `managed-install.json` 的 releases-v1 布局）：`runManagedSelfUpdate`。锁 `update/`，下载该版本的 `package.json`/`package-lock.json`，`npm ci --ignore-scripts`，smoke test `pi --version`，再 `rename` 进 `releases/<ver>`，写 `current-version`。`--force` 在 managed 上直接拒绝。
3. 普通 npm/pnpm：`getSelfUpdateCommand` 拼出升级命令，Windows 上先 `quarantineWindowsNativeDependencies`（原生 `.node` 被占用导致 npm 删不掉），再 `spawnProcess` inherit stdio。pnpm 失败时提示 `pnpm store prune`。

`getActiveManagedInstallRoot` 有一道防误判：当前包路径必须落在 managed 的 `releases/` 下。从 managed Pi 再启动一份源码 checkout，不会被当成 managed。

## 失败与边界

- 返回值是 `boolean`（是否已处理），真正成败靠 `process.exitCode`。`main` 看到 `true` 就 return，不再 `createAgentSession`。
- stdout 进度和 TUI 抢终端：config 命令是真 TUI；install 只 `process.stdout.write`。
- self-update 成功后**当前进程仍是旧二进制**。下一跳 `pi` 才是新版本。managed 布局靠 launcher 读 `current-version`。

## 下一课

[16-modes.index.ts.md](/series/pi-source/coding-agent/487-modes-index-ts/) — 四种皮的汇总出口。
