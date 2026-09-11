---
title: "14 · test.sh — 在空 HOME 里跑测试"
summary: "看懂为什么禁止直接 npm test：不是 vitest 配置不够，是 进程会继承你的 HOME、API key、~/.pi。本脚本用 env -i 从空环境重建一份最小环境，把测试关进临时目录。失败时它必须连临时目录一起删干净，又不能"
tags: [pi, root]
---
源码：`test.sh`  
被谁调用：贡献者提交前（CONTRIBUTING.md）；AGENTS.md 规定的非 e2e 入口；`scripts/release.mjs` 在 bump 之后；`scripts/local-release.mjs`（除非 `--skip-test`）。CI 的 `ci.yml` **不跑它**，CI 直接 `npm test`（runner 已是干净 VM）。

## 本课目标

看懂为什么禁止直接 `npm test`：不是 vitest 配置不够，是 **进程会继承你的 HOME、API key、`~/.pi`**。本脚本用 `env -i` 从空环境重建一份最小环境，把测试关进临时目录。失败时它必须连临时目录一起删干净，又不能误删 `/tmp`。

## 在仓库中的位置

```text
./test.sh
  mktemp $TMPDIR/pi-test.XXXXXX
  env -i HOME=... TMPDIR=... PI_NO_LOCAL_LLM=1 ... npm test
    npm run test:scripts          scripts/*.test.mjs
    npm run test --workspaces     各包 vitest / node:test
  trap cleanup EXIT               只删带 .pi-test-owned 标记的目录
```

## 文件做什么

### 隔离目录

```bash
test_root="$(mktemp -d "$temp_parent/pi-test.XXXXXX")"
mkdir -p "$test_root/home/.config" "$test_root/tmp" "$test_root/cache/npm"
touch "$test_root/.pi-test-owned" ...
```

会话、凭证、npm cache、XDG 配置全部落到这里。测试里的 `homedir()` / `~/.pi/agent` 都是这份假 HOME，不会改你的真 `auth.json`。

### cleanup 的偏执

`rm -rf -- "$test_root"` 之前要同时满足：

1. 路径匹配 `$temp_parent/pi-test.*`（防变量被改写）
2. 是目录且不是 symlink（防 symlink 到 `$HOME`）
3. 存在 `.pi-test-owned` 标记文件（证明是自己 mkdir 的）

任一失败就拒绝删除并强制把退出码变成非零。这是因为测试脚本以 root 或在奇怪 TMPDIR 下跑时，`rm -rf` 是灾难半径最大的命令。

`trap cleanup EXIT` 保证成功、失败、`set -e` 中途挂掉都会走清理。`trap - EXIT` 在 cleanup 里先拆 trap，避免递归。

### `env -i` 白名单

从零环境只放行：

| 变量 | 作用 |
|---|---|
| PATH, PWD | 找到 node/npm，工作目录仍是仓库根 |
| HOME / USERPROFILE | 假用户目录 |
| TMPDIR / TMP / TEMP | 假临时目录 |
| XDG_CONFIG_HOME / XDG_CACHE_HOME | Linux 工具别逃回 `~/.config` |
| LANG/LC_ALL=C, TZ=UTC | 快照测试不因时区漂 |
| GIT_CONFIG_NOSYSTEM + GLOBAL=/dev/null | 测试里的 git 不读你的 `~/.gitconfig`、不签真实 commit |
| GIT_ASKPASS=false 的绝对路径 | 任何 git 提问直接失败，不会在 CI 挂等 |
| NPM_CONFIG_* | npm 不读你的全局 npmrc token |
| PI_NO_LOCAL_LLM=1 | 不尝试本机 LLM |
| AWS_EC2_METADATA_DISABLED=true | 不打 169.254.169.254，否则测试会等元数据超时 |

Windows 再继承 `SystemRoot` 等，否则子进程起不来。`CI` / `GITHUB_ACTIONS` 若已存在则保留，好让 vitest 用 github-actions reporter。

**故意不继承的：** 所有 `*_API_KEY`、`ANTHROPIC_OAUTH_TOKEN`、`AWS_SECRET_*`、你的真实 `HOME`。于是「有 key 才启用的 e2e」在 `./test.sh` 下不会跑——这正是 AGENTS.md 要的。

最后一行：`env -i "${test_env[@]}" npm test`。`set -euo pipefail` 让 npm 非零时脚本非零。

## 关键逻辑

coding-agent 的 vitest 已经 `PI_OFFLINE=1`，但离线不等于隔离 HOME。一个测试如果写 `~/.pi/agent/settings.json`，直接 `npm test` 会污染你的真配置，下一个 `./pi-test.sh` 会话会读到测试垃圾。本脚本把这个类问题从「靠测试作者自觉」变成「物理上写不到」。

失败会怎样：

- `mktemp` 失败（磁盘满）→ `set -e` 退出，不会 `rm -rf` 空变量（因为 `test_root` 是 readonly 且在成功后才赋）——若有人改脚本把 mktemp 放到 trap 之后，风险会回来
- 测试往假 HOME 写了绝对路径 `/Users/you/...` 硬编码 → 隔离无效，那是测试 bug
- CI 不走本脚本：若某测试依赖「有 CI 变量但有真实 HOME」会在两边表现不同。本脚本在 CI 上很少跑，差异要靠 local-release / 维护者本机暴露

## 和启动链的关系

不启动产品 CLI。它启动的是测试进程。和 `pi-test.sh` 的差别：一个隔离后跑 npm test，一个不隔离、用你的真凭证跑源码 CLI——后者才能交互打模型。

## 下一课

实验 mini 宿主的启动器：[15-mini-test.sh.md](/series/pi-source/root/019-mini-test-sh/)。
