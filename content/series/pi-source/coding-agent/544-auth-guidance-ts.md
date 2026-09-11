---
title: "45 · auth-guidance.ts — 没登录时的人话"
summary: "三句模板，都指向 /login 和 docs/providers.md、docs/models.md（getDocsPath()）。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/auth-guidance.ts`  
被谁调用：`listModels` 空表；`AgentSession.prompt` 没模型/没 key；print 模式 exit 文案。

## 本课目标

三句模板，都指向 `/login` 和 `docs/providers.md`、`docs/models.md`（`getDocsPath()`）。

- `formatNoModelsAvailableMessage`：一家可用模型都没有
- `formatNoModelSelectedMessage`：有模型但没选，再提示 `/model`
- `formatNoApiKeyFoundMessage(provider)`：选了模型但没凭证；provider 为 `"unknown"` 时说 "the selected model"

`getProviderLoginHelp` 是公共尾巴。不读盘、不碰 runtime。

## 下一课

[46-extensions-types.ts.md](/series/pi-source/coding-agent/546-extensions-types-ts/)：扩展能登记的一切的类型合同。
