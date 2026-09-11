---
title: "23 · cli/experimental/command.ts — 实验 CLI 的手写 Command"
summary: "这不是 yargs。一个 Command 节点有：名字、option 表、可选 builder、可选 action、子命令 map。解析策略是「能认的旗标吃掉，第一个不认识的 token 起全部当 remaining」。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/experimental/command.ts`  
被谁调用：`cli.ts`、`commands/client.ts`、`commands/server.ts`、`command-options.ts`。

## 本课目标

这不是 yargs。一个 `Command` 节点有：名字、option 表、可选 builder、可选 action、子命令 map。解析策略是「能认的旗标吃掉，第一个不认识的 token 起全部当 remaining」。

## 工厂

`stringOption("--foo")`：要值。`flagOption("--bar")`：出现即 true，禁止 `--bar=x`。`valueOption(name, parse)`：自定义 parse（server-id、connect URL）。`repeatable: true` 才允许出现多次。

## `Command` 关键方法

`option` / `build` / `action` / `command` 都 return this，链式。`command()` 的返回类型把 context 与 invocation 做成并集，所以根 `cli` 的 execute context 必须同时有 `runServer` 和 `runClient`。

### `parse` / `execute`

`select(argv)`：argv[0] 是已登记子命令名 → 把剩余 argv 交给子节点。否则 `parseOwn`。

`execute`：子命令递归；自己则 parseOwn，失败返回 `{ ok: false, errors }`，成功才调 `commandAction`。没有 action 且走到这里会 throw。

### `parseOptions`

从左到右：

- `--`：余下全部进 remaining（含 `--` 自己）
- 认识的旗标：`=` 或下一个非 `-` token 当值；flag 不允许 `=`
- 不认识：从这里起全部 remaining，**停止扫旗标**

所以 `experimental client --model gpt --print` 里 `--print` 会进 remaining，由 builder 报 unsupported。

重复非 repeatable、缺值、parse 失败都进 `parsed.errors`，不立刻停，后面的旗标仍会试。

`parseOwn` 把 option 错误和 builder 错误拼在一起。builder 返回 `ok: false` 且 errors 为空是内部 bug，throw。

## 失败与边界

未知短旗标不会被当 error，而是 remaining。这和主 `parseArgs` 相反。子命令名必须是 argv 当前位置的第一个 token，不能 `experimental --foo server`。

## 下一课

[24-experimental-command-options.ts.md](/series/pi-source/coding-agent/502-experimental-command-options-ts/)：共享的 `--connect` / `--auth-token`。
