---
title: "28 · browser-smoke-entry.ts — 假装浏览器去 import 公共 API"
summary: "看这份文件 import 了哪些包的哪些导出：那就是「我们承诺浏览器可加载」的表面。esbuild platform: \"browser\" 打包时，任何一条链若碰到 node:fs / childprocess，构建失败，check 红"
tags: [pi, root]
---
源码：`scripts/browser-smoke-entry.ts`  
被谁调用：只被 `scripts/check-browser-smoke.mjs` 当作 esbuild `entryPoints`。不是产品入口，从不被 Node 直接执行（即使执行，也只是 `console.log` 一串值）。

## 本课目标

看这份文件 **import 了哪些包的哪些导出**：那就是「我们承诺浏览器可加载」的表面。esbuild `platform: "browser"` 打包时，任何一条链若碰到 `node:fs` / `child_process`，构建失败，check 红。

## 在仓库中的位置

```text
check-browser-smoke.mjs
  esbuild entry: scripts/browser-smoke-entry.ts
  platform: browser, format: esm
```

husky 在 staged 文件触及 `packages/ai/*`、`package.json`、`package-lock.json` 时会**再跑一次** browser-smoke（`npm run check` 末尾已经跑过，这里是加严）。

## 文件做什么

顶部把这些值导入进来，迫使打包器追踪它们的模块图：

- `@earendil-works/pi-client` 的 `Client`
- `pi-ai`：`createAssistantMessageEventStream`、`Type`，以及 `compat` 的 `complete` / `getModel` / `getProviders` / `streamSimple`
- `pi-agent-core`：`Agent`、一批纯函数（bashExecutionToText、convertToLlm、skills 格式化、Result 风格的 ok/getOrThrow、FileError…）和 `streamProxy`
- `pi-protocol`：CBOR 编解码和 `PROTOCOL_VERSION`

然后构造最小对象：取一个 google 模型、一个 TypeBox schema、一个 Agent、steer 一条 user 消息、encode/decode CBOR。最后 `console.log` 把结果用掉，防止 treeshake 把 import 删掉——否则「没引用的 export」不会把危险模块拉进图，冒烟就失去意义。

注释写死：Keep this entry browser-safe。往这里加 import 等于扩大浏览器合同。想测 Node-only API，不要加进本文件。

## 关键逻辑

`pi-ai` 的 `env-api-keys.ts` 用字符串拼接动态 import `node:fs`，就是为了让这种 browser bundle 不要在静态图里看到 `node:fs`。若有人改回顶层 `import fs from "node:fs"`，本入口的 esbuild 会失败。

`getModel("google", "gemini-2.5-flash")` 会拉模型目录。缺 `providers/data/*.json` 时，check 脚本的 plugin 返回 `{}`，避免新鲜 clone 未 hydrate 就红。

失败会怎样：见下一课 check 脚本如何把 esbuild errors 写到临时 log。本文件自己几乎不会 throw；模型找不到时 `getModel` 可能返回 undefined，随后 `new Agent({ initialState: { model } })` 的行为取决于 Agent 实现——冒烟目的是打包，不是跑通 Agent 循环。check 脚本甚至不执行打包产物，只要求 build 成功。

## 和启动链的关系

无。CLI 是 Node。本文件守护的是「把 agent-core / pi-ai 嵌进 Web UI」这条未来/旁路产品线，以及防止 Node-only 代码从所谓 isomorphic 入口漏出去。

## 下一课

选择性厂家的 treeshake 夹具：[29-agent-treeshake-smoke-entry.ts.md](/series/pi-source/root/033-agent-treeshake-smoke-entry-ts/)。
