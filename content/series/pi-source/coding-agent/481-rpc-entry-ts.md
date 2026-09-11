---
title: "13 · rpc-entry.ts — RPC 子进程入口"
summary: "对照 02-cli.ts.md：少了什么、多了什么、为什么进程标题要改成 pi-rpc。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/rpc-entry.ts`（14 行）  
谁加载它：`RpcClient.start()` spawn `node dist/cli.js --mode rpc` 时走的是打包 CLI；本文件是**源码侧**给「直接当 RPC 二进制跑」用的平行入口。打包产物里也可能单独出一份 `*-rpc`。

## 本课目标

对照 [02-cli.ts.md](/series/pi-source/coding-agent/468-cli-ts/)：少了什么、多了什么、为什么进程标题要改成 `pi-rpc`。

## 在系统中的位置

```text
宿主 RpcClient
  spawn node [cliPath, --mode, rpc, ...]
    → 发布入口 cli.ts 解析到 appMode=rpc
    → main → runRpcMode

源码直接跑本文件
  process.argv 被改写成 ["--mode", "rpc", ...用户参数]
  → main(...)
```

两条路最终都进 [20-rpc-mode.ts.md](/series/pi-source/coding-agent/495-rpc-mode-ts/)。

## 逐行

```ts
#!/usr/bin/env node
process.title = `${APP_NAME}-rpc`;
process.env.PI_CODING_AGENT = "true";
process.env.AI_AGENT = "pi";
process.emitWarning = (() => {}) as typeof process.emitWarning;
configureHttpDispatcher();
main(["--mode", "rpc", ...process.argv.slice(2)]);
```

1. **进程标题**写成 `pi-rpc`。`ps` / Activity Monitor 里能把 RPC 子进程和交互 `pi` 分开。`RpcClient` 杀进程时靠这个辨认也方便。
2. **环境变量**和发布 CLI 一样：告诉下游「我是 Pi coding agent」。扩展或工具脚本可以读 `PI_CODING_AGENT`。
3. **吞掉 `process.emitWarning`**。RPC 的 stdout 是 JSONL 协议，Node 的 `ExperimentalWarning` 一旦打到 stdout 就破坏 framing。警告被丢掉，不是被重定向到 stderr。
4. **`configureHttpDispatcher()`** 在进 `main` 前装好 undici 空闲超时。RPC 长驻进程会打很多模型 HTTP，必须和交互模式同一套 dispatcher。
5. **强制 `--mode rpc`**。用户就算写了 `-p`，也被塞在 `--mode rpc` 后面；`parseArgs` 里 mode 以后者为准还是前者，取决于 args 实现。本文件的意图是：这个入口**只能**当 RPC 用。

没有 `setupCli()`。发布 CLI 的 `setupCli` 负责进程标题、沙箱 env、警告过滤。本文件自己做了标题和警告，少了 `setupCli` 里其它一次性工作。源码开发请走 `experimental/cli.ts` 再加 `--mode rpc`，不要默认用本文件当主入口。

## 失败与边界

- stdin 被 JSONL 占用，不能再读管道提示词。`main` 对 RPC 会跳过 `readPipedStdin`。
- `main` 的返回值没 await。和发布 `cli.ts` 一样，靠 `process.exit` / 挂起的 Promise 保活。`runRpcMode` 返回 `Promise<never>`，进程不会自然结束。

## 下一课

[14-migrations.ts.md](/series/pi-source/coding-agent/483-migrations-ts/) — `main` 真正干活前要跑的一次性搬家。
