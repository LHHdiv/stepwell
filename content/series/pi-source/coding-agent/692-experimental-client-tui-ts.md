---
title: "131 · experimental/client-tui.ts — 实验交互皮"
summary: "复用 createInteractiveTui、createChatViewport、CustomEditor、InteractiveThemeController，但 没有 AgentSession。ExperimentalClien"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/client-tui.ts`（约 804 行）

复用 `createInteractiveTui`、`createChatViewport`、`CustomEditor`、`InteractiveThemeController`，但 **没有** `AgentSession`。`ExperimentalClientTui` 是一个 Component：从 SessionDirectory 选会话、PresentationUI 弹 select、SlashCommands 跑本地斜杠、AgentController.prompt 发到 worker。

`runClientTui`：`openClientRuntime`、chord FacetHost 加载 bundled presentation plugins、keybindings、主题，然后 `ui.start` 直到退出。

slash 来自 `createBuiltInSlashCommandsFacet` + 远端 SlashCommands 服务。模型列表来自远端 Models 服务，不是本地 ModelRuntime。

## 失败与边界

这是实验产品皮，和 InteractiveMode 并行存在。不要在正课路径 import。连接断开时 attachment 变 degraded，视图应显示 connection state。

## 下一课

Radius：[132-experimental.radius-auth.ts.md](/series/pi-source/coding-agent/693-experimental-radius-auth-ts/)
