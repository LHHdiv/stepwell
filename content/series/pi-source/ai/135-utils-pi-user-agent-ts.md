---
title: "74 · utils/pi-user-agent.ts — `pi (darwin 24.x; arm64)`"
summary: "用 process.getBuiltinModule(\"node:os\") 而不是 import \"node:os\"，避免 Vite 解析 Node 内置。失败或浏览器：\"pi (browser)\"。"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/pi-user-agent.ts`  
被谁调用：各 `createClient` 的默认 `User-Agent`。

用 `process.getBuiltinModule("node:os")` 而不是 `import "node:os"`，避免 Vite 解析 Node 内置。失败或浏览器：`"pi (browser)"`。

厂家用 UA 做统计和风控。OAuth 的 Anthropic 路径会**覆盖**成 `claude-cli/...`（27 课），本函数那条不生效。

## 下一课

UTF-16 脏数据：[75-utils-sanitize-unicode.ts.md](/series/pi-source/ai/136-utils-sanitize-unicode-ts/)。
