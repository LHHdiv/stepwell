---
title: "132 · experimental/radius-auth.ts — 中继凭证"
summary: "RadiusRelayAuthResolver：每次 connect 都重新 resolve。PIOFFLINE 且 required 则 throw。显式 --auth token|file 优先；否则 ModelRuntime.ge"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/radius-auth.ts`

`RadiusRelayAuthResolver`：每次 connect 都重新 resolve。`PI_OFFLINE` 且 required 则 throw。显式 `--auth token|file` 优先；否则 `ModelRuntime.getAuth("radius")`，OAuth 至少留 5 分钟有效期。gateway 来自 `PI_RADIUS_GATEWAY` 或默认。

## 下一课

[133-experimental.radius-relay.ts.md](/series/pi-source/coding-agent/694-experimental-radius-relay-ts/)
