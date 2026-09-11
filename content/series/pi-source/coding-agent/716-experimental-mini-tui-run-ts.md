---
title: "155 · mini/tui/run.ts — 找到或拉起 mini server"
summary: "socket ~/.pi/agent/experimental/mini.sock，会话目录 mini-sessions。connect 失败则 spawn server/entry（继承 execArgv 以便 tsx），轮询 10s"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/mini/tui/run.ts`

socket `~/.pi/agent/experimental/mini.sock`，会话目录 `mini-sessions`。connect 失败则 `spawn` server/entry（继承 `execArgv` 以便 tsx），轮询 10s。`--continue` 用 `listSessions` 里同 cwd 最新一条。`connect` 后 `runView`，finally `client.close()`。

## 下一课

[156-experimental.mini.tui.session.ts.md](/series/pi-source/coding-agent/717-experimental-mini-tui-session-ts/)
