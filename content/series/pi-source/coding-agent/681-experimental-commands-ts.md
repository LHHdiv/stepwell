---
title: "120 · experimental/commands.ts — `pi server` / `pi client` 分发"
summary: "runExperimentalCommand(args)：PIEXPERIMENTAL 未开或 argv0 不是 server/client → false，正课 main 继续。否则交给 cli/experimental/cli.ts"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/commands.ts`  
被谁调用：`experimental/cli.ts`。**发布 cli.js 不得 import 本文件。**

## 本课目标

`runExperimentalCommand(args)`：`PI_EXPERIMENTAL` 未开或 argv0 不是 server/client → `false`，正课 `main` 继续。否则交给 `cli/experimental/cli.ts` 的 parser，回调 `runServerCommand` / `runClientCommand`。

## server

`startForegroundServer`：本进程当 server（Unix socket + 可选 Radius relay）。打印 `Server:` / `Socket:`，Radius 状态变化打一行。SIGINT/SIGTERM 或 `runtime.closed` 后 `close`。

## client

TTY 且没 `--prompt` → `runClientTui`。否则 `runClient`：list 打印 `serverId\tsessionId`；attach 打印 attached；prompt 把 `text_delta` 流到 stdout，结束补换行或整段 text。

错误红字 + exitCode=1，仍返回 `true`（已消费 argv）。client 成功后入口会 `process.exit`，避免悬挂 socket。

## 下一课

[121-experimental.process.ts.md](/series/pi-source/coding-agent/682-experimental-process-ts/)
