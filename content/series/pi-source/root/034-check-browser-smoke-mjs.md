---
title: "30 · check-browser-smoke.mjs — 浏览器打包 + 选择性厂家 treeshake"
summary: "看两次 esbuild.build 各自守什么：第一次只要能在 platform: browser 下把 28 课入口打出来；第二次打开 metafile，对 29 课入口做白名单断言。失败时把 esbuild 的 location+t"
tags: [pi, root]
---
源码：`scripts/check-browser-smoke.mjs`  
被谁调用：`npm run check` 最后一步 `check:browser-smoke`；husky 在 staged 触及 `packages/ai/*`、`packages/web-ui/*`、根 package.json/lock 时再跑一次（check 已跑过则重复，失败仍能挡 commit）。

## 本课目标

看两次 `esbuild.build` 各自守什么：第一次只要能在 `platform: browser` 下把 28 课入口打出来；第二次打开 metafile，对 29 课入口做白名单断言。失败时把 esbuild 的 location+text 写到 `os.tmpdir()/pi-browser-smoke-errors.log`，stderr 只印路径——避免把巨大 bundle 错误刷进 commit 日志。

## 在仓库中的位置

依赖根 `devDependencies` 的 `esbuild` `0.28.2`。不跑产物，不启动浏览器。和 `playwright` 无关。

## 文件做什么

### 缺模型 JSON 的 plugin

`packages/ai/src/providers/data/*.json` 被 gitignore。新鲜 clone 或没 hydrate 时，相对导入 `./data/foo.json` 会让 esbuild 失败。plugin 在 resolve 阶段：若目标目录正是 generatedCatalogDataDir 且文件不存在，改到 namespace `empty-generated-model-catalog`，load `{}`。存在的 JSON 仍走真实文件。这样 check 在「无网络、无 data 目录」时仍能验 Node 内置导入，代价是 treeshake 断言里 catalog 过滤可能看到空——若完全没有 anthropic.json，第二次断言 `catalogInputs.length !== 1` 会失败。因此 **完整绿的 check 实际上仍期望有 anthropic.json**，或至少打包图里贡献字节的 catalog 只有那一个。未 hydrate 时 contributingInputs 可能为零，报 `found none`。维护者本机通常已 hydrate；CI `npm run build` 在 check 之前，会生成 data。注意 husky 的 check 若跳过 build，本机缺 data 会红——这是「先 build 再提交」和「AGENTS.md 说不要主动 build」之间的张力：ai 包的 data 需要 hydrate 过一次。

### 第一次 build

`browser-smoke-entry.ts` → 临时 `pi-browser-smoke.js`，`logLevel: silent`。失败进 catch。

### 第二次 build

`write: false`（不写盘，只要 metafile）。然后：

1. `findInput` 用后缀匹配，Windows 反斜杠 normalize 成 `/`
2. 禁止列表任一命中 → throw
3. 只统计 `bytesInOutput > 0` 的 contributing inputs，避免「进了图但被 treeshake 掉」的假阳
4. catalog 路径必须恰好一个且以 `/anthropic.json` 结尾
5. 五个 SDK 包名扫描 `node_modules/<pkg>/`，必须只含 anthropic

### 错误输出

esbuild 的 `error.errors[]` 带 `location.file:line:column` + `text`。再加上 `Error.stack`。全部写入临时 log。`process.exit(1)`。成功 `exit(0)`。

## 关键逻辑

为什么和 entry-graphs 并存？entry-graphs 是便宜的源码 BFS，抓 `export *` 桶；本脚本是真实 bundler，抓 Node 内置、可选依赖、以及「文件在图里但应被 shake 掉」。两者漏的洞不同。

失败会怎样：

- 有人在 `pi-agent-core` 顶层 import `node:fs` → 第一次 build 失败，log 里是 esbuild 的 Node built-in 错误
- 有人在 anthropic provider 拉进 openai SDK → 第二次 throw 自定义 Error
- 临时目录不可写 → writeFileSync 再抛，check 仍非零
- husky 重复跑：浪费几秒 esbuild，不改变语义

## 和启动链的关系

无。CLI 是 Node bundle。本检查保护库的浏览器合同和按需厂家图。

## 下一课

模拟 npm 用户只安装 CLI：[31-coding-agent-consumer.mjs.md](/series/pi-source/root/035-coding-agent-consumer-mjs/)。
