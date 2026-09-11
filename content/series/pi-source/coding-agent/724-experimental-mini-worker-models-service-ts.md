---
title: "163 · mini/worker/models-service.ts — Models 服务实现"
summary: "持有 ModelRuntime。refresh 复用交互模式的 refreshModelCatalogs（15s）。login 跑 runtime 的登录，把 AuthPrompt 去掉 signal 后 emit 给 TUI；TUI "
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/mini/worker/models-service.ts`

持有 `ModelRuntime`。`refresh` 复用交互模式的 `refreshModelCatalogs`（15s）。`login` 跑 runtime 的登录，把 `AuthPrompt` 去掉 signal 后 emit 给 TUI；TUI `authReply(requestId, answer)` 解开 pending map。`notice` 事件给状态字。

catalog 只发 `ModelSummary`（provider/id/name），完整 Model 留在 worker。

## 下一课

实验链到此结束。若还没读交互皮，回到 [27-interactive-mode.ts.md](/series/pi-source/coding-agent/508-interactive-mode-ts/)。执行链正课仍是 [11-agent-session.ts.md](/series/pi-source/coding-agent/477-agent-session-ts/) → agent 包。
