---
title: "31 · coding-agent-consumer.mjs — 假装自己是只装了 CLI 的用户"
summary: "记住安装形状：直接依赖只有 @earendil-works/pi-coding-agent，其它公开包通过 overrides 指向本地 tarball。这样不会把 pi-server 等开发包装进树里——如果 SDK 错误地 impo"
tags: [pi, root]
---
源码：`scripts/coding-agent-consumer.mjs`  
被谁调用：`npm run check:package-install`（`node scripts/coding-agent-consumer.mjs`）；`local-release.mjs` import 其中的 `packReleasePackages` / `installCodingAgentConsumer` / `smokeTestCodingAgentConsumer`；`release.mjs` 在测试之后跑 `check:package-install`。测试：`coding-agent-consumer.test.mjs`。

## 本课目标

记住安装形状：**直接依赖只有 `@earendil-works/pi-coding-agent`**，其它公开包通过 `overrides` 指向本地 tarball。这样不会把 `pi-server` 等开发包装进树里——如果 SDK 错误地 import 了它们，smoke 会在隔离目录里炸，而不是被 workspace hoist 救活。这是 #9132 的第二道闸。

## 在仓库中的位置

```text
packReleasePackages(packages, tarballDir)
  每个包 npm pack --ignore-scripts --json --pack-destination

installCodingAgentConsumer(dir, tarballs, npm|bun)
  写 private package.json: dependencies 只有 coding-agent
  overrides 全是 file:./相对路径
  npm install --ignore-scripts --omit=dev --no-audit --no-fund
  （bun: bun install --ignore-scripts --production）

smokeTestCodingAgentConsumer(dir)
  递归检查 node_modules 不得出现 pi-client/protocol/server
  发布目录不得有 dist/experimental、dist/client 等
  写临时 smoke-sdk.mjs：import createAgentSession / SessionManager / ModelRuntime
  断言子路径 /client、/experimental/plugin 不可 resolve
  跑 bin.pi 和 dist/cli.js --version 必须等于 manifest.version
```

直接执行本文件（`import.meta.url` 判断）时：对 `getPublicWorkspacePackages()` 打包，在 `os.tmpdir()` 里安装并 smoke，最后删掉。需要工作区已经 `npm run build` 过，否则 pack 进去的 dist 是空的，version 都跑不起来。`check:package-install` 不在默认 `check` 管子里，只在 `release.mjs` 和手动调用——因为 pack 全仓很慢。`local-release` 自己 build 完再调。

## 文件做什么

### pack 的 npm JSON 兼容

注释：npm <11.6 返回数组，更新的 npm 可能返回以包名为 key 的对象。脚本两种都认。`--ignore-scripts` 避免 pack 时跑 prepack 意外 build。

### overrides 的意义

如果把每个 tarball 都写成直接依赖，`pi-server` 会被装上，SDK 里错误的 `import "@earendil-works/pi-server"` 在隔离目录里仍然成功——假绿。overrides 只在「已经出现在依赖图里」时替换版本，未声明的包不会因为 override 键而出现。测试里把 `declareServer: true` 加到假 manifest 后，smoke 必须因「pi-server must not be installed」失败。

### smoke 环境

`HOME`/`USERPROFILE`/`PI_CODING_AGENT_DIR` 指到 consumer 目录下的临时 home，`PI_OFFLINE=1` `PI_TELEMETRY=0`。Windows 继承 SystemRoot。`--version` 不该碰网络或写真实 `~/.pi`。

禁止的发布路径列表：`dist/client`、`dist/experimental`、`dist/cli/experimental`、`dist/bundle/client.js`、`dist/bundle/coordinator.js`。这些是开发/多进程宿主，进 npm tarball 会扩大攻击面和体积。build 的 tsconfig exclude 是第一道，本检查是打包后的实物检查。

## 关键逻辑

失败会怎样：

- SDK 多写了一个未声明 import → 隔离 `import createAgentSession` 抛 `Cannot find package`
- 开发包漏进 files 字段 → existsSync 那些 dist 路径，throw
- `--version` 打印不是 package.json 的 version（bundle 把版本字符串编死成旧的）→ throw。发版前能抓到「忘了 sync-versions」
- 直接跑本脚本但没 build → pack 出残包，smoke 失败，tmpdir 在 finally 里仍会删
- bun 路径：`local-release` 用同一套函数，runtime 参数传 `"bun"`，smoke 用 bun 执行 js

## 和启动链的关系

模拟的是 **npm 用户的启动链**：`node_modules/.bin/pi` → `dist/bundle/cli.js`。和 `pi-test.sh` 的 tsx 源码链对照着看：一边保证开发能跑源码，一边保证用户装到的那份也能跑。

## 测试

`coding-agent-consumer.test.mjs` 用假 dist 夹具：

- 只把 coding-agent 列为直接依赖；devPackages 出现在 overrides 但 node_modules 里没有它们；smoke 过
- 手工把 `pi-server` 嵌进 coding-agent 的 node_modules → smoke 抛 must not be installed
- 创建 `dist/experimental` → 抛 development-only code
- SDK 文件里 import pi-server、CLI 仍能打印 version → smoke 仍失败（不能只测 CLI）
- 把 server 加回 dependencies → 安装后树里有 server，失败

## 下一课

用户实际执行的那份 bundle 怎么打出来：[32-build-coding-agent-bundle.mjs.md](/series/pi-source/root/036-build-coding-agent-bundle-mjs/)。
