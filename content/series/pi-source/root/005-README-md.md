---
title: "01 · README.md — 仓库对外说明书"
summary: "读完应能指出：这个 monorepo 对外卖哪几个 npm 包、本地开发的最小命令集、以及为什么 README 花一整节讲供应链而不是讲 Agent 循环。后面所有根目录文件都在兑现这里写下的承诺。"
tags: [pi, root]
---
源码：`README.md`  
被谁调用：人（GitHub 首页、clone 之后第一眼）；agent 偶尔被要求「按 README 的开发命令跑」。**进程启动不读它。**

## 本课目标

读完应能指出：这个 monorepo 对外卖哪几个 npm 包、本地开发的最小命令集、以及为什么 README 花一整节讲供应链而不是讲 Agent 循环。后面所有根目录文件都在兑现这里写下的承诺。

## 在仓库中的位置

```text
GitHub 仓库页 / clone 后的根
  README.md          ← 你在这里
  CONTRIBUTING.md    贡献闸门（README 第一句就链过去）
  AGENTS.md          给仓库内 agent 的规则
  packages/*         真正的产品代码
```

标题是 **Pi Agent Harness**，不是「一个聊天机器人」。第一段就把产品拆成三块：`pi-coding-agent`（CLI）、`pi-agent-core`（循环）、`pi-ai`（厂家 HTTP）。这和课表里 coding-agent → agent → ai 的阅读顺序一致。

## 文件做什么

### 自动关闭警告

正文之前有一条 blockquote：新贡献者的 issue / PR 默认自动关闭。这不是客套，是 [CONTRIBUTING.md](/series/pi-source/root/008-CONTRIBUTING-md/) 闸门的对外副本。维护者每天看被关的 issue，用 `lgtm` / `lgtmi` 放行。忽略这条去开 PR，会直接被关，没有代码审查。

### 包地图

「All Packages」表比开头三块更全：chord、telemetry、tui，以及聊天自动化被指到另一个仓库 `earendil-works/pi-chat`。读源码时如果在 `packages/` 里找不到 Slack 机器人，不是丢了，是不在这个 repo。

### 权限与容器化

明确写：**Pi 没有内置权限系统。** 进程权限 = 启动它的用户权限。需要隔离就看 `packages/coding-agent/docs/containerization.md` 的三种模式（Gondolin 微 VM、Docker、OpenShell）。这和 [SECURITY.md](/series/pi-source/root/009-SECURITY-md/) 的信任边界是同一句话的产品侧表述。把「模型输出了一条 `rm -rf`」当成漏洞来报，README 已经提前拒绝了。

### Development 命令

```bash
npm install --ignore-scripts
npm run build          # 先刷新模型数据再编
npm run build:offline  # 用已有模型数据，断网可编
npm run check
./test.sh
./pi-test.sh
```

四条必须同时记住：

1. **安装带 `--ignore-scripts`。** 依赖的 lifecycle 脚本默认不跑。这是供应链策略，不是图省事。漏掉这个 flag，本机行为会和 CI（`npm ci --ignore-scripts`）分叉。
2. **`build` 会碰网络**（刷新厂家模型目录）。离线或发版复现用 `build:offline`。
3. **测试入口是 `./test.sh` 不是 `npm test`。** 直接 `npm test` 会用你的真实 `$HOME` 和 API key，可能打到真模型、污染 `~/.pi`。AGENTS.md 把这条写成禁令。
4. **`./pi-test.sh` 是课表源码入口**，从任意 cwd 都能跑，因为它自己定位仓库根。

### 从 GitHub Release 源码包编独立二进制

Release 上传 `pi-<version>-source.tar.gz`，带 SHA256SUMS。解压后跑同一份 `scripts/build-binaries.sh --offline-model-data`。archive 里已经带了模型数据和 native prebuild，所以 `--offline-model-data` 不会再去拉厂家目录。这是「用户不 clone git、只拿 release tarball」的路径，和开发者的 `npm run build` 不是同一条。

### Supply-chain hardening

这一节是 README 真正的工程内容，后面几乎每个 `scripts/check-*.mjs` 都在执行它：

| README 承诺 | 兑现的文件 |
|---|---|
| 直接外部依赖钉死精确版本 | `.npmrc` `save-exact` + `check-pinned-deps.mjs` |
| `min-release-age=2` | `.npmrc` |
| lockfile 是真值，误提交要挡 | husky → `check-lockfile-commit.mjs` |
| `npm run check` 验 pinned / TS import / shrinkwrap | `package.json` 的 `check` 脚本串 |
| 发布的 CLI 带 shrinkwrap | `generate-coding-agent-shrinkwrap.mjs` |
| 发版前在仓库外做隔离安装 | `local-release.mjs` + `coding-agent-consumer.mjs` |
| 安装用 `--ignore-scripts` | CI、文档、`pi update --self` |
| lifecycle 脚本白名单 | shrinkwrap / install-lock 生成器里的 `allowedInstallScriptPackages` |

读后续 check 脚本时，回到这一节对表。脚本不是「有人闲着写了 linter」，是 README 把供应链当成和代码同等的审查对象。

### OSS session 分享

维护者用 Hugging Face 数据集收真实会话。与运行时无关，但解释了仓库里为什么有 `scripts/session-*.ts` 这类离线分析工具：他们自己也在挖 JSONL。

## 关键逻辑（为什么 README 这样写）

README 几乎不讲 Agent 循环、不讲 `streamFn`。那是 `packages/*/README.md` 和 pi.dev 文档的事。根 README 只保证三件事：

1. **找对包。** 克隆的人不会把 `pi-agent-core` 当成 CLI 去 `npm i`。
2. **找对命令。** 尤其是 `--ignore-scripts`、`./test.sh`、`./pi-test.sh`，错一条就会用真密钥跑测试或跑到已安装的旧 `pi`。
3. **预先划边界。** 权限模型、贡献闸门、依赖审查，避免 issue tracker 被「这不是漏洞」和「AI 生成的 PR」淹没。

失败模式很具体：新贡献者跳过 README 直接 `npm install`（跑 lifecycle）、`npm test`（打真实 API）、开 PR（被 auto-close）。维护者时间耗在清理，而不是看代码。

## 和启动链的关系

不在启动链上。但它规定了启动链的**开发入口名字**：`./pi-test.sh`。课表第一跳就是这句话。

已安装的 `pi` 来自 npm 或独立二进制，入口是 `packages/coding-agent/src/cli.ts` 编出来的 `dist/bundle/cli.js`。README 的 Development 节故意把两条分开：开发用脚本，用户用安装产物。

## 下一课

说明书里的命令全部来自一份合同：[02-package.json.md](/series/pi-source/root/006-package-json/)。
