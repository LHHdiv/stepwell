---
title: "25 · experimental/commands/client.ts — 连上实验 server"
summary: "看懂互斥规则和 prompt 的 remaining 处理。真正的 TUI/RPC 客户端在 src/experimental/client.ts，本文件只产出 ClientCommand 数据。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/experimental/commands/client.ts`  
被谁调用：实验命令树；action 调 `context.runClient`。

## 本课目标

看懂互斥规则和 prompt 的 remaining 处理。真正的 TUI/RPC 客户端在 `src/experimental/client.ts`，本文件只产出 `ClientCommand` 数据。

## 合法字段

`command: "client"`，加上可选：`auth`、`connect`、`sessionId`、`continue`、`resume`、`provider`、`model`、`pluginPackages`（`-e` 可重复）、`prompt`。

## builder 校验

1. `parseAuth` 错误原样带上。
2. `--provider` 必须配 `--model`（可以只给 model）。
3. `--session-id`、`--continue`/`-c`、`--resume`/`-r` 三者只能一个。
4. remaining：
   - 空：OK（交互连上再打字）
   - 恰好一条 prompt：要么 `remaining[0]==="--"` 后面那一个，要么唯一 token 不以 `-` 开头
   - 其它：`unsupportedOptions("client", …)`

`--continue` 与 `-c` 任一出现即 `continue: true`。resume 同理。

成功对象用展开省略 undefined，保持 JSON 干净。

## 失败与边界

`-e` 的值是包名字符串，不在这里安装。prompt 不能是 `--foo` 这种，会被当成未支持的主 CLI 旗标。`runClient` 的实现不在本课。

## 下一课

[26-experimental-server.ts.md](/series/pi-source/coding-agent/506-experimental-server-ts/)：实验 server 子命令。
