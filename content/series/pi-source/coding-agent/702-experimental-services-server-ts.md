---
title: "141 · services/server.ts — server 进程提供的 chord 服务"
summary: "createExperimentalServerServices：把 list/create/remove/prepareSessionPlugins 包成 RemoteServiceProvider。directory 用 repli"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/server.ts`

`createExperimentalServerServices`：把 list/create/remove/prepareSessionPlugins 包成 RemoteServiceProvider。directory 用 `replicatedState`，mutation 串行化（`mutationTail`），每次改 revision 再 publish。每个 presentation attachClient 拿到自己的 provider 实例，但 singleton 服务共享。

插件 prepare 记住 `preparedPluginPackagePaths`，后续 reload 用同一选择。

## 下一课

[142-experimental.services.models.ts.md](/series/pi-source/coding-agent/703-experimental-services-models-ts/)
