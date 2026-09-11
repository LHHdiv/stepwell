---
title: "73 · utils/provider-env.ts — overlay → process.env → Bun /proc 回退"
summary: "coding-agent 另有 restoreSandboxEnv 补 process.env。本包可被单独 import，必须自己会读 /proc。"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/provider-env.ts`  
被谁调用：所有厂家读 `AWS_REGION`、`PI_CACHE_RETENTION`、OAuth host 覆盖等。

## `getProviderEnvValue(name, env?)`

1. `env?.[name]`（请求级 ProviderEnv）
2. `process.env[name]`
3. Bun 编译二进制在 Linux sandbox 里 `process.env` 可能是空的（Bun issue 27802）：读 `/proc/self/environ` 缓存成 Map

coding-agent 另有 `restoreSandboxEnv` 补 process.env。本包可被单独 import，必须自己会读 /proc。

空字符串：`env?.[name] || ...` 会跳过，和「未设置」一样。有意传空覆盖不了。

非 Bun 或 process.env 已有键：不碰 /proc。

## 下一课

User-Agent：[74-utils-pi-user-agent.ts.md](/series/pi-source/ai/135-utils-pi-user-agent-ts/)。
