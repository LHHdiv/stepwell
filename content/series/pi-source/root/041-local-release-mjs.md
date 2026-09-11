---
title: "37 · local-release.mjs — 在仓库外演练一次发版"
summary: "看清它输出的三份「仓库外面的 pi」："
tags: [pi, root]
---
源码：`scripts/local-release.mjs`  
被谁调用：`npm run release:local`。README 供应链节点名：发版前用它在隔离目录装 npm 和 Bun。维护者按 `.pi/skills/release.md` 也会跑。

## 本课目标

看清它输出的三份「仓库外面的 pi」：

1. `tarballs/` — 各公开包 `npm pack` 的 tgz
2. `node/` — 只用 coding-agent tarball 的 npm 安装 + `pi` shim
3. `bun/` — 当前平台的 Bun compile 可执行文件（以及 `bun-install/` 里的 bun 包安装）

`--out` 必须在仓库外，防止测试安装解析到工作区 tsconfig 或 workspace 协议，出现「本地绿、用户红」。

## 在仓库中的位置

```text
node scripts/local-release.mjs [--out dir --force --skip-check --skip-test
                                --skip-install --skip-bun-install]
  断言 cwd 的 name === pi-monorepo
  始终 npm run generate:models          // 即使 skip-check
  除非 skip-check: npm run check
  每个公开包 clean + build（ai 用 build:offline，因为模型刚生成过）
  除非 skip-test: ./test.sh
  packReleasePackages
  除非 skip-install:
    build-binaries.sh --skip-install --skip-build --platform 本机
    installCodingAgentConsumer(node) + smoke + createPiShim
    可选 bun 同样再来一遍
```

包名单在脚本里硬编码（chord…coding-agent），和 `getPublicWorkspacePackages()` 应当一致。硬编码是为了 **build 顺序**；21 课的动态名单没有顺序。漏掉新公开包会导致 tarball 缺、overrides 不全。

## 文件做什么

### 输出目录

默认 `mkdtemp(tmpdir()/pi-local-release-)`。指定 `--out` 时：`resolve` 后若 `relative(repoRoot)` 不逃出仓库 → throw。已存在必须 `--force` 才会 `rmSync`。这避免 `rm -rf` 一个还含别的工作的目录。

### 始终刷新模型

注释：即使 skip-check/test，发版工件也要用刚生成、经过校验的 catalog。本地想「只看看 pack 行不行」仍会打网络拉模型。完全离线应先有 data，并改脚本——目前没有 `--offline`。

### `createPiShim`

Unix：在安装目录里 symlink `node_modules/.bin/pi`。Windows：写 `pi.cmd` / `pi.ps1` 转发。这样文档里的「到目录外跑 `./pi --help`」有一个稳定路径。

### 二进制

`currentBinaryPlatform()` 映射 `process.platform/arch`。需要 bun 在 PATH。`--skip-bun-install` 只跳过 bun 的 **包安装**，不跳过 compile；没有 bun 时 compile 也会 throw。完全不碰 bun：还要自己改，或 `--skip-install`（连 npm 隔离安装也不做，只留 tarball）。

## 关键逻辑

失败会怎样：

- 在 `packages/coding-agent` 里跑：name 不是 pi-monorepo，立刻退
- `--out ~/pi` 指到仓库里：throw。有人 `--out /tmp/foo` 忘了 force 且目录存在：throw，不覆盖
- smoke 失败：tarball 已生成，二进制可能已编好，但脚本 throw。目录还在，便于查 `node_modules`
- skip-test 后发版：你自己承担。release.mjs 正式路径不会 skip

成功时打印每一条「到仓库外执行」的命令。维护者应真的 `cd` 出去跑 `--help` 和一次 `-p`，因为脚本的 smoke 只覆盖 SDK import 和 `--version`。

## 和启动链的关系

演练的是 **用户安装后的启动链**，不是 `pi-test.sh`。若这里 `--version` 绿而 `pi-test.sh` 红，问题在源码/tsx；反过来则是 bundle/pack/files 字段问题。

## 下一课

真正推到 npm：[38-publish.mjs.md](/series/pi-source/root/042-publish-mjs/)。
