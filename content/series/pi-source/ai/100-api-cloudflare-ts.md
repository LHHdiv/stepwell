---
title: "39 · api/cloudflare.ts — AI Gateway / Workers AI 的 URL 模板"
summary: "四个常量，占位符 {CLOUDFLAREACCOUNTID} / {CLOUDFLAREGATEWAYID} 由厂家 applyAuth 或 env resolve 替换："
tags: [pi, ai]
---
源码：`packages/ai/src/api/cloudflare.ts`（15 行）  
被谁调用：`providers/cloudflare-*.ts` 填 `model.baseUrl`；binding 文档拿这些路径对照。

## 本课目标

四个常量，占位符 `{CLOUDFLARE_ACCOUNT_ID}` / `{CLOUDFLARE_GATEWAY_ID}` 由厂家 `applyAuth` 或 env resolve 替换：

| 常量 | 用途 |
|---|---|
| `CLOUDFLARE_WORKERS_AI_BASE_URL` | Workers AI 直接 OpenAI 兼容 |
| `CLOUDFLARE_AI_GATEWAY_COMPAT_BASE_URL` | Gateway Unified `/compat` |
| `CLOUDFLARE_AI_GATEWAY_OPENAI_BASE_URL` | Gateway → OpenAI 透传（/compat 还不支持 /v1/responses 时） |
| `CLOUDFLARE_AI_GATEWAY_ANTHROPIC_BASE_URL` | Gateway → Anthropic 透传 |

没有函数。真正发请求仍是 openai-completions / anthropic-messages 那些文件，只是 baseUrl 不同。

compat 对 `provider.startsWith("cloudflare-")` 且未带 key 的请求改走 `Models.streamSimple`，就是为了在那些工厂里完成占位符替换（03 课）。

## 下一课

在 Worker 里用 binding 代替 HTTPS：[40-api-cloudflare-ai-binding.ts.md](/series/pi-source/ai/101-api-cloudflare-ai-binding-ts/)。
