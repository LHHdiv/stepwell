---
title: "84 · bun/restore-sandbox-env.ts — Bun#27802 的补丁"
summary: "Bun 编译二进制在部分 sandbox（如 Linux/macOS 的 nono）里 process.env 是空对象。Linux 仍可从 /proc/self/environ 读到真实环境。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/bun/restore-sandbox-env.ts`

## 问题

Bun 编译二进制在部分 sandbox（如 Linux/macOS 的 nono）里 `process.env` 是空对象。Linux 仍可从 `/proc/self/environ` 读到真实环境。

## `restoreSandboxEnv`

1. 不是 bun → return  
2. `process.env` 已有键 → return  
3. 读 `/proc/self/environ`，按 `\0` 切，按第一个 `=` 填回 `process.env`  
4. 读失败忽略（macOS sandbox 没有 procfs）

必须与 `packages/ai/src/utils/provider-env.ts` 的 `getBunSandboxEnvValue` 保持一致：ai 包有直接消费者不经过本入口。

## 失败与边界

只修「完全空」的情况。部分 env 被剥掉时不会从 proc 补全，以免覆盖 sandbox 故意删的变量。

## 下一课

[85-bun.runtime-setup.ts.md](/series/pi-source/coding-agent/624-bun-runtime-setup-ts/)
