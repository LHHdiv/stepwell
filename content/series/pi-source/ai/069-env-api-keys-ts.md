---
title: "08 · env-api-keys.ts — 旧路径从环境变量找 API key"
summary: "能指出：getEnvApiKey(\"anthropic\") 为什么跳过 ANTHROPICAUTHTOKEN、Vertex/Bedrock 的 \"<authenticated>\" 哨兵是什么意思、浏览器里为什么用动态 import 而不"
tags: [pi, ai]
---
源码：`packages/ai/src/env-api-keys.ts`  
被谁调用：`compat.withEnvApiKey`；状态 UI 的「已配置哪些 env」。新产品走 `ApiKeyAuth.resolve` + `envApiKeyAuth`，**不**经过本文件。但变量名表两边必须一致。

## 本课目标

能指出：`getEnvApiKey("anthropic")` 为什么跳过 `ANTHROPIC_AUTH_TOKEN`、Vertex/Bedrock 的 `"<authenticated>"` 哨兵是什么意思、浏览器里为什么用动态 import 而不是顶层 `node:fs`。

## 在系统中的位置

```text
compat.streamSimple
  withEnvApiKey(model, options)
    getEnvApiKey(model.provider, options.env)
      findEnvKeys → 第一把真 key
      或 Vertex/Bedrock 哨兵
```

`options.env` 是请求级覆盖，优先于 `process.env`（经 `getProviderEnvValue`）。

## 动态 Node 模块

文件顶部故意不写 `import fs from "node:fs"`：

```ts
const NODE_FS_SPECIFIER = "node:" + "fs";  // 拆开，避免 bundler 静态分析
if (process.versions?.node || process.versions?.bun) {
  dynamicImport(NODE_FS_SPECIFIER).then(m => { _existsSync = m.existsSync; });
}
```

浏览器/Vite 打包不会把 fs 打进去。代价：启动瞬间 `_existsSync` 可能还是 null。`hasVertexAdcCredentials` 在 Node 下遇到这个竞态**不缓存 false**，下次再试；浏览器才永久缓存 false。

## `getApiKeyEnvVars`

一张 `provider → env 名` 表。特例：

- `github-copilot` → `COPILOT_GITHUB_TOKEN`（不是 GITHUB_TOKEN，避免误用普通 PAT）。
- `anthropic` → `[ANTHROPIC_AUTH_TOKEN, ANTHROPIC_OAUTH_TOKEN, ANTHROPIC_API_KEY]`。`findEnvKeys` 三个都报「已配置」；`getEnvApiKey` 只用后两个。
- `moonshotai` 和 `moonshotai-cn` 共用 `MOONSHOT_API_KEY`。
- `qwen-token-plan` 与 `qwen-token-plan-individual` 共用 `QWEN_TOKEN_PLAN_API_KEY`。
- `huggingface` → `HF_TOKEN`。
- `vercel-ai-gateway` → `AI_GATEWAY_API_KEY`。

表里没有的厂家（纯 OAuth 的 openai-codex、radius）`findEnvKeys` 返回 undefined。

## `findEnvKeys` vs `getEnvApiKey`

`findEnvKeys`：哪些变量实际有值。给状态 UI。「已配置」包含 `ANTHROPIC_AUTH_TOKEN`。

`getEnvApiKey`：能塞进 `options.apiKey` 的那把。

```ts
const apiKeyEnv = provider === "anthropic"
  ? envKeys.find((key) => key !== ANTHROPIC_AUTH_TOKEN_ENV)
  : envKeys[0];
```

`ANTHROPIC_AUTH_TOKEN` 必须当 `Authorization: Bearer`，Anthropic SDK 的 `apiKey` 字段会变成 `x-api-key`。compat 不擅自把它当 apiKey。新产品的 anthropic 工厂自己读这个变量设 `authToken`。

## Vertex ADC 与 Bedrock IAM

两家可以没有 API key：

**google-vertex**：`GOOGLE_APPLICATION_CREDENTIALS` 指向的文件存在，或 `~/.config/gcloud/application_default_credentials.json` 存在，并且有 project（`GOOGLE_CLOUD_PROJECT` 或 `GCLOUD_PROJECT`）和 `GOOGLE_CLOUD_LOCATION`。三者齐才返回 `"<authenticated>"`。

**amazon-bedrock**：以下任一即哨兵：`AWS_PROFILE`、access key+secret、`AWS_BEARER_TOKEN_BEDROCK`、ECS 相对/绝对 URI、`AWS_WEB_IDENTITY_TOKEN_FILE`。

compat 看到哨兵**不注入** apiKey（见 03 课）。厂家工厂的 `resolve()` 自己走 SDK 默认链。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 未知 provider | undefined |
| 只有 ANTHROPIC_AUTH_TOKEN | findEnvKeys 有值；getEnvApiKey 仍 undefined |
| Vertex 缺 location | 不返回哨兵，即使 ADC 文件在 |
| 启动瞬间 fs 未加载 | Vertex 检查返回 false 且不缓存（Node） |
| `options.env` 覆盖 | `getProviderEnvValue` 优先用它 |

## 下一课

compat 再导出的旧函数名：[09-legacy-api-aliases.ts.md](/series/pi-source/ai/070-legacy-api-aliases-ts/)。
