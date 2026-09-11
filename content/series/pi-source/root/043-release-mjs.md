---
title: "39 · release.mjs — 从干净 main 走到推送 tag"
summary: "把文件头的 10 步当成状态机来读。任何一步 run() 失败都 process.exit(1)，可能停在「版本已 bump、changelog 已改、tag 还没打」的中间态。这是维护者要会手工恢复的脚本，不是给 agent 随手跑的"
tags: [pi, root]
---
源码：`scripts/release.mjs`  
被谁调用：`npm run release:patch|minor|major`，或 `node scripts/release.mjs 0.86.0`。AGENTS.md 说发版要 load `.pi/skills/release.md`，那份 skill 会跑到这里。

## 本课目标

把文件头的 10 步当成状态机来读。任何一步 `run()` 失败都 `process.exit(1)`，可能停在「版本已 bump、changelog 已改、tag 还没打」的中间态。这是维护者要会手工恢复的脚本，不是给 agent 随手跑的。

## 在仓库中的位置

```text
1  git status --porcelain 必须空
2  npm view 每个公开包，404 则拒绝（新包要先手动注册）
3  bumpOrSetVersion: version:* 或 npm version x.y.z + sync-versions
   removeStaleWorkspaceLockEntries
   npm install --package-lock-only && npm ci --ignore-scripts
4  所有 CHANGELOG.md: ## [Unreleased] → ## [version] - YYYY-MM-DD
5  generate:models, check:model-data, shrinkwrap, install-lock
6  check, build:offline, ./test.sh, check:package-install
7  git add 所有已跟踪变更；commit "Release vX"；tag vX
8  在 # Changelog 后插入新的 ## [Unreleased]
9  再 commit "Add [Unreleased] section for next cycle"
10 git push origin main 以及 tag
```

tag 推上去之后：`build-binaries.yml`、publish CI、announcement 才会动。本脚本**自己不 npm publish**。

## 文件做什么

### 显式版本

`compareVersions` 三段数字。显式 version 必须 **大于** 当前 `packages/ai/package.json` 的 version，防止打回退 tag。当前版本以 ai 包为准（锁步下等同其它公开包）。

### 陈旧 lock 条目

`npm version` 可能在 sync-versions 改 `^` 之前，把旧版本的内部包装进 lock 的 `packages/*/node_modules/@earendil-works/...`。`removeStaleWorkspaceLockEntries` 删掉那些 version 对不上的非 link 条目，再 `package-lock-only` 重生。没有这步，lockfile 会留下幽灵版本，shrinkwrap 可能解析错。

### changelog 替换

简单字符串替换第一个 `## [Unreleased]`。若有人在 Unreleased 里写了错误标题，或文件没有该节，就 skip。**不要**在非 main 的功能分支跑本脚本：AGENTS.md 禁止在非 main 写 changelog，而本脚本会把 Unreleased 封成版本节。

日期用 `toISOString().split("T")[0]`，是 UTC 日期，和本地日历可能差一天。

### `stageChangedFiles`

`git ls-files -m -o -d --exclude-standard` 再 `git add --` 每条。这比 `git add -A` 仍会加入**所有**未忽略的未跟踪文件。发版过程中 `generate:models` 可能改动 `models.generated.ts` 和一堆 data JSON（data 被 gitignore，不会加进去）。意外的未跟踪源码也会被加进 Release commit——所以步骤 1 要求干净树：发版开始后新产生的应只有脚本自己写的那些。

`shellQuote` 用单引号包路径，防空格。

## 关键逻辑

失败会怎样：

- 步骤 3 后失败：工作树版本号已变，没有 tag。恢复：reset 到发版前，或修好再从步骤 5 手工继续（不要再 bump）
- 步骤 7 后、10 前失败：本地有两个 commit 和一个 tag，remote 没有。可以再 push
- 步骤 10 只成功了 main 没成功 tag：CI 可能不建二进制。补 `git push origin vX`
- 公开包未注册：步骤 2 拦住，避免 bump 后才发现不能 publish
- 在脏树跑：步骤 1 退，保护并行 agent 的未提交工作（AGENTS.md Git 节）

`run(..., { ignoreError: true })` 存在但主流程没用它忽略关键命令。`getVersion` 失败会炸。

## 和启动链的关系

无。它启动的是 git/npm 子进程。成功后用户的启动链会在数分钟到数小时后（npm 传播、announcement 等到 registry）换成新版本。

## 下一课

GitHub Release 说明从 changelog 来：[40-release-notes.mjs.md](/series/pi-source/root/044-release-notes-mjs/)。
