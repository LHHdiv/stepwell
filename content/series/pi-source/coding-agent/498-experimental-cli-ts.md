---
title: "22 · cli/experimental/cli.ts — 实验命令树的根"
summary: "看清这棵树和 cli/args.ts 是两套解析器。实验 CLI 用自己的 Command 类（下一课），根命令本身不能执行，只组合 server 和 client。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/experimental/cli.ts`  
被谁调用：`src/experimental/commands.ts`。主 `parseArgs` **不**解析 `experimental`；那是 `PI_EXPERIMENTAL=1` 时另一条入口挂上的子命令。

## 本课目标

看清这棵树和 `cli/args.ts` 是两套解析器。实验 CLI 用自己的 `Command` 类（下一课），根命令本身不能执行，只组合 `server` 和 `client`。

## 在系统中的位置

```text
experimental/commands.ts
  cli.execute(argv, context)
    Command("experimental")
      .command(serverCommand)
      .command(clientCommand)
context.runServer / context.runClient
  → src/experimental/server.ts 或 client.ts
```

`CliContext = ServerCommandContext & ClientCommandContext`。调用方必须两个 action 都给。

## 文件本身

```ts
const experimentalCommand = new Command("experimental").build(() => ({
  ok: false,
  errors: ["Expected experimental command: server or client"],
}));
export const cli = experimentalCommand.command(serverCommand).command(clientCommand);
```

直接 `pi experimental`（没有子命令）走根的 `build`，得到错误，不 throw。子命令由 `Command.select` 把 argv[0] 交给对应树。

## 失败与边界

根没有 `.action()`。若错误地 `execute` 到根且 build 成功，会 throw「does not define an action」；实际 build 总是失败，所以只会看到 errors 数组。这棵树还不接受主 CLI 的 `--print` 等旗标（`unsupportedOptions`）。

## 下一课

[23-experimental-command.ts.md](/series/pi-source/coding-agent/501-experimental-command-ts/)：这套迷你 commander 怎么吃 argv。
