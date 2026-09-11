---
title: "12 · .npmrc — 两条就改变依赖解析"
summary: "能解释 README「Supply-chain hardening」里那两句对应哪两行配置，以及它们管不到什么（所以才需要 check 脚本补刀）。"
tags: [pi, root]
---
源码：`.npmrc`  
被谁调用：在本仓库目录下执行的一切 npm（`npm install`、`npm i -D`、`npm version` 触发的安装、CI 的 `npm ci`）。bun 不完全遵守 npmrc；发版隔离安装里 bun 路径是另一套。

## 本课目标

能解释 README「Supply-chain hardening」里那两句对应哪两行配置，以及它们**管不到**什么（所以才需要 check 脚本补刀）。

全文：

```ini
save-exact=true
min-release-age=2
```

没有 registry 镜像、没有 `package-lock=false`、没有 `_authToken`。Token 走环境变量 / `npm login`，不准写进仓库。

## 在仓库中的位置

```text
.npmrc                         仓库级，clone 即生效
~/.npmrc                       开发者全局（可能覆盖或追加）
CI 的 actions/setup-node       registry-url: https://registry.npmjs.org
check-pinned-deps.mjs          事后检查 package.json 是否真的精确版本
check-lockfile-commit.mjs      事后检查 lockfile 改动是否故意
```

## 文件做什么

### `save-exact=true`

`npm install lodash` 写进 `package.json` 的是 `"lodash": "4.17.21"` 而不是 `"^4.17.21"`。这只影响**未来新加的依赖写法**。已经存在的 `^` 不会被 npm 自动改掉——所以还要 `check-pinned-deps.mjs` 扫全仓。内部 workspace 包允许 `^`（锁步 + sync-versions），检查脚本会跳过 `@earendil-works/pi-*` 和 chord。

没有这一行，agent 随手 `npm i foo` 就会写入范围版本，lockfile 在下一次 `npm i` 时可能悄悄升补丁，和「依赖变更当代码审」冲突。

### `min-release-age=2`

npm 在解析时拒绝「发布未满 2 天」的版本。单位是天。针对的是供应链攻击里「刚发布的恶意补丁被自动装上」的窗口。2 天不是密码学安全，是给 npm 下架 / 社区发现的缓冲。

它在 **resolution 时**生效。已经写死在 lockfile 里的版本，`npm ci` 仍会装，即使该版本今天才满 2 天——`ci` 按 lock 取精确版本。真正被挡的是：你今天把依赖 bump 到一个 3 小时前发布的版本，解析失败。

## 关键逻辑

`.npmrc` 是预防，check 脚本是审计：

| 威胁 | .npmrc | 仍需要脚本 |
|---|---|---|
| 新依赖写成 `^` | save-exact | 已有文件里的 `^`、人手改 JSON |
| 当天发布的恶意版本 | min-release-age | lockfile 被故意改到恶意旧版本；git 历史里的版本 |
| lifecycle 脚本 | 不管 | shrinkwrap 白名单 |
| 内部包版本漂移 | 不管 | sync-versions.js |

失败会怎样：

- 开发者全局 `~/.npmrc` 写了 `save-exact=false` 或不同 registry：npm 的项目级一般覆盖 save-exact，但镜像 registry 可能让 lockfile 的 `resolved` URL 变成私服，CI 在 npmjs 上还原失败
- 紧急需要刚发布的安全补丁：`min-release-age=2` 会挡。合法出口是等两天，或临时用精确版本 + 文档说明，不能把这一行改成 0 然后忘掉
- bun install 可能不读 `min-release-age`：所以 `local-release.mjs` 的 bun 隔离安装不是供应链等价物，只是「bun 用户装得起来」的冒烟

## 和启动链的关系

不进 `pi` 进程。`npm install --ignore-scripts` 在仓库根执行时读它，决定你的 `node_modules` 和 lockfile 长什么样，从而决定 tsx / vitest / esbuild 解析到哪份依赖。

## 下一课

换行契约，Windows 入口能跑是靠它：[13-.gitattributes.md](/series/pi-source/root/017--gitattributes/)。
