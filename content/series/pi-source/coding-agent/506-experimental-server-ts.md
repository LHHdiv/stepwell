---
title: "26 · experimental/commands/server.ts — 拉起实验多会话宿主"
summary: "server 没有 --connect（它自己听）。必须校验 --server-id 是 lowercase UUIDv4。--session-dir 只是字符串，不在解析期 mkdir。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/experimental/commands/server.ts`  
被谁调用：实验命令树；action 调 `context.runServer`。实现在 `src/experimental/server.ts`。

## 本课目标

server 没有 `--connect`（它自己听）。必须校验 `--server-id` 是 lowercase UUIDv4。`--session-dir` 只是字符串，不在解析期 mkdir。

## 合法字段

`command: "server"`，可选 `auth`、`provider`、`model`、`pluginPackages`、`serverId`、`sessionDir`。

`--server-id` 用 `valueOption` + `isServerId`。非法值在 option.parse 阶段进 errors，不会进 command 对象。

`--provider` 仍要求 `--model`。任何 remainingArgs 都是错误（server 不接受 prompt）。

## 失败与边界

没有默认 serverId：省略则运行时自己生成。auth 与 client 相同，互斥 token/file。本文件不绑定端口、不写 pid。

## 下一课

实验 CLI 到此。正课回到产品核心：[27-session-manager.ts.md](/series/pi-source/coding-agent/509-session-manager-ts/)，JSONL 会话如何成为树。
