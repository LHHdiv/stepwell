---
title: "23 · check-lockfile-commit.mjs — 挡住「顺手提交的 lockfile」"
summary: "理解三态：没 stage lockfile → 过；PIALLOWLOCKFILECHANGE=1 → 过；lockfile 只改了 packages/ 工作区元数据 → 过；其它（加/删/改 nodemodules 条目）→ 拒，并打"
tags: [pi, root]
---
源码：`scripts/check-lockfile-commit.mjs`  
被谁调用：`.husky/pre-commit` 的第一句，在 `npm run check` **之前**。不在 `package.json` 的 `check` 脚本里——CI 默认不跑它，因为 CI 不 commit。

## 本课目标

理解三态：没 stage lockfile → 过；`PI_ALLOW_LOCKFILE_CHANGE=1` → 过；lockfile 只改了 `packages/` 工作区元数据 → 过；其它（加/删/改 node_modules 条目）→ 拒，并打印最多 40 条包变化。这是 README「把依赖变更当代码审」的机械执行。

## 在仓库中的位置

```text
git commit
  husky pre-commit
    node scripts/check-lockfile-commit.mjs     ← 本课
    npm run check
    若 staged 含 packages/ai 等，再 check:browser-smoke
    git add 原先 staged 的路径（biome --write 可能改过）
```

## 文件做什么

### 读哪两份 lockfile

- `HEAD:package-lock.json`：上一次提交
- `:package-lock.json`：index 里即将提交的版本（注意是 staged，不是工作区未 add 的）

用 `git show` + JSON.parse。缺文件则 `changes === undefined`，后面走「有 stage 但看不懂 diff」的拒绝路径（除非 env 放行）。

### 放行条件

1. staged 文件名列表里没有 `package-lock.json` → `exit 0`。只改源码的日常 commit 零成本。
2. `PI_ALLOW_LOCKFILE_CHANGE` 为 `1` / `true` / `yes` → 打印一句允许，`exit 0`。AGENTS.md 说不要绕，除非用户就要提交 lockfile。
3. 所有变化的 lock 路径都以 `packages/` 开头（工作区包自己的元数据，例如 version 字段）→ 放行。`npm version --workspaces` 会动这些，不应每次 bump 都要 env。

否则拒绝，并 `summarizeLockfileChange`：只摘要 `node_modules/` 路径的 added / removed / version changed。工作区路径的噪音不列。超过 40 条截断。

拒绝时的提示包括：确认每个新包是故意的、年龄门当时是否生效、有无新 lifecycle 脚本、是否要重生 shrinkwrap。这是 checklist，脚本并不自动跑 shrinkwrap——那是 `npm run check` 下一步的 `--check` 模式。

## 关键逻辑

为什么不放进 `npm run check`？check 在 CI 上跑，工作树的 lockfile 相对 HEAD 的 diff 在 PR 里是**应该存在**的（如果 PR 就是 bump 依赖）。闸门只应在 **commit 那一瞬间**问「你是不是又把 npm install 的噪声加进来了」。CI 用 `npm ci` 验证 lock 可还原，是另一件事。

失败会怎样：

- 开发者 `npm i` 试了某个包，忘了还原 lockfile 就 `git add -A`（已被 AGENTS.md 禁止）→ 本脚本是最后防线
- 合法 bump 但忘了设 env，且改动不止 workspace 元数据 → commit 被拒。正确做法：`PI_ALLOW_LOCKFILE_CHANGE=1 git commit ...` 并且在 PR 里写清依赖理由
- 只改 lockfile 的 `packages/coding-agent` 版本 → 放行。若攻击者把恶意包放进 `packages/` 伪装成工作区：那是源码审查问题，不在本脚本范围
- `git show HEAD:package-lock.json` 在没有第一次 lockfile 的仓库失败：`before` 为 undefined，走拒绝（除非 env）——新仓库 bootstrap 需要 env

## 和启动链的关系

无。失败只阻止 git commit，已运行的 `pi-test.sh` 不受影响。但一旦坏 lockfile 进了 main，`npm ci --ignore-scripts` 会把恶意/错误依赖装进 CI 和用户开发机。

## 下一课

精确版本扫描：[24-check-pinned-deps.mjs.md](/series/pi-source/root/028-check-pinned-deps-mjs/)。
