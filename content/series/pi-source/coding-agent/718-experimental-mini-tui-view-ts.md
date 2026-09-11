---
title: "157 · mini/tui/view.ts — 不持有 live 对象的视图"
summary: "注释写明：没有 harness、lane、session、ModelRuntime。画面来自 AttachedSession.state() 的 LaneSnapshot，动作都是 lane.prompt 等返回 CommandResu"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/mini/tui/view.ts`

注释写明：没有 harness、lane、session、ModelRuntime。画面来自 `AttachedSession.state()` 的 `LaneSnapshot`，动作都是 `lane.prompt` 等返回 `CommandResult` 的命令。

复用 InteractiveMode 的 `AssistantMessageComponent`、`ToolExecutionComponent`、`CustomEditor`、`LoginDialogComponent`。fullscreen `TuiAltScreen`。登录：ModelsEvent `prompt` 弹出 LoginDialog，答完 `models.authReply`。

和 InteractiveMode 的本质差别：回车调 `client.lane.prompt(text)` 而不是 `session.prompt`；聊天按 snapshot 重建而不是 message_update 增量。

## 下一课

[158-experimental.mini.server.entry.ts.md](/series/pi-source/coding-agent/719-experimental-mini-server-entry-ts/)
