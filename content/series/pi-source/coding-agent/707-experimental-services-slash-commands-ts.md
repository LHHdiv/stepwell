---
title: "146 · services/slash-commands.ts — 本地斜杠注册表"
summary: "defineService(..., { local: true })：不过网。presentation 进程内插件 register/replace/list/subscribe。run 可以返回 AgentController 的 "
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/slash-commands.ts`

`defineService(..., { local: true })`：**不**过网。presentation 进程内插件 `register`/`replace`/`list`/`subscribe`。`run` 可以返回 AgentController 的 operation 结果（例如斜杠内部去 prompt）。`replace` 给 facet 热替换时新旧同名命令交接。

## 下一课

[147-experimental.services.slash-commands-provider.ts.md](/series/pi-source/coding-agent/708-experimental-services-slash-commands-provider-ts/)
