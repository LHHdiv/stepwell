---
title: "github-copilot.ts — 三协议 + 订阅 OAuth + 按 token 滤模型"
summary: "把这家从三层里拆出来：工厂只负责 GitHub Copilot 的门牌和钥匙；协议是 三份 lazy api 的 map，无额外 header wrapper（Copilot 头写在模型 json 的 headers）；模型表是 git"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/github-copilot.ts`  
核心导出：`githubCopilotProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { githubCopilotProvider } from "@earendil-works/pi-ai/providers/github-copilot"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **GitHub Copilot** 的门牌和钥匙；协议是 三份 lazy api 的 map，无额外 header wrapper（Copilot 头写在**模型 json** 的 `headers`）；模型表是 [`github-copilot.models.ts`](/series/pi-source/ai/167-github-copilot-models-ts/) ← `data/github-copilot.json`（33 款，API 组：`anthropic-messages` (10)、`openai-completions` (8)、`openai-responses` (15)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是 **map**，按 `model.api` 分发。

## 这个文件在系统中的位置

```text
githubCopilotProvider()
  createProvider({
    id: "github-copilot",
    name: "GitHub Copilot",
    auth: ...,
    models: Object.values(GITHUB_COPILOT_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "github-copilot"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`githubCopilotProvider(): Provider<"anthropic-messages" | "openai-completions" | "openai-responses">`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** `https://api.individual.githubcopilot.com`

**鉴权：** `apiKey: envApiKeyAuth(..., ["COPILOT_GITHUB_TOKEN"])` + `oauth: lazyOAuth({ isSubscription: true, load: loadGitHubCopilotOAuth })`

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`githubCopilotProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("github-copilot", id)` **不**调用本函数，读 `MODELS["github-copilot"]`（即 GITHUB_COPILOT_MODELS）。`BuiltinProvider` 含 `"github-copilot"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

`filterModels`：仅当 credential 是 oauth 且带 `availableModelIds` 字符串数组时，按集合过滤。API key 路径不过滤——token 未必带名单。`getModels()` 仍返回全表；`Models.getAvailable()` 才走 filter。这是「目录完整、可用性随订阅变」的标准做法。

每条模型 json 都有 VS Code Copilot 伪装头（User-Agent、Editor-Version、Copilot-Integration-Id）。生成脚本里的 `COPILOT_STATIC_HEADERS`。协议层合并 model.headers，不是工厂 `headers` 字段。

Claude 走 Messages，Gemini/Kimi 走 Completions，GPT-5.x 走 Responses。同一把 Copilot 登录打三种 HTTP。

当前目录样本：`claude-haiku-4.5`、`claude-opus-4.5`、`claude-opus-4.6`、`claude-opus-4.7`、`claude-opus-4.8`、`claude-opus-5`、`claude-sonnet-4`、`claude-sonnet-4.5`、`claude-sonnet-4.6`、`claude-sonnet-5`。模型表里的 `baseUrl` 是 `https://api.individual.githubcopilot.com`。

`models: Object.values(GITHUB_COPILOT_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`github-copilot.models.ts`](/series/pi-source/ai/167-github-copilot-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
