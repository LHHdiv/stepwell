---
title: "02 · cli.ts — 发布进程入口"
summary: "知道用户机器上的 pi 命令从哪进；和源码入口只差「没有实验子命令、没有 await」。不要在跟 ./pi-test.sh 时把断点只打在本文件。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli.ts`  
编译产物：`packages/coding-agent/dist/bundle/cli.js`  
`package.json`：`"bin": { "pi": "dist/bundle/cli.js" }`

## 本课目标

知道用户机器上的 `pi` 命令从哪进；和源码入口只差「没有实验子命令、没有 await」。不要在跟 `./pi-test.sh` 时把断点只打在本文件。

## 在系统中的位置

```text
npm 全局/本地安装
  node dist/bundle/cli.js ...
    ← 本文件的打包结果
      setupCli()
      main(argv)          没有 await
```

`src/index.ts` **不是**入口。那是库的导出清单：`import { createAgentSession } from "@earendil-works/pi-coding-agent"`。桌面应用嵌 Pi 走 index/sdk，不走本文件。

## 逐行精读

```ts
#!/usr/bin/env node
```

Unix 上直接执行 `cli.js` 时用环境里的 `node`。Windows 的 npm 另写 `.cmd` 包装，不依赖 shebang。

```ts
import { setupCli } from "./cli/setup.ts";
import { main } from "./main.ts";
```

构建时 `.ts` 被改写成 `.js`。`setupCli` 必须先于 `main`：`main` 里立刻可能 `configureHttpDispatcher`、读设置、发请求。

```ts
setupCli();
main(process.argv.slice(2));
```

- `slice(2)`：`process.argv[0]` 是 node，`[1]` 是脚本路径。`pi --version` 传到 `main` 的是 `["--version"]`。
- **没有 `await`。** `main` 返回 Promise。Node 会等这个 Promise 完成才让事件循环空闲退出；未捕获的拒绝变成 `unhandledRejection`。产品选择把失败做成 `process.exit`，所以多数错误路径根本不靠这里的 Promise。
- 没有 `runExperimentalCommand`。用户装的 `pi` 不能靠本入口开实验 server。

若你在本文件看到 `debugger;`：那不是产品逻辑。没有 inspector 时等于空语句。用 `./pi-test.sh` 时**根本不会执行到这一行**，因为加载的是 `experimental/cli.ts`。

## 和 01 课的对照

| | experimental/cli.ts | cli.ts |
|---|---|---|
| 谁用 | 本仓库开发 | npm 发布 |
| 实验子命令 | 有 | 无 |
| await main | 有 | 无 |
| 下一跳 | 同样是 setup + main | 同样 |

精读、断点、跟路径：以 01 课的文件为准。本课只为了你以后读到 `bin` 字段时不迷路。

## 下一课

[03-setup.ts.md](/series/pi-source/coding-agent/469-setup-ts/)
