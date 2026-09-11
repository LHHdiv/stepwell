---
title: "35 · api/google-vertex.ts — Vertex AI 上的 Gemini"
summary: "和 34 课的差别：客户端构造、streamSimple 不强制 apiKey、location/project 解析、ADC 的 googleAuthOptions。parts 循环基本复制。"
tags: [pi, ai]
---
源码：`packages/ai/src/api/google-vertex.ts` + `.lazy.ts`  
被谁调用：`api === "google-vertex"`。鉴权可以是 `GOOGLE_CLOUD_API_KEY` 或 ADC（项目+地区）。

## 本课目标

和 34 课的差别：客户端构造、`streamSimple` **不**强制 apiKey、location/project 解析、ADC 的 `googleAuthOptions`。parts 循环基本复制。

## 客户端两条路

`resolveApiKey(options)` 有 key → `createClientWithApiKey`（仍 `vertexai: true`）。  
否则 `createClient(project, location, headers, env)` 走 ADC。缺 project/location 会在 resolve 时炸。

`GCP_VERTEX_CREDENTIALS_MARKER`：auth 层用哨兵表示「已配置 ADC」，不要把哨兵当 Bearer 发出去。`resolveApiKey` 必须识别并忽略。

`API_VERSION = "v1"`。`buildGoogleAuthOptions(env)` 读 `GOOGLE_APPLICATION_CREDENTIALS` 等。

## `streamSimple`

`buildBaseOptions(..., undefined)` 不预填 apiKey。无 reasoning → `thinking.enabled: false`。Gemini 3 走 level，其他走 budget。Vertex 路径目前没把 Gemma 4 单独分出来（生成目录若出现再补）。

自定义 fetch 同样拒绝。

## 失败与边界

ADC 文件不存在但 env 以为配置了：SDK 抛认证错误 → error 事件。错误地区（模型没上架）→ 404 文本经 `formatProviderError`。思考映射非法：与 google-shared 相同，throw。

## 下一课

AWS ConverseStream：[36-api-bedrock-converse-stream.ts.md](/series/pi-source/ai/097-api-bedrock-converse-stream-ts/)。
