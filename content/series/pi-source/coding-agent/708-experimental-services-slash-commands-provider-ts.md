---
title: "147 · services/slash-commands-provider.ts — 注册表 + 内置斜杠"
summary: "SlashCommandRegistry：同名命令是栈，replace 压新的，unsubscribe 后露出底下那个——facet 热更不闪断。名字正则 ^[a-z0-9][a-z0-9:-]$。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/slash-commands-provider.ts`

`SlashCommandRegistry`：同名命令是栈，`replace` 压新的，unsubscribe 后露出底下那个——facet 热更不闪断。名字正则 `^[a-z0-9][a-z0-9:-]*$`。

`createBuiltInSlashCommandsFacet` 注册实验 TUI 的 `/model` `/thinking` `/reload` 等：通过 `PresentationUI.select` 选，通过远端 `Models` / `AgentController` / plugin reload 执行。和 InteractiveMode 的斜杠不是同一份代码。

## 下一课

[148-experimental.services.plugins.ts.md](/series/pi-source/coding-agent/709-experimental-services-plugins-ts/)
