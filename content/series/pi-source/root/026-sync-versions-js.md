---
title: "22 · sync-versions.js — 锁步版本与内部 ^ 依赖"
summary: "分清两步：先断言所有非 private 包版本相同，再把每个工作区 package.json 里对内部包的依赖写成 ^<当前版本>。private 包（evals）也要被同步依赖范围，但不参与锁步断言——evals 可以是 9.9.9。"
tags: [pi, root]
---
源码：`scripts/sync-versions.js`  
被谁调用：`npm run version:patch|minor|major` 在 `npm version --workspaces` 之后；`release.mjs` 走显式 `x.y.z` 时同样调用。`npm run test:scripts` 跑旁边的 `sync-versions.test.mjs`。

## 本课目标

分清两步：先**断言**所有非 private 包版本相同，再把每个工作区 package.json 里对内部包的依赖写成 `^<当前版本>`。private 包（evals）也要被同步依赖范围，但**不参与**锁步断言——evals 可以是 `9.9.9`。

## 在仓库中的位置

```text
npm run version:patch
  npm version patch --workspaces --no-git-tag-version --no-workspaces-update
  node scripts/sync-versions.js
  npm install --package-lock-only --ignore-scripts
```

`--no-workspaces-update` 让 npm 不要自作主张改依赖范围；改范围是本脚本的工作。`--no-git-tag-version` 不打 tag，tag 留给 `release.mjs`。

## 文件做什么

1. `findPackageDirectories`，去掉路径以 `coding-agent/install-lock` 结尾的生成包。
2. 打印所有公开包版本。`Set(versions).size > 1` 则 exit 1，提示去跑 `version:*`。这能抓住「有人手改了某一个 package.json 的 version」。
3. 对每个包的 `dependencies` 和 `devDependencies`（不管 private）：若依赖名在 `versionMap` 里，写成 `^${version}`。已经相同则跳过。
4. **不改** `npm:@earendil-works/pi-ai@0.1.2` 这种 registry alias——`versionMap.get(dependencyName)` 用的是左边的名字（例如 `@mariozechner/pi-ai`），alias 名不在 map 里，不会被 bump。测试专门锁了这条：否则会把 alias 指到尚未发布的新版本，安装失败。
5. 写回时 `JSON.stringify(..., null, "\t")` + 尾换行，和仓库 biome/手工 JSON 风格接近。

不处理 `peerDependencies` / `optionalDependencies`。内部包目前走普通 dependencies。

## 关键逻辑

公开包锁步：用户 `npm i @earendil-works/pi-coding-agent@0.85.1` 时，shrinkwrap / 内部 `^0.85.1` 会对齐同一套 agent-core / pi-ai。若 ai 是 0.85.0、coding-agent 是 0.85.1，类型和运行时钩子可能对不上。

`^` 而不是精确版本：workspace 内部允许范围，外部禁止。运行时用户装 CLI 时靠 shrinkwrap 把传递依赖钉死；开发时 workspace 协议会把 `^` 链到本地包。

失败会怎样：

- 锁步失败 exit 1：`version:*` 中断，lockfile 可能已部分更新或未更新，工作树脏。`release.mjs` 要求开始时 working tree clean，所以这发生在 release 内部时会让后续 commit 包含半成品——`release.mjs` 在 bump 后还有 `removeStaleWorkspaceLockEntries` 补救
- 误改 alias：测试红。没有测试时，evals 这类兼容旧包名的依赖会指向 registry 上不存在的版本
- 改了 install-lock：生成器下一轮会覆盖，但中间 check 可能乱。所以路径排除是必须的

## 和启动链的关系

无。改的是各包 package.json 字符串，不影响当前 `node_modules` 直到下一次 install。

## 测试

`sync-versions.test.mjs` 建临时 `packages/{ai,coding-agent,evals,coding-agent/install-lock}`：

- 同步后 evals 对 coding-agent 变成 `^2.0.0`
- `@mariozechner/pi-ai` 的 npm alias 保持原样
- install-lock 的依赖保持 `^1.0.0` 未被碰
- 再把 ai 改成 3.0.0，脚本必须以状态码 1 退出（锁步破坏）

这是发版机械臂里少数有单测的齿轮，因为失败会直接把错误版本推上 npm。

## 下一课

提交闸门的第一道：lockfile：[23-check-lockfile-commit.mjs.md](/series/pi-source/root/027-check-lockfile-commit-mjs/)。
