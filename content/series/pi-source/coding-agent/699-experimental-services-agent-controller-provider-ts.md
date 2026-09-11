---
title: "138 · services/agent-controller-provider.ts — Lane → AgentController"
summary: "worker 里 createAgentController(lane) 把 AgentPromptRequest 拆成 text + ImageContent[]，调 lane.prompt/steer/...，把 harness 的"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/agent-controller-provider.ts`

worker 里 `createAgentController(lane)` 把 `AgentPromptRequest` 拆成 text + `ImageContent[]`，调 `lane.prompt/steer/...`，把 harness 的 Result 映射成 `accepted/error`。`requestAbort` 失败则 throw（调用方当传输错误）。

## 下一课

[139-experimental.services.connection.ts.md](/series/pi-source/coding-agent/700-experimental-services-connection-ts/)
