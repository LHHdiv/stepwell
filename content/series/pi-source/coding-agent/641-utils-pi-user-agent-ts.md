---
title: "93 · utils/pi-user-agent.ts — HTTP User-Agent"
summary: "getPiUserAgent(version) → pi/0.85.1 (darwin; node/vXX; arm64)。Bun 时 runtime 段是 bun/<ver>。安装器下载、版本检查都带这个，服务端可区分官方客户端。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/pi-user-agent.ts`

`getPiUserAgent(version)` → `pi/0.85.1 (darwin; node/vXX; arm64)`。Bun 时 runtime 段是 `bun/<ver>`。安装器下载、版本检查都带这个，服务端可区分官方客户端。

## 下一课

[94-utils.open-browser.ts.md](/series/pi-source/coding-agent/643-utils-open-browser-ts/)
