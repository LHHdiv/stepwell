---
title: "01 · experimental/cli.ts — 源码进程入口"
summary: "分清「跟源码」和「用已经安装的 pi」不是同一扇门。能指着这 12 行说出：参数从哪来、实验命令何时把 main 截胡、普通 --help / -p 如何进到 main.ts。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/cli.ts`（12 行）  
谁加载它：仓库根目录 `./pi-test.sh` 最后一行、`.vscode/launch.json` 的三条配置。

## 本课目标

分清「跟源码」和「用已经安装的 pi」不是同一扇门。能指着这 12 行说出：参数从哪来、实验命令何时把 `main` 截胡、普通 `--help` / `-p` 如何进到 `main.ts`。

## 在系统中的位置

```text
./pi-test.sh
  tsx --tsconfig tsconfig.json
    packages/coding-agent/src/experimental/cli.ts     ← 你在这里
      setupCli()
      runExperimentalCommand(args) ?
        true  → 实验 server/client，主链当旁路
        false → await main(args)                      ← 正课
```

官方 `pi` 命令**不走**本文件，走 `src/cli.ts` 的打包结果。两边下一跳都是 `setupCli` + `main`。断点打 `main`，两条入口都能停。

## 逐行精读

```ts
#!/usr/bin/env node
```

shebang。tsx 直接跑 `.ts` 时这一行被忽略；若将来把本文件当 Node 脚本执行才会用到。

```ts
import { setupCli } from "../cli/setup.ts";
import { main } from "../main.ts";
import { runExperimentalCommand } from "./commands.ts";
```

相对路径带 `.ts` 后缀，是本仓库的硬约定（`allowImportingTsExtensions`）。`commands.ts` 只服务开发入口，**不会**打进 npm 的 `dist/bundle/cli.js`。所以用户装的 `pi` 没有 `pi server` 这条开发旁路。

```ts
setupCli();
```

同步。必须在任何可能的网络请求、进程标题、子进程环境变量之前。详见 [03-setup.ts.md](/series/pi-source/coding-agent/469-setup-ts/)。

```ts
const args = process.argv.slice(2);
```

和发布入口相同：丢掉 `node`/`tsx` 路径和脚本路径。`./pi-test.sh --help` 到这里是 `["--help"]`。`./pi-test.sh -p --no-session "你好"` 是 `["-p", "--no-session", "你好"]`。

```ts
if (await runExperimentalCommand(args)) {
	if (args[0] === "client") process.exit(process.exitCode ?? 0);
} else {
	await main(args);
}
```

这是本文件相对 `cli.ts` 多出来的**唯一**业务。

打开 `src/experimental/commands.ts` 的导出函数（先不要读 server 实现）：

- 若实验特性未打开（`areExperimentalFeaturesEnabled()`，通常要 `PI_EXPERIMENTAL=1`），直接 `return false`。
- 若打开了，且 `args[0]` 是 `server` / `client` 等实验子命令，则在本层跑完，`return true`，**不调用 `main`**。
- 其它所有 argv，包括 `--help`、`-p`、交互，都 `return false`。

因此跟启动链、跟 `prompt`：**把 `PI_EXPERIMENTAL` 当不存在**，本文件就是 `setupCli(); await main(args)`。

两个细节：

1. 这里对 `main` 用了 `await`。发布入口 `cli.ts` 没有 await。开发入口更干净：`main` 的 Promise 拒绝会变成这个模块的 unhandled rejection 之前先被 await 观察到。`main` 内部大量 `process.exit`，正常路径仍靠 exit 结束进程。
2. `args[0] === "client"` 时额外 `process.exit`。实验客户端可能留下没关的句柄（socket、TUI），不强制 exit 进程会挂住。正课不走这个分支。

## 失败与边界

- `setupCli` 抛错：进程在解析参数前死，看不到 `main` 的帮助。
- `runExperimentalCommand` 内部若启动 server 失败，错误在 `commands.ts`，不会进 `main`。
- 普通命令失败全部在 `main` 及其下游。

## 下一课

[02-cli.ts.md](/series/pi-source/coding-agent/468-cli-ts/) — 对照发布入口，看少了什么。然后两路汇合进 setup。
