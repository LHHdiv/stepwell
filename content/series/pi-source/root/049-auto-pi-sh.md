---
title: "45 · auto-pi.sh — PATH 上的「开发版 pi」"
summary: "分清三条「名叫 pi 的命令」："
tags: [pi, root]
---
源码：`scripts/auto-pi.sh`  
被谁调用：维护者 `ln -s $PWD/scripts/auto-pi.sh ~/.local/bin/pi`，且 `~/.local/bin` 排在稳定版 `pi` 前面。不是 CI，不是课表默认入口（课表用 `pi-test.sh` 跑源码）。

## 本课目标

分清三条「名叫 pi 的命令」：

| 命令 | 跑什么 |
|---|---|
| `./pi-test.sh` | tsx + **源码** experimental/cli.ts |
| `auto-pi.sh`（本课） | `packages/coding-agent/dist/bundle/cli.js`，默认 `PI_EXPERIMENTAL=1` |
| 稳定 `pi`（npm / 二进制） | 同一份 bundle 或 bun compile，实验开关默认关 |

`pi update` 必须走稳定版，否则开发包装自己更新自己会把 PATH 搞乱。

## 在仓库中的位置

脚本会 **解开自身的 symlink 链** 得到真正的 `scripts/auto-pi.sh`，再 `repo_dir=../`。这样 `~/.local/bin/pi` → 本文件时，repo_dir 仍是 checkout，不是 `~/.local/bin`。

## 文件做什么

### `--stable` 与 `update`

参数里出现 `--stable`，或第一个真正参数是 `update`，则 `find_stable_pi`：沿 PATH 找名为 `pi` 的可执行文件，跳过「和本脚本是同一个 inode」的那个（`-ef`），找到第一个别人。找不到就 error：PATH 上没有稳定版。

然后 `exec "$stable_pi" ...`，包括 `update` 子命令。开发 bundle 没有责任实现自更新安装器协议。

### 开发执行

`dev_pi="$repo_dir/packages/coding-agent/dist/bundle/cli.js"`。不存在或不具执行位 → 叫你在仓库根 `npm run build`。`chmod 755` 在 bundle 脚本里做过。

`export PI_EXPERIMENTAL="${PI_EXPERIMENTAL:-1}"` 再 `exec`。已经在环境里设了 0 的人不会被覆盖。实验 CLI 行为（与 `experimental/cli.ts` 相关的运行时开关）因此默认开。

## 关键逻辑

失败会怎样：

- 只 symlink 了 auto-pi 从没 build：每次敲 pi 都报错。这比默默 fallback 到稳定版好——否则你以为在测开发版
- PATH 顺序反了：稳定版在前，本脚本根本不会被调用
- `find_stable_pi` 把另一个 checkout 的 auto-pi 当成稳定版：若那也是 symlink 到另一份 auto-pi，可能递归。`-ef` 只跳过自己。两个开发包装环是用户 PATH 配置错误
- Windows：本文件是 bash。Windows 维护者用 ps1 入口或 WSL

## 和启动链的关系

`exec dist/bundle/cli.js` ≈ 用户 npm 入口，但带实验开关、且永远是**这一份 checkout 最后一次 build**。改源码后必须 build 才能从 auto-pi 看见变化；`pi-test.sh` 不用 build。培训跟课表请用 `pi-test.sh`，避免「以为跑了源码其实跑了过期 bundle」。

## 下一课

给启动过程计时：[46-profile-coding-agent-node.mjs.md](/series/pi-source/root/050-profile-coding-agent-node-mjs/)。
