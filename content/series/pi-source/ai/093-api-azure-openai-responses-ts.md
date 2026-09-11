---
title: "32 · api/azure-openai-responses.ts — Azure 部署上的 Responses"
summary: "Azure 和官方的差别不在事件，在 URL 与部署名：AzureOpenAI SDK、azureResourceName / azureBaseUrl / azureDeploymentName、AZUREOPENAIDEPLOYME"
tags: [pi, ai]
---
源码：`packages/ai/src/api/azure-openai-responses.ts` + `.lazy.ts`  
被谁调用：`api === "azure-openai-responses"`。事件译码仍是 `processResponsesStream`。

## 本课目标

Azure 和官方的差别不在事件，在 **URL 与部署名**：`AzureOpenAI` SDK、`azureResourceName` / `azureBaseUrl` / `azureDeploymentName`、`AZURE_OPENAI_DEPLOYMENT_NAME_MAP`。

## 在系统中的位置

```text
stream
  resolveDeploymentName   // options → env map → model.id
  createClient(AzureOpenAI)
  buildParams(..., deploymentName as model)
  responses.create
  processResponsesStream
```

## 部署名

`AZURE_OPENAI_DEPLOYMENT_NAME_MAP=gpt-5=my-gpt5,gpt-4.1=foo` 这种逗号分隔 `modelId=deployment`。请求级 `azureDeploymentName` 最高优先。很多 Azure 资源的部署名不等于模型 id。

`DEFAULT_AZURE_API_VERSION = "v1"`。`azureBaseUrl` 覆盖模型 baseUrl（自定义网关）。

## `streamSimple`

必须有 apiKey（Azure 没有 ADC 这条路径）。思考档同样 `clampThinkingLevel`。

`AZURE_TOOL_CALL_PROVIDERS` 比官方多了 `azure-openai-responses` 自己，同家回放保留 `|` 形式的 id。

## 失败与边界

缺 key throw。部署名错误 → Azure 404，经 `formatAzureOpenAIError` 进 error 事件。encrypted_content 缺失由 shared 的 backfill 处理（issue #6409）。

## 下一课

Google 两家共享的消息/工具转换：[33-api-google-shared.ts.md](/series/pi-source/ai/094-api-google-shared-ts/)。
