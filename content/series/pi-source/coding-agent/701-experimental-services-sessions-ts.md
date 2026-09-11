---
title: "140 · services/sessions.ts — 会话目录与生命周期"
summary: "SessionAddress 是 { serverId, sessionId }。presentation 的会话选择器读 directory.state，确认后 management.attach。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/sessions.ts`

两个服务：

- `pi.session-directory`：复制状态 `{ revision, sessions: SessionSummary[] }`
- `pi.session-management`：create / attach / remove 等（具体方法在同文件 interface）

`SessionAddress` 是 `{ serverId, sessionId }`。presentation 的会话选择器读 directory.state，确认后 management.attach。

## 下一课

[141-experimental.services.server.ts.md](/series/pi-source/coding-agent/702-experimental-services-server-ts/)
