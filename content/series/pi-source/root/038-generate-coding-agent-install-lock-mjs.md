---
title: "34 · generate-coding-agent-install-lock.mjs — `pi update` 用的独立 lock 根"
summary: "和 33 课 shrinkwrap 对比：shrinkwrap 塞进 CLI 包内部，给 npm i coding-agent 钉传递依赖。install-lock 是 另一个假包 @earendil-works/pi-coding-a"
tags: [pi, root]
---
源码：`scripts/generate-coding-agent-install-lock.mjs`  
被谁调用：`npm run install-lock:coding-agent` / `check:install-lock:coding-agent`；`release.mjs` 重生；`publish-release-announcement.mjs` 把生成的 `package.json` + `package-lock.json` 上传到对象存储，供安装器和 `pi update --self` 使用。

## 本课目标

和 33 课 shrinkwrap 对比：shrinkwrap **塞进 CLI 包内部**，给 `npm i coding-agent` 钉传递依赖。install-lock 是 **另一个假包** `@earendil-works/pi-coding-agent-install`，目录 `packages/coding-agent/install-lock/`，只有一份依赖：精确版本的 coding-agent。安装器对这个根跑 `npm ci`，得到和发版时相同的整棵树，包括平台 optional。

## 在仓库中的位置

```text
createInstallerPackageJson(codingAgentPackage)
  name: @earendil-works/pi-coding-agent-install
  private: true
  dependencies: { "@earendil-works/pi-coding-agent": "<exact version>" }
  拷贝 overrides、engines

BFS 与 shrinkwrap 几乎同一套
  起点是 installer 的 dependencies（即 CLI 包）
validateGeneratedFiles() 额外检查:
  lockfileVersion 3
  根依赖与 package.json 一致
  内部包 version === installer version
  精确 semver 的依赖边必须解析到同一 version
  lifecycle 白名单（与 shrinkwrap 同一张表）
  必须有平台 optional 条目
```

`--check` 对比磁盘上两份文件的精确字节。

## 文件做什么

生成逻辑大量复制 shrinkwrap 脚本（copyLockEntry、resolveExternalDependency、同一白名单）。差异点：

- 输出两份文件，不是一份 shrinkwrap
- 根条目是 installer 包，不是 CLI 包
- `isExactVersionSpec`：installer 对 CLI 写的是精确版本，校验解析结果必须等于该版本——防止 lock 里飘到另一个 coding-agent
- 内部包版本必须等于 installer 版本（锁步）
- `sync-versions.js` 排除这个目录，避免把 CLI 依赖改成 `^`

R2/S3 上的路径由 announcement 脚本写成 `installer/v1/releases/<version>/package.json` 和 `package-lock.json`，`installer/v1/latest.json` 是可变指针。

## 关键逻辑

为什么不复用 shrinkwrap 文件？npm shrinkwrap 跟着被安装的那个包走；全局安装器和自更新需要 **在尚未安装 CLI 之前** 就有一份完整 lock 来 `npm ci --ignore-scripts`。假根包提供这个锚点。

失败会怎样：

- 与 shrinkwrap 白名单不同步：两份脚本各维护一份 Map，加 lifecycle 包必须改两处。漏一处则对应 `--check` 红
- 生成物未提交 → check 红
- latest 指针在 announcement 里用 ETag 条件写，本脚本不碰网络
- 有人把 install-lock 的 private 去掉 → 21 课的公开包名单会包含它，publish 可能试图发一个无意义包

## 和启动链的关系

只在安装 / 自更新链上。已安装的 `pi` 日常启动不读这个目录。`pi update --self` 会按文档用 `--ignore-scripts` 和这份 lock 对齐树。

## 下一课

把 JS 变成各平台可执行文件：[35-build-binaries.sh.md](/series/pi-source/root/039-build-binaries-sh/)。
