---
title: "151 · mini/main.ts — 教学用三进程 Agent"
summary: "node .../mini/main.ts [--continue]。只认 -c/--continue。然后 runTui。这是把「presentation / server / worker」缩到可读体积的平行实现，不走 chord "
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/mini/main.ts`

`node .../mini/main.ts [--continue]`。只认 `-c/--continue`。然后 `runTui`。这是把「presentation / server / worker」缩到可读体积的平行实现，**不**走 chord 或 pi-server。正课跟 prompt 不必跑它；读实验拆分时从这里看协议更干净。

## 下一课

[152-experimental.mini.shared.protocol.ts.md](/series/pi-source/coding-agent/713-experimental-mini-shared-protocol-ts/)
