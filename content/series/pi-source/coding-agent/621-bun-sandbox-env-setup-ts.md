---
title: "83 · bun/sandbox-env-setup.ts — 侧效：恢复沙箱 env"
summary: "模块加载即 restoreSandboxEnv()。单独文件是为了在 runtime-setup.ts 和 cli.ts 求值之前跑完。不要把 restore 写进 cli.ts：那时 config.ts 可能已经读过空 env。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/bun/sandbox-env-setup.ts`

模块加载即 `restoreSandboxEnv()`。单独文件是为了在 `runtime-setup.ts` 和 `cli.ts` **求值之前**跑完。不要把 restore 写进 `cli.ts`：那时 `config.ts` 可能已经读过空 env。

## 下一课

[84-bun.restore-sandbox-env.ts.md](/series/pi-source/coding-agent/622-bun-restore-sandbox-env-ts/)
