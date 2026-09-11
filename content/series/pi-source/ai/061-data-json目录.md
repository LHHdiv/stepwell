---
title: "data/*.json — 生成出来的模型表，不是 40 个厂家实现"
summary: "目录：packages/ai/src/providers/data/ 生成：packages/ai/scripts/generate-models.ts（npm run generate-models / hydrate-model-d"
tags: [pi, ai]
---
目录：`packages/ai/src/providers/data/`  
生成：`packages/ai/scripts/generate-models.ts`（`npm run generate-models` / `hydrate-model-data`）  
清单：同目录 `.manifest.json`（schemaVersion 3、`generatedAt`、每文件 sha256、structureHash）  
**gitignore：** `packages/ai/src/providers/data/` 整目录不进 git。克隆后必须 hydrate，否则 `*.models.ts` 的 json import 在运行时失败。

## 本课目标

不要为每个 json 开空课。读完应能回答：

1. json 是第 **3** 层（模型表），不是厂家工厂，也不是 `model.api` 协议实现。
2. 谁加载：只有对应 `<id>.models.ts`，通过 `import values from "./data/<id>.json" with { type: "json" }`。
3. 和 `*.models.ts`：json 按 **api 分组** 以便 `typeof values` 推出每款模型的 api 字面量；models.ts 用 `flattenModelCatalog` 摊成 `Record<id, Model>`。
4. `all.ts` 不读 json。它读 `MODELS`（已 flatten）和各 `*Provider()`。

## 这个目录在系统中的位置

```text
上游（models.dev / OpenRouter / Vercel gateway / 各官方列表）
  → generate-models.ts 滤 tool-capable、补 compat/headers/thinkingLevelMap
  → data/<id>.json     { [api]: { [modelId]: Model } }
  → <id>.models.ts     flatten → CONST_MODELS
  → models.generated.ts  MODELS[id] = CONST_MODELS
  → <id>.ts            createProvider({ models: Object.values(CONST_MODELS), api: ... })
  → all.ts             setProvider
```

公开的 `--json-only` 目录（`generate-model-catalog`）是**扁的** `{ modelId: Model }`，给外部目录用。内部 data json 才分组，注释写得很清楚：*Only the ignored internal data is grouped by API for type derivation.*

## 导出什么

json 不是 TS 模块导出。运行时 default import 得到分组对象。类型靠 `resolveJsonModule` 从文件推断，所以分组键必须是 api 名，模型键必须是模型 id。

`data-json.d.ts` 是 `declare module "*.json"` 的后备；**build tsconfig 排除了 `*.d.ts`**，正式编译走真实 json 类型。见 [data-json.d.ts.md](/series/pi-source/ai/161-data-json-d-ts/)。

## 如何鉴权 / baseUrl

json **没有** login 函数。每条模型可带：

- `baseUrl`：请求 URL（可含占位符或空串）
- `headers`：Copilot 伪装头、NVIDIA 轮询头
- `cost` / `cost.tiers`：`calculateCost` 用
- `compat`：协议方言（store、reasoning effort、Fireworks adaptive thinking…）
- `thinkingLevelMap`：`clampThinkingLevel` 用

钥匙在厂家工厂的 `auth`。

## 和 all.ts 的关系

`all.ts` import `./data/.manifest.json` **只为** `getBuiltinModelDataGeneratedAt()`。模型内容走 `MODELS`。Radius、faux、图像 OpenRouter 不在本目录。

## 校验

`scripts/model-data.ts`：每个 json 必须非空、api 组为对象、模型 id 全局唯一、字段形状合法。`models.generated.ts` 的 import 列表必须和 `*.models.ts` / json 文件名一一对应。structureHash 变了而没重新生成包装会失败。

## 文件一览

- [`amazon-bedrock.json`](#amazon-bedrock) · 121 款 · `bedrock-converse-stream` (121)
- [`ant-ling.json`](#ant-ling) · 3 款 · `openai-completions` (3)
- [`anthropic.json`](#anthropic) · 14 款 · `anthropic-messages` (14)
- [`azure-openai-responses.json`](#azure-openai-responses) · 38 款 · `azure-openai-responses` (38)
- [`baseten.json`](#baseten) · 19 款 · `openai-completions` (19)
- [`cerebras.json`](#cerebras) · 2 款 · `openai-completions` (2)
- [`cloudflare-ai-gateway.json`](#cloudflare-ai-gateway) · 49 款 · `anthropic-messages` (10)、`openai-completions` (18)、`openai-responses` (21)
- [`cloudflare-workers-ai.json`](#cloudflare-workers-ai) · 18 款 · `openai-completions` (18)
- [`deepseek.json`](#deepseek) · 3 款 · `openai-completions` (3)
- [`fireworks.json`](#fireworks) · 19 款 · `anthropic-messages` (15)、`openai-completions` (4)
- [`github-copilot.json`](#github-copilot) · 33 款 · `anthropic-messages` (10)、`openai-completions` (8)、`openai-responses` (15)
- [`google.json`](#google) · 22 款 · `google-generative-ai` (22)
- [`google-vertex.json`](#google-vertex) · 14 款 · `google-vertex` (14)
- [`groq.json`](#groq) · 7 款 · `openai-completions` (7)
- [`huggingface.json`](#huggingface) · 70 款 · `openai-completions` (70)
- [`kimi-coding.json`](#kimi-coding) · 4 款 · `anthropic-messages` (4)
- [`minimax.json`](#minimax) · 3 款 · `anthropic-messages` (3)
- [`minimax-cn.json`](#minimax-cn) · 3 款 · `anthropic-messages` (3)
- [`mistral.json`](#mistral) · 32 款 · `mistral-conversations` (32)
- [`moonshotai.json`](#moonshotai) · 10 款 · `openai-completions` (10)
- [`moonshotai-cn.json`](#moonshotai-cn) · 10 款 · `openai-completions` (10)
- [`nvidia.json`](#nvidia) · 21 款 · `openai-completions` (21)
- [`openai.json`](#openai) · 38 款 · `openai-responses` (38)
- [`openai-codex.json`](#openai-codex) · 7 款 · `openai-codex-responses` (7)
- [`opencode.json`](#opencode) · 63 款 · `anthropic-messages` (14)、`google-generative-ai` (7)、`openai-completions` (17)、`openai-responses` (25)
- [`opencode-go.json`](#opencode-go) · 26 款 · `anthropic-messages` (2)、`openai-completions` (20)、`openai-responses` (4)
- [`openrouter.json`](#openrouter) · 360 款 · `openai-completions` (360)
- [`qwen-token-plan.json`](#qwen-token-plan) · 18 款 · `openai-completions` (18)
- [`qwen-token-plan-cn.json`](#qwen-token-plan-cn) · 18 款 · `openai-completions` (18)
- [`qwen-token-plan-individual.json`](#qwen-token-plan-individual) · 8 款 · `openai-completions` (8)
- [`together.json`](#together) · 21 款 · `openai-completions` (21)
- [`vercel-ai-gateway.json`](#vercel-ai-gateway) · 233 款 · `anthropic-messages` (233)
- [`xai.json`](#xai) · 4 款 · `openai-responses` (4)
- [`xiaomi.json`](#xiaomi) · 3 款 · `openai-completions` (3)
- [`xiaomi-token-plan-ams.json`](#xiaomi-token-plan-ams) · 2 款 · `openai-completions` (2)
- [`xiaomi-token-plan-cn.json`](#xiaomi-token-plan-cn) · 2 款 · `openai-completions` (2)
- [`xiaomi-token-plan-sgp.json`](#xiaomi-token-plan-sgp) · 2 款 · `openai-completions` (2)
- [`zai.json`](#zai) · 7 款 · `openai-completions` (7)
- [`zai-coding-cn.json`](#zai-coding-cn) · 10 款 · `openai-completions` (10)

---

<a id="amazon-bedrock"></a>
## `amazon-bedrock.json`

对应厂家 id **`amazon-bedrock`**（显示名：Amazon Bedrock）。

**谁加载：** [amazon-bedrock.models.ts](/series/pi-source/ai/143-amazon-bedrock-models-ts/) `import values from "./data/amazon-bedrock.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("amazon-bedrock", values)` 摊平后成为 `AMAZON_BEDROCK_MODELS`。厂家工厂 [`amazon-bedrock.ts`](/series/pi-source/ai/144-amazon-bedrock-ts/) 的 `amazonBedrockProvider()` 再 `Object.values(AMAZON_BEDROCK_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `bedrock-converse-stream`：121 款（样本 `amazon.nova-2-lite-v1:0`、`amazon.nova-lite-v1:0`、`amazon.nova-micro-v1:0`、`amazon.nova-pro-v1:0`、`anthropic.claude-fable-5`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里出现过这些 `baseUrl`：`https://bedrock-runtime.us-east-1.amazonaws.com`、`https://bedrock-runtime.eu-central-1.amazonaws.com`。）。钥匙在工厂。

**注意：** Bedrock 是云托管的「别人的模型」。模型 id 带厂商前缀：`anthropic.claude-opus-4-8`、`openai.gpt-5.6-sol`、`meta.llama4-scout-...`、`eu.anthropic.` 区域前缀。**协议不是** anthropic-messages，一律 `bedrock-converse-stream`。

<a id="ant-ling"></a>
## `ant-ling.json`

对应厂家 id **`ant-ling`**（显示名：Ant Ling）。

**谁加载：** [ant-ling.models.ts](/series/pi-source/ai/145-ant-ling-models-ts/) `import values from "./data/ant-ling.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("ant-ling", values)` 摊平后成为 `ANT_LING_MODELS`。厂家工厂 [`ant-ling.ts`](/series/pi-source/ai/146-ant-ling-ts/) 的 `antLingProvider()` 再 `Object.values(ANT_LING_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：3 款（样本 `Ling-2.6-1T`、`Ling-2.6-flash`、`Ring-2.6-1T`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.ant-ling.com/v1`。）。钥匙在工厂。

**注意：** 三款：`Ling-2.6-1T`、`Ling-2.6-flash`、`Ring-2.6-1T`（带思考）。协议是 completions 不是 Responses。json 里每条都有 `compat`，用来关掉 OpenAI 官方才有的 store/developer role 等字段。

<a id="anthropic"></a>
## `anthropic.json`

对应厂家 id **`anthropic`**（显示名：Anthropic）。

**谁加载：** [anthropic.models.ts](/series/pi-source/ai/147-anthropic-models-ts/) `import values from "./data/anthropic.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("anthropic", values)` 摊平后成为 `ANTHROPIC_MODELS`。厂家工厂 [`anthropic.ts`](/series/pi-source/ai/148-anthropic-ts/) 的 `anthropicProvider()` 再 `Object.values(ANTHROPIC_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `anthropic-messages`：14 款（样本 `claude-fable-5`、`claude-fable-5-1`、`claude-haiku-4-5`、`claude-haiku-4-5-20251001`、`claude-opus-4-5`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.anthropic.com`。）。钥匙在工厂 [`anthropic.ts`](/series/pi-source/ai/148-anthropic-ts/)：`ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN`（Bearer）/ `ANTHROPIC_OAUTH_TOKEN`，外加 Claude Pro/Max OAuth。

**注意：** 14 款全是 `anthropic-messages`。`thinkingLevelMap`、`compat.forceAdaptiveThinking`、`allowedFallbackModels`（fable → opus-4-8/opus-5）都写在本 json，不在工厂函数体。MiniMax / Kimi Coding 复用同一协议，但读的是它们自己的 json。

<a id="azure-openai-responses"></a>
## `azure-openai-responses.json`

对应厂家 id **`azure-openai-responses`**（显示名：Azure OpenAI）。

**谁加载：** [azure-openai-responses.models.ts](/series/pi-source/ai/149-azure-openai-responses-models-ts/) `import values from "./data/azure-openai-responses.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("azure-openai-responses", values)` 摊平后成为 `AZURE_OPENAI_RESPONSES_MODELS`。厂家工厂 [`azure-openai-responses.ts`](/series/pi-source/ai/150-azure-openai-responses-ts/) 的 `azureOpenAIResponsesProvider()` 再 `Object.values(AZURE_OPENAI_RESPONSES_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `azure-openai-responses`：38 款（样本 `gpt-4`、`gpt-4-turbo`、`gpt-4.1`、`gpt-4.1-mini`、`gpt-4.1-nano`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `(空字符串)`。）。钥匙在工厂。

**注意：** Azure 的 Responses 和官方 OpenAI 不是同一条 HTTP：api-version、部署名、鉴权头都不同，所以有独立 `KnownApi`。模型 id 看起来像 `gpt-5.4`，但不能拿 openai 厂的 Model 对象去打 Azure——`provider` 字段不同，`Models.requireProvider` 会找错厂家。

<a id="baseten"></a>
## `baseten.json`

对应厂家 id **`baseten`**（显示名：Baseten）。

**谁加载：** [baseten.models.ts](/series/pi-source/ai/151-baseten-models-ts/) `import values from "./data/baseten.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("baseten", values)` 摊平后成为 `BASETEN_MODELS`。厂家工厂 [`baseten.ts`](/series/pi-source/ai/152-baseten-ts/) 的 `basetenProvider()` 再 `Object.values(BASETEN_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：19 款（样本 `deepseek-ai/DeepSeek-V4-Flash-0731`、`deepseek-ai/DeepSeek-V4-Pro`、`deepseek-ai/DeepSeek-V4-Pro-0813`、`moonshotai/Kimi-K2.5`、`moonshotai/Kimi-K2.6`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://inference.baseten.co/v1`。）。钥匙在工厂。

**注意：** 19 款，id 带组织前缀（`moonshotai/Kimi-K3`、`deepseek-ai/DeepSeek-V4-Pro`）。全是 reasoning + compat。厂家 URL 与 json 一致。

<a id="cerebras"></a>
## `cerebras.json`

对应厂家 id **`cerebras`**（显示名：Cerebras）。

**谁加载：** [cerebras.models.ts](/series/pi-source/ai/153-cerebras-models-ts/) `import values from "./data/cerebras.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("cerebras", values)` 摊平后成为 `CEREBRAS_MODELS`。厂家工厂 [`cerebras.ts`](/series/pi-source/ai/154-cerebras-ts/) 的 `cerebrasProvider()` 再 `Object.values(CEREBRAS_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：2 款（样本 `gemma-4-31b`、`gpt-oss-120b`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.cerebras.ai/v1`。）。钥匙在工厂。

**注意：** 目录极小：`gemma-4-31b`、`gpt-oss-120b`。两款都 reasoning，带 `thinkingLevelMap`。别把 Cerebras 的 `gpt-oss-120b` 和 Groq/Together 上同名模型当成同一个 `Model`——`provider` 不同。

<a id="cloudflare-ai-gateway"></a>
## `cloudflare-ai-gateway.json`

对应厂家 id **`cloudflare-ai-gateway`**（显示名：Cloudflare AI Gateway）。

**谁加载：** [cloudflare-ai-gateway.models.ts](/series/pi-source/ai/155-cloudflare-ai-gateway-models-ts/) `import values from "./data/cloudflare-ai-gateway.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("cloudflare-ai-gateway", values)` 摊平后成为 `CLOUDFLARE_AI_GATEWAY_MODELS`。厂家工厂 [`cloudflare-ai-gateway.ts`](/series/pi-source/ai/156-cloudflare-ai-gateway-ts/) 的 `cloudflareAIGatewayProvider()` 再 `Object.values(CLOUDFLARE_AI_GATEWAY_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `anthropic-messages`：10 款（样本 `claude-fable-5`、`claude-haiku-4.5`、`claude-opus-4.5`、`claude-opus-4.6`、`claude-opus-4.7`）
- `openai-completions`：18 款（样本 `workers-ai/@cf/deepseek-ai/deepseek-v4-flash-0731`、`workers-ai/@cf/deepseek-ai/deepseek-v4-pro-0813`、`workers-ai/@cf/google/gemma-4-26b-a4b-it`、`workers-ai/@cf/ibm-granite/granite-4.0-h-micro`、`workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast`）
- `openai-responses`：21 款（样本 `gpt-4.1`、`gpt-4.1-mini`、`gpt-4.1-nano`、`gpt-4o`、`gpt-4o-mini`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里出现过这些 `baseUrl`：`https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/anthropic`、`https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/compat`、`https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/openai`。）。钥匙在工厂。

**注意：** 注释写明：`api` map **钉死三份协议**，即使 models.dev 某一天把 `workers-ai/*`（completions）从目录拿掉。若按「当前 json 推断 api 键」，目录空窗期会让 `createProvider` 拒收 openai-completions。

<a id="cloudflare-workers-ai"></a>
## `cloudflare-workers-ai.json`

对应厂家 id **`cloudflare-workers-ai`**（显示名：Cloudflare Workers AI）。

**谁加载：** [cloudflare-workers-ai.models.ts](/series/pi-source/ai/159-cloudflare-workers-ai-models-ts/) `import values from "./data/cloudflare-workers-ai.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("cloudflare-workers-ai", values)` 摊平后成为 `CLOUDFLARE_WORKERS_AI_MODELS`。厂家工厂 [`cloudflare-workers-ai.ts`](/series/pi-source/ai/160-cloudflare-workers-ai-ts/) 的 `cloudflareWorkersAIProvider()` 再 `Object.values(CLOUDFLARE_WORKERS_AI_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：18 款（样本 `@cf/deepseek-ai/deepseek-v4-flash-0731`、`@cf/deepseek-ai/deepseek-v4-pro-0813`、`@cf/google/gemma-4-26b-a4b-it`、`@cf/ibm-granite/granite-4.0-h-micro`、`@cf/meta/llama-3.3-70b-instruct-fp8-fast`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1`。）。钥匙在工厂。

**注意：** 18 款，id 形如 `@cf/meta/llama-4-scout-17b-16e-instruct`。协议只有 completions。和 AI Gateway 共享 `cloudflare-auth.ts` 的字段合并规则（credential 里只有 key 时，account id 仍可从环境补）。

<a id="deepseek"></a>
## `deepseek.json`

对应厂家 id **`deepseek`**（显示名：DeepSeek）。

**谁加载：** [deepseek.models.ts](/series/pi-source/ai/162-deepseek-models-ts/) `import values from "./data/deepseek.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("deepseek", values)` 摊平后成为 `DEEPSEEK_MODELS`。厂家工厂 [`deepseek.ts`](/series/pi-source/ai/163-deepseek-ts/) 的 `deepseekProvider()` 再 `Object.values(DEEPSEEK_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：3 款（样本 `deepseek-v4-flash`、`deepseek-v4-flash-vision-exp`、`deepseek-v4-pro`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.deepseek.com`。）。钥匙在工厂。

**注意：** 三款：`deepseek-v4-flash`、`deepseek-v4-flash-vision-exp`、`deepseek-v4-pro`。思考等级映射在 json（Flash 允 low，Pro 往往从 high 起）。Fireworks/Together 上也有 DeepSeek 权重，那是别的厂家。

<a id="fireworks"></a>
## `fireworks.json`

对应厂家 id **`fireworks`**（显示名：Fireworks）。

**谁加载：** [fireworks.models.ts](/series/pi-source/ai/165-fireworks-models-ts/) `import values from "./data/fireworks.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("fireworks", values)` 摊平后成为 `FIREWORKS_MODELS`。厂家工厂 [`fireworks.ts`](/series/pi-source/ai/166-fireworks-ts/) 的 `fireworksProvider()` 再 `Object.values(FIREWORKS_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `anthropic-messages`：15 款（样本 `accounts/fireworks/models/deepseek-v4-flash-0731`、`accounts/fireworks/models/deepseek-v4-flash-vision-exp`、`accounts/fireworks/models/deepseek-v4-pro-0813`、`accounts/fireworks/models/glm-5p3`、`accounts/fireworks/models/glm-5p3-flash`）
- `openai-completions`：4 款（样本 `accounts/fireworks/models/glm-5p2`、`accounts/fireworks/models/kimi-k3`、`accounts/fireworks/routers/glm-5p2-fast`、`accounts/fireworks/routers/kimi-k3-fast`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里出现过这些 `baseUrl`：`https://api.fireworks.ai/inference`、`https://api.fireworks.ai/inference/v1`。）。钥匙在工厂。

**注意：** 这是「`api` 为 map」的教材。`createProvider` 按 `model.api` 选 streams；json 把 DeepSeek/GLM/Kimi 等放进 Messages 组（15），把 glm-5p2、kimi-k3 及 fast router 放进 Completions 组（4）。

<a id="github-copilot"></a>
## `github-copilot.json`

对应厂家 id **`github-copilot`**（显示名：GitHub Copilot）。

**谁加载：** [github-copilot.models.ts](/series/pi-source/ai/167-github-copilot-models-ts/) `import values from "./data/github-copilot.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("github-copilot", values)` 摊平后成为 `GITHUB_COPILOT_MODELS`。厂家工厂 [`github-copilot.ts`](/series/pi-source/ai/168-github-copilot-ts/) 的 `githubCopilotProvider()` 再 `Object.values(GITHUB_COPILOT_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `anthropic-messages`：10 款（样本 `claude-haiku-4.5`、`claude-opus-4.5`、`claude-opus-4.6`、`claude-opus-4.7`、`claude-opus-4.8`）
- `openai-completions`：8 款（样本 `claude-fable-5`、`gemini-3.1-pro-preview`、`gemini-3.5-flash`、`gemini-3.6-flash`、`gemini-3.7-flash`）
- `openai-responses`：15 款（样本 `gpt-5-mini`、`gpt-5.2`、`gpt-5.2-codex`、`gpt-5.3-codex`、`gpt-5.4`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.individual.githubcopilot.com`。）。钥匙在工厂。

**注意：** `filterModels`：仅当 credential 是 oauth 且带 `availableModelIds` 字符串数组时，按集合过滤。API key 路径不过滤——token 未必带名单。`getModels()` 仍返回全表；`Models.getAvailable()` 才走 filter。这是「目录完整、可用性随订阅变」的标准做法。

<a id="google"></a>
## `google.json`

对应厂家 id **`google`**（显示名：Google）。

**谁加载：** [google.models.ts](/series/pi-source/ai/171-google-models-ts/) `import values from "./data/google.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("google", values)` 摊平后成为 `GOOGLE_MODELS`。厂家工厂 [`google.ts`](/series/pi-source/ai/172-google-ts/) 的 `googleProvider()` 再 `Object.values(GOOGLE_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `google-generative-ai`：22 款（样本 `deep-research-max-preview-04-2026`、`deep-research-preview-04-2026`、`gemini-2.5-computer-use-preview-10-2025`、`gemini-2.5-flash`、`gemini-2.5-flash-lite`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://generativelanguage.googleapis.com/v1beta`。）。钥匙在工厂。

**注意：** 22 款 Gemini / Deep Research / computer-use。协议 `google-generative-ai` 与 Vertex 的 `google-vertex` 是两份实现（`google-shared.ts` 抽公共思考等级）。AI Studio key 打这家；GCP 项目打 [google-vertex.ts](/series/pi-source/ai/170-google-vertex-ts/)。

<a id="google-vertex"></a>
## `google-vertex.json`

对应厂家 id **`google-vertex`**（显示名：Google Vertex AI）。

**谁加载：** [google-vertex.models.ts](/series/pi-source/ai/169-google-vertex-models-ts/) `import values from "./data/google-vertex.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("google-vertex", values)` 摊平后成为 `GOOGLE_VERTEX_MODELS`。厂家工厂 [`google-vertex.ts`](/series/pi-source/ai/170-google-vertex-ts/) 的 `googleVertexProvider()` 再 `Object.values(GOOGLE_VERTEX_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `google-vertex`：14 款（样本 `gemini-2.5-flash`、`gemini-2.5-flash-lite`、`gemini-2.5-pro`、`gemini-3-flash-preview`、`gemini-3.1-flash-lite`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://{location}-aiplatform.googleapis.com`。）。钥匙在工厂。

**注意：** ADC 路径默认 `~/.config/gcloud/application_default_credentials.json`，可用 `GOOGLE_APPLICATION_CREDENTIALS` 覆盖。project 认 `GOOGLE_CLOUD_PROJECT` 或 `GCLOUD_PROJECT`。缺 location 视为未配置——协议自己读这些 env 拼 URL，工厂只负责「配齐了没有」。

<a id="groq"></a>
## `groq.json`

对应厂家 id **`groq`**（显示名：Groq）。

**谁加载：** [groq.models.ts](/series/pi-source/ai/173-groq-models-ts/) `import values from "./data/groq.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("groq", values)` 摊平后成为 `GROQ_MODELS`。厂家工厂 [`groq.ts`](/series/pi-source/ai/174-groq-ts/) 的 `groqProvider()` 再 `Object.values(GROQ_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：7 款（样本 `llama-3.1-8b-instant`、`llama-3.3-70b-versatile`、`openai/gpt-oss-120b`、`openai/gpt-oss-20b`、`openai/gpt-oss-safeguard-20b`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.groq.com/openai/v1`。）。钥匙在工厂。

**注意：** 7 款：Llama 速推、gpt-oss、Qwen。路径已经含 `/openai/v1`，协议层会再拼 `/chat/completions`。5 款 reasoning。json 目前没有 compat 字段——Groq 的 OpenAI 子集够用默认。

<a id="huggingface"></a>
## `huggingface.json`

对应厂家 id **`huggingface`**（显示名：Hugging Face）。

**谁加载：** [huggingface.models.ts](/series/pi-source/ai/175-huggingface-models-ts/) `import values from "./data/huggingface.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("huggingface", values)` 摊平后成为 `HUGGINGFACE_MODELS`。厂家工厂 [`huggingface.ts`](/series/pi-source/ai/176-huggingface-ts/) 的 `huggingfaceProvider()` 再 `Object.values(HUGGINGFACE_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：70 款（样本 `MiniMaxAI/MiniMax-M2`、`MiniMaxAI/MiniMax-M2.1`、`MiniMaxAI/MiniMax-M2.5`、`MiniMaxAI/MiniMax-M2.7`、`MiniMaxAI/MiniMax-M3`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://router.huggingface.co/v1`。）。钥匙在工厂。

**注意：** id 是 Hub 风格 `Qwen/Qwen3-Coder-...`。70 款里 56 款 reasoning。路由器背后是多家推理后端，失败模式是路由错误而不是「HF 没这模型」——那是协议/HTTP 层的事，工厂只提供目录。

<a id="kimi-coding"></a>
## `kimi-coding.json`

对应厂家 id **`kimi-coding`**（显示名：Kimi For Coding）。

**谁加载：** [kimi-coding.models.ts](/series/pi-source/ai/177-kimi-coding-models-ts/) `import values from "./data/kimi-coding.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("kimi-coding", values)` 摊平后成为 `KIMI_CODING_MODELS`。厂家工厂 [`kimi-coding.ts`](/series/pi-source/ai/178-kimi-coding-ts/) 的 `kimiCodingProvider()` 再 `Object.values(KIMI_CODING_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `anthropic-messages`：4 款（样本 `k3`、`k3-256k`、`kimi-for-coding`、`kimi-for-coding-highspeed`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.kimi.com/coding`。）。钥匙在工厂。

**注意：** 四款：`k3`、`k3-256k`、`kimi-for-coding`、`kimi-for-coding-highspeed`。订阅在 models.dev 上标价为零，生成脚本用 Moonshot 等价费率填 `KIMI_CODING_IMPLIED_COSTS`，让 usage.cost 反映「这笔订阅调用值多少」，不是账单。

<a id="minimax"></a>
## `minimax.json`

对应厂家 id **`minimax`**（显示名：MiniMax）。

**谁加载：** [minimax.models.ts](/series/pi-source/ai/181-minimax-models-ts/) `import values from "./data/minimax.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("minimax", values)` 摊平后成为 `MINIMAX_MODELS`。厂家工厂 [`minimax.ts`](/series/pi-source/ai/182-minimax-ts/) 的 `minimaxProvider()` 再 `Object.values(MINIMAX_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `anthropic-messages`：3 款（样本 `MiniMax-M2.7`、`MiniMax-M2.7-highspeed`、`MiniMax-M3`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.minimax.io/anthropic`。）。钥匙在工厂。

**注意：** 三款 M2.7 / highspeed / M3。国际域名 `minimax.io`。国内站是 `minimax-cn` + `MINIMAX_CN_API_KEY` + `minimaxi.com`。模型 id 相同，厂家 id 不同，凭证不通用。

<a id="minimax-cn"></a>
## `minimax-cn.json`

对应厂家 id **`minimax-cn`**（显示名：MiniMax CN）。

**谁加载：** [minimax-cn.models.ts](/series/pi-source/ai/179-minimax-cn-models-ts/) `import values from "./data/minimax-cn.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("minimax-cn", values)` 摊平后成为 `MINIMAX_CN_MODELS`。厂家工厂 [`minimax-cn.ts`](/series/pi-source/ai/180-minimax-cn-ts/) 的 `minimaxCnProvider()` 再 `Object.values(MINIMAX_CN_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `anthropic-messages`：3 款（样本 `MiniMax-M2.7`、`MiniMax-M2.7-highspeed`、`MiniMax-M3`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.minimaxi.com/anthropic`。）。钥匙在工厂。

**注意：** 目录与国际站同款 id，端点和钥匙隔离。Agent 会话里记的是 `minimax-cn/MiniMax-M3`，换国际站等于换厂家。

<a id="mistral"></a>
## `mistral.json`

对应厂家 id **`mistral`**（显示名：Mistral）。

**谁加载：** [mistral.models.ts](/series/pi-source/ai/183-mistral-models-ts/) `import values from "./data/mistral.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("mistral", values)` 摊平后成为 `MISTRAL_MODELS`。厂家工厂 [`mistral.ts`](/series/pi-source/ai/184-mistral-ts/) 的 `mistralProvider()` 再 `Object.values(MISTRAL_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `mistral-conversations`：32 款（样本 `codestral-latest`、`devstral-2512`、`devstral-latest`、`devstral-medium-2507`、`devstral-medium-latest`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.mistral.ai`。）。钥匙在工厂。

**注意：** 32 款：codestral、devstral、magistral、ministral、voxtral 等。`KnownApi` 里单独的 `mistral-conversations`。只有 8 款标 reasoning。不要用 openai-completions 去打官方 Mistral——工厂没登记那份协议。

<a id="moonshotai"></a>
## `moonshotai.json`

对应厂家 id **`moonshotai`**（显示名：Moonshot AI）。

**谁加载：** [moonshotai.models.ts](/series/pi-source/ai/187-moonshotai-models-ts/) `import values from "./data/moonshotai.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("moonshotai", values)` 摊平后成为 `MOONSHOTAI_MODELS`。厂家工厂 [`moonshotai.ts`](/series/pi-source/ai/188-moonshotai-ts/) 的 `moonshotaiProvider()` 再 `Object.values(MOONSHOTAI_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：10 款（样本 `kimi-k2-0711-preview`、`kimi-k2-0905-preview`、`kimi-k2-thinking`、`kimi-k2-thinking-turbo`、`kimi-k2-turbo-preview`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.moonshot.ai/v1`。）。钥匙在工厂。

**注意：** 10 款 kimi-k2* / k3。与国内站 **共用** `MOONSHOT_API_KEY` 变量名——`env-api-keys.ts` 两家都映射到它。钥匙能开两扇门，但 `Models` 按 provider id 分凭证槽：auth.json 里 `moonshotai` 和 `moonshotai-cn` 是两条。

<a id="moonshotai-cn"></a>
## `moonshotai-cn.json`

对应厂家 id **`moonshotai-cn`**（显示名：Moonshot AI CN）。

**谁加载：** [moonshotai-cn.models.ts](/series/pi-source/ai/185-moonshotai-cn-models-ts/) `import values from "./data/moonshotai-cn.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("moonshotai-cn", values)` 摊平后成为 `MOONSHOTAI_CN_MODELS`。厂家工厂 [`moonshotai-cn.ts`](/series/pi-source/ai/186-moonshotai-cn-ts/) 的 `moonshotaiCnProvider()` 再 `Object.values(MOONSHOTAI_CN_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：10 款（样本 `kimi-k2-0711-preview`、`kimi-k2-0905-preview`、`kimi-k2-thinking`、`kimi-k2-thinking-turbo`、`kimi-k2-turbo-preview`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.moonshot.cn/v1`。）。钥匙在工厂。

**注意：** 模型 id 与国际站对齐，域名 `.cn`。编程订阅走 `kimi-coding`，不是这家。

<a id="nvidia"></a>
## `nvidia.json`

对应厂家 id **`nvidia`**（显示名：NVIDIA）。

**谁加载：** [nvidia.models.ts](/series/pi-source/ai/189-nvidia-models-ts/) `import values from "./data/nvidia.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("nvidia", values)` 摊平后成为 `NVIDIA_MODELS`。厂家工厂 [`nvidia.ts`](/series/pi-source/ai/190-nvidia-ts/) 的 `nvidiaProvider()` 再 `Object.values(NVIDIA_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：21 款（样本 `deepseek-ai/deepseek-v4-flash-0731`、`deepseek-ai/deepseek-v4-pro-0813`、`google/gemma-3-12b-it`、`google/gemma-3-4b-it`、`meta/llama-3.2-11b-vision-instruct`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://integrate.api.nvidia.com/v1`。）。钥匙在工厂。

**注意：** 21 款。生成脚本给**每条**模型打上 `headers: { "NVCF-POLL-SECONDS": "3600" }`，长推理轮询。工厂 `headers` 字段是空的——头在模型表。部分 id 在 `NVIDIA_NIM_UNSUPPORTED_MODELS` 被生成器排除，所以 json 不是 NIM 全量。

<a id="openai"></a>
## `openai.json`

对应厂家 id **`openai`**（显示名：OpenAI）。

**谁加载：** [openai.models.ts](/series/pi-source/ai/193-openai-models-ts/) `import values from "./data/openai.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("openai", values)` 摊平后成为 `OPENAI_MODELS`。厂家工厂 [`openai.ts`](/series/pi-source/ai/194-openai-ts/) 的 `openaiProvider()` 再 `Object.values(OPENAI_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-responses`：38 款（样本 `gpt-4`、`gpt-4-turbo`、`gpt-4.1`、`gpt-4.1-mini`、`gpt-4.1-nano`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（`https://api.openai.com/v1`）。钥匙在工厂：仅 `OPENAI_API_KEY`。ChatGPT 订阅不走这份表，走 [`openai-codex.json`](#openai-codex)。

**注意：** 全组 `openai-responses`，不是 Completions。GPT-5.x 带 `thinkingLevelMap` 和 `cost.tiers`（超 272k 输入加价）。Azure 上同名 GPT 是另一份 json、空 baseUrl。

<a id="openai-codex"></a>
## `openai-codex.json`

对应厂家 id **`openai-codex`**（显示名：OpenAI Codex）。

**谁加载：** [openai-codex.models.ts](/series/pi-source/ai/191-openai-codex-models-ts/) `import values from "./data/openai-codex.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("openai-codex", values)` 摊平后成为 `OPENAI_CODEX_MODELS`。厂家工厂 [`openai-codex.ts`](/series/pi-source/ai/192-openai-codex-ts/) 的 `openaiCodexProvider()` 再 `Object.values(OPENAI_CODEX_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-codex-responses`：7 款（样本 `gpt-5.3-codex-spark`、`gpt-5.4`、`gpt-5.4-mini`、`gpt-5.5`、`gpt-5.6-luna`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://chatgpt.com/backend-api`。）。钥匙在工厂。

**注意：** 与 `openai` 厂彻底分开：不同 id、不同协议、不同主机、不同登录。API key 用户用 openai；Plus/Pro 用这家。

<a id="opencode"></a>
## `opencode.json`

对应厂家 id **`opencode`**（显示名：OpenCode Zen）。

**谁加载：** [opencode.models.ts](/series/pi-source/ai/198-opencode-models-ts/) `import values from "./data/opencode.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("opencode", values)` 摊平后成为 `OPENCODE_MODELS`。厂家工厂 [`opencode.ts`](/series/pi-source/ai/199-opencode-ts/) 的 `opencodeProvider()` 再 `Object.values(OPENCODE_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `anthropic-messages`：14 款（样本 `claude-fable-5`、`claude-fable-5-1`、`claude-haiku-4-5`、`claude-opus-4-5`、`claude-opus-4-6`）
- `google-generative-ai`：7 款（样本 `gemini-3-flash`、`gemini-3.1-pro`、`gemini-3.5-flash`、`gemini-3.5-flash-lite`、`gemini-3.6-flash`）
- `openai-completions`：17 款（样本 `big-pickle`、`deepseek-v4-flash`、`deepseek-v4-pro`、`glm-5`、`glm-5.1`）
- `openai-responses`：25 款（样本 `gpt-5`、`gpt-5-codex`、`gpt-5-nano`、`gpt-5.1`、`gpt-5.1-codex`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里出现过这些 `baseUrl`：`https://opencode.ai/zen`、`https://opencode.ai/zen/v1`。）。钥匙在工厂。

**注意：** Zen 把 Claude/Gemini/GPT/开源模型汇在一个 key 下，所以工厂必须是 api map。`x-opencode-session` 把 Agent 的 `sessionId` 传给网关做路由/缓存，见 [opencode-headers.ts](/series/pi-source/ai/197-opencode-headers-ts/)。

<a id="opencode-go"></a>
## `opencode-go.json`

对应厂家 id **`opencode-go`**（显示名：OpenCode Go）。

**谁加载：** [opencode-go.models.ts](/series/pi-source/ai/195-opencode-go-models-ts/) `import values from "./data/opencode-go.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("opencode-go", values)` 摊平后成为 `OPENCODE_GO_MODELS`。厂家工厂 [`opencode-go.ts`](/series/pi-source/ai/196-opencode-go-ts/) 的 `opencodeGoProvider()` 再 `Object.values(OPENCODE_GO_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `anthropic-messages`：2 款（样本 `minimax-m3`、`qwen3.8-flash`）
- `openai-completions`：20 款（样本 `deepseek-v4-flash`、`deepseek-v4-flash-vision-exp`、`deepseek-v4-pro`、`glm-5.1`、`glm-5.2`）
- `openai-responses`：4 款（样本 `gpt-5.6-luna`、`grok-4.6`、`muse-spark-1.2-contributor`、`muse-spark-1.3-contributor`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里出现过这些 `baseUrl`：`https://opencode.ai/zen/go`、`https://opencode.ai/zen/go/v1`。）。钥匙在工厂。

**注意：** createProvider 显式写出三个 api 联合类型。26 款。GLM-5.2 的 thinkingLevelMap 在生成脚本有特判。和 Zen 共用钥匙但 id 不同，会话历史里的 `opencode/claude-opus-4-7` 不能自动变成 `opencode-go/...`。

<a id="openrouter"></a>
## `openrouter.json`

对应厂家 id **`openrouter`**（显示名：OpenRouter）。

**谁加载：** [openrouter.models.ts](/series/pi-source/ai/201-openrouter-models-ts/) `import values from "./data/openrouter.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("openrouter", values)` 摊平后成为 `OPENROUTER_MODELS`。厂家工厂 [`openrouter.ts`](/series/pi-source/ai/202-openrouter-ts/) 的 `openrouterProvider()` 再 `Object.values(OPENROUTER_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：360 款（样本 `aion-labs/aion-2.0`、`aion-labs/aion-3.0`、`aion-labs/aion-3.0-mini`、`amazon/nova-2-lite-v1`、`amazon/nova-lite-v1`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://openrouter.ai/api/v1`。）。钥匙在工厂。

**注意：** 360 款全在 `openai-completions`，几乎都带 compat（OpenRouter 路由字段）。图像出图是 `openrouterImagesProvider`，聊天工厂不管 `openrouter-images` 协议。

<a id="qwen-token-plan"></a>
## `qwen-token-plan.json`

对应厂家 id **`qwen-token-plan`**（显示名：Qwen Token Plan）。

**谁加载：** [qwen-token-plan.models.ts](/series/pi-source/ai/207-qwen-token-plan-models-ts/) `import values from "./data/qwen-token-plan.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("qwen-token-plan", values)` 摊平后成为 `QWEN_TOKEN_PLAN_MODELS`。厂家工厂 [`qwen-token-plan.ts`](/series/pi-source/ai/208-qwen-token-plan-ts/) 的 `qwenTokenPlanProvider()` 再 `Object.values(QWEN_TOKEN_PLAN_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：18 款（样本 `MiniMax-M2.5`、`deepseek-v3.2`、`deepseek-v4-flash`、`deepseek-v4-flash-0731`、`deepseek-v4-pro`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`。）。钥匙在工厂。

**注意：** 18 款（MiniMax、DeepSeek、GLM、Qwen）。生成器排除 `qwen3.8-max-preview`，并对 glm-5/5.1 补 reasoning effort 映射。与 individual 同区域同 key 变量，但 individual 是白名单子集。

<a id="qwen-token-plan-cn"></a>
## `qwen-token-plan-cn.json`

对应厂家 id **`qwen-token-plan-cn`**（显示名：Qwen Token Plan CN）。

**谁加载：** [qwen-token-plan-cn.models.ts](/series/pi-source/ai/203-qwen-token-plan-cn-models-ts/) `import values from "./data/qwen-token-plan-cn.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("qwen-token-plan-cn", values)` 摊平后成为 `QWEN_TOKEN_PLAN_CN_MODELS`。厂家工厂 [`qwen-token-plan-cn.ts`](/series/pi-source/ai/204-qwen-token-plan-cn-ts/) 的 `qwenTokenPlanCnProvider()` 再 `Object.values(QWEN_TOKEN_PLAN_CN_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：18 款（样本 `MiniMax-M2.5`、`deepseek-v3.2`、`deepseek-v4-flash`、`deepseek-v4-flash-0731`、`deepseek-v4-pro`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`。）。钥匙在工厂。

**注意：** 18 款，与国际 Token Plan 对齐。区域在 URL 的 `cn-beijing`，不要把新加坡 key 填过来。

<a id="qwen-token-plan-individual"></a>
## `qwen-token-plan-individual.json`

对应厂家 id **`qwen-token-plan-individual`**（显示名：Qwen Token Plan Individual）。

**谁加载：** [qwen-token-plan-individual.models.ts](/series/pi-source/ai/205-qwen-token-plan-individual-models-ts/) `import values from "./data/qwen-token-plan-individual.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("qwen-token-plan-individual", values)` 摊平后成为 `QWEN_TOKEN_PLAN_INDIVIDUAL_MODELS`。厂家工厂 [`qwen-token-plan-individual.ts`](/series/pi-source/ai/206-qwen-token-plan-individual-ts/) 的 `qwenTokenPlanIndividualProvider()` 再 `Object.values(QWEN_TOKEN_PLAN_INDIVIDUAL_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：8 款（样本 `deepseek-v4-flash-0731`、`deepseek-v4-pro`、`deepseek-v4-pro-0813`、`glm-5.2`、`qwen3.6-flash`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`。）。钥匙在工厂。

**注意：** 生成脚本 `QWEN_TOKEN_PLAN_INDIVIDUAL_MODEL_IDS` 白名单 8 款（文档 2026-09-03 核实）。同 key 打两家：企业目录 18 款、个人 8 款。选错厂家会在 UI 里看到不该出现的模型。

<a id="together"></a>
## `together.json`

对应厂家 id **`together`**（显示名：Together）。

**谁加载：** [together.models.ts](/series/pi-source/ai/212-together-models-ts/) `import values from "./data/together.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("together", values)` 摊平后成为 `TOGETHER_MODELS`。厂家工厂 [`together.ts`](/series/pi-source/ai/213-together-ts/) 的 `togetherProvider()` 再 `Object.values(TOGETHER_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：21 款（样本 `MiniMaxAI/MiniMax-M2.7`、`MiniMaxAI/MiniMax-M3`、`Qwen/Qwen2.5-7B-Instruct-Turbo`、`Qwen/Qwen3.5-9B`、`Qwen/Qwen3.6-Plus`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.together.ai/v1`。）。钥匙在工厂。

**注意：** 21 款。生成脚本按模型挑选 `thinkingFormat: together | openai`、是否 `supportsReasoningEffort`。R1、MiniMax-M2.7 在 `TOGETHER_REASONING_ONLY_MODELS`。工厂本身无分支，差异全在 json.compat。

<a id="vercel-ai-gateway"></a>
## `vercel-ai-gateway.json`

对应厂家 id **`vercel-ai-gateway`**（显示名：Vercel AI Gateway）。

**谁加载：** [vercel-ai-gateway.models.ts](/series/pi-source/ai/214-vercel-ai-gateway-models-ts/) `import values from "./data/vercel-ai-gateway.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("vercel-ai-gateway", values)` 摊平后成为 `VERCEL_AI_GATEWAY_MODELS`。厂家工厂 [`vercel-ai-gateway.ts`](/series/pi-source/ai/215-vercel-ai-gateway-ts/) 的 `vercelAIGatewayProvider()` 再 `Object.values(VERCEL_AI_GATEWAY_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `anthropic-messages`：233 款（样本 `alibaba/qwen-3-14b`、`alibaba/qwen-3-235b`、`alibaba/qwen-3-30b`、`alibaba/qwen-3-32b`、`alibaba/qwen-3.6-max-preview`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://ai-gateway.vercel.sh`。）。钥匙在工厂。

**注意：** 233 款，id 带组织前缀 `alibaba/qwen-3-...`。Vercel 网关对上游统一成 Anthropic 形状，所以工厂只挂 Messages。183 款 reasoning。生成脚本从 `ai-gateway.vercel.sh/v1` 拉目录。

<a id="xai"></a>
## `xai.json`

对应厂家 id **`xai`**（显示名：xAI）。

**谁加载：** [xai.models.ts](/series/pi-source/ai/216-xai-models-ts/) `import values from "./data/xai.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("xai", values)` 摊平后成为 `XAI_MODELS`。厂家工厂 [`xai.ts`](/series/pi-source/ai/217-xai-ts/) 的 `xaiProvider()` 再 `Object.values(XAI_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-responses`：4 款（样本 `grok-4.3`、`grok-4.5`、`grok-4.6`、`grok-build-0.1`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.x.ai/v1`。）。钥匙在工厂。

**注意：** 4 款：grok-4.3/4.5/4.6、grok-build-0.1。协议复用 OpenAI Responses，主机和鉴权是 xAI 的。Bedrock 上也有 `xai.grok-4.6`，那是 amazon-bedrock 厂。

<a id="xiaomi"></a>
## `xiaomi.json`

对应厂家 id **`xiaomi`**（显示名：Xiaomi）。

**谁加载：** [xiaomi.models.ts](/series/pi-source/ai/224-xiaomi-models-ts/) `import values from "./data/xiaomi.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("xiaomi", values)` 摊平后成为 `XIAOMI_MODELS`。厂家工厂 [`xiaomi.ts`](/series/pi-source/ai/225-xiaomi-ts/) 的 `xiaomiProvider()` 再 `Object.values(XIAOMI_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：3 款（样本 `mimo-v2.5`、`mimo-v2.5-pro`、`mimo-v2.5-pro-ultraspeed`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.xiaomimimo.com/v1`。）。钥匙在工厂。

**注意：** 三款：mimo-v2.5 / pro / pro-ultraspeed。Token Plan 三区域是另外三家，模型更少、域名不同、钥匙不同。

<a id="xiaomi-token-plan-ams"></a>
## `xiaomi-token-plan-ams.json`

对应厂家 id **`xiaomi-token-plan-ams`**（显示名：Xiaomi Token Plan AMS）。

**谁加载：** [xiaomi-token-plan-ams.models.ts](/series/pi-source/ai/218-xiaomi-token-plan-ams-models-ts/) `import values from "./data/xiaomi-token-plan-ams.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("xiaomi-token-plan-ams", values)` 摊平后成为 `XIAOMI_TOKEN_PLAN_AMS_MODELS`。厂家工厂 [`xiaomi-token-plan-ams.ts`](/series/pi-source/ai/219-xiaomi-token-plan-ams-ts/) 的 `xiaomiTokenPlanAmsProvider()` 再 `Object.values(XIAOMI_TOKEN_PLAN_AMS_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：2 款（样本 `mimo-v2.5`、`mimo-v2.5-pro`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://token-plan-ams.xiaomimimo.com/v1`。）。钥匙在工厂。

**注意：** 仅 `mimo-v2.5`、`mimo-v2.5-pro`。区域钥匙不能混用。

<a id="xiaomi-token-plan-cn"></a>
## `xiaomi-token-plan-cn.json`

对应厂家 id **`xiaomi-token-plan-cn`**（显示名：Xiaomi Token Plan CN）。

**谁加载：** [xiaomi-token-plan-cn.models.ts](/series/pi-source/ai/220-xiaomi-token-plan-cn-models-ts/) `import values from "./data/xiaomi-token-plan-cn.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("xiaomi-token-plan-cn", values)` 摊平后成为 `XIAOMI_TOKEN_PLAN_CN_MODELS`。厂家工厂 [`xiaomi-token-plan-cn.ts`](/series/pi-source/ai/221-xiaomi-token-plan-cn-ts/) 的 `xiaomiTokenPlanCnProvider()` 再 `Object.values(XIAOMI_TOKEN_PLAN_CN_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：2 款（样本 `mimo-v2.5`、`mimo-v2.5-pro`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://token-plan-cn.xiaomimimo.com/v1`。）。钥匙在工厂。

**注意：** 与 AMS/SGP 同两款模型，国内域名。官方 ultraspeed 不在 Token Plan 表。

<a id="xiaomi-token-plan-sgp"></a>
## `xiaomi-token-plan-sgp.json`

对应厂家 id **`xiaomi-token-plan-sgp`**（显示名：Xiaomi Token Plan SGP）。

**谁加载：** [xiaomi-token-plan-sgp.models.ts](/series/pi-source/ai/222-xiaomi-token-plan-sgp-models-ts/) `import values from "./data/xiaomi-token-plan-sgp.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("xiaomi-token-plan-sgp", values)` 摊平后成为 `XIAOMI_TOKEN_PLAN_SGP_MODELS`。厂家工厂 [`xiaomi-token-plan-sgp.ts`](/series/pi-source/ai/223-xiaomi-token-plan-sgp-ts/) 的 `xiaomiTokenPlanSgpProvider()` 再 `Object.values(XIAOMI_TOKEN_PLAN_SGP_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：2 款（样本 `mimo-v2.5`、`mimo-v2.5-pro`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://token-plan-sgp.xiaomimimo.com/v1`。）。钥匙在工厂。

**注意：** 与 AMS 对称的两款目录。三家 Token Plan 工厂是复制粘贴换 URL/env，刻意不抽公共函数——生成脚本同样按 id 分文件，保持「一家一个工厂文件」可搜。

<a id="zai"></a>
## `zai.json`

对应厂家 id **`zai`**（显示名：Z.AI）。

**谁加载：** [zai.models.ts](/series/pi-source/ai/228-zai-models-ts/) `import values from "./data/zai.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("zai", values)` 摊平后成为 `ZAI_MODELS`。厂家工厂 [`zai.ts`](/series/pi-source/ai/229-zai-ts/) 的 `zaiProvider()` 再 `Object.values(ZAI_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：7 款（样本 `glm-4.7`、`glm-5-turbo`、`glm-5.2`、`glm-5.2-highspeed`、`glm-5.3`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://api.z.ai/api/coding/paas/v4`。）。钥匙在工厂。

**注意：** 7 款 GLM-4.7 / 5.x。生成器把 glm-4.5* 标为 tool stream 不支持并排除。国内编码站是 `zai-coding-cn`。

<a id="zai-coding-cn"></a>
## `zai-coding-cn.json`

对应厂家 id **`zai-coding-cn`**（显示名：Z.AI Coding CN）。

**谁加载：** [zai-coding-cn.models.ts](/series/pi-source/ai/226-zai-coding-cn-models-ts/) `import values from "./data/zai-coding-cn.json"`。`all.ts` 不直接 import json。`flattenModelCatalog("zai-coding-cn", values)` 摊平后成为 `ZAI_CODING_CN_MODELS`。厂家工厂 [`zai-coding-cn.ts`](/series/pi-source/ai/227-zai-coding-cn-ts/) 的 `zaiCodingCnProvider()` 再 `Object.values(ZAI_CODING_CN_MODELS)` 交给 `createProvider`。

**和 `*.models.ts` 的关系：** json 是按 api 分组的值；models.ts 是 git 里的稳定包装 + 类型。json 在 `packages/ai/src/providers/data/`，**gitignore**。生成时间戳在 `.manifest.json`。

**协议组：**

- `openai-completions`：10 款（样本 `glm-4.6v`、`glm-4.7`、`glm-5-turbo`、`glm-5.1`、`glm-5.2`）

**鉴权 / baseUrl：** 不在 json 里做 login。json 只存每条模型的 `baseUrl`（模型表里的 `baseUrl` 是 `https://open.bigmodel.cn/api/coding/paas/v4`。）。钥匙在工厂。

**注意：** 10 款，比国际站多 glm-4.6v、glm-5.1 等。路径同样是 coding paas v4，主机是 `open.bigmodel.cn`。

## 不在本目录的厂家

| id | 为什么没有 json |
|---|---|
| `radius` | 纯动态：`GET {gateway}/v1/config`，见 [radius.ts](/series/pi-source/ai/210-radius-ts/) |
| `faux` | 测试剧本，默认一款 `faux-1` |
| `openrouter` 图像 | `image-models.generated.ts`，不是 chat 表 |

## 下一课

包装文件从 [anthropic.models.ts](/series/pi-source/ai/147-anthropic-models-ts/) 看起。工厂从 [openai.ts](/series/pi-source/ai/194-openai-ts/) 看起。
