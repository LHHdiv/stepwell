---
title: "142 · services/models.ts — 复制的模型目录服务"
summary: "pi.models：state 含 catalog（revision + summaries）、当前 model/thinkingLevel、refresh 状态（idle/refreshing/done/warning+errors）"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/models.ts`

`pi.models`：state 含 catalog（revision + summaries）、当前 model/thinkingLevel、refresh 状态（idle/refreshing/done/warning+errors）。方法 select / cycleThinking / refresh。presentation 的 footer 和 /model 读这份复制状态，不持有 `Model` 类实例。

## 下一课

[143-experimental.services.models-provider.ts.md](/series/pi-source/coding-agent/704-experimental-services-models-provider-ts/)
