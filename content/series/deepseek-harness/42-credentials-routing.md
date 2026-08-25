---
title: 第42讲·凭据与多供应商：credentials 服务与模型路由
summary: dsh 如何管理 API key、如何在多供应商间路由请求——补齐 LLM 层的最后一块拼图。
objectives:
  - 理解 credentials 包的凭据管理设计
  - 掌握多供应商并存时的路由机制
  - 学会安全地配置你自己的 key
tags: [deepseek-harness, credentials, 多供应商]
keyPoints:
  - 凭据由独立的 credentials 服务管理，适配器通过 apiKeyEnv 引用
  - 环境变量分层加载（loadLayeredEnv），凭据与代码严格分离
  - 多适配器并存时按 provider 名路由
---

卷五收官。还剩两块拼图：key 放在哪（credentials）、多个模型怎么选（路由）。

## credentials：key 的专属管家

回忆第 41 讲：适配器里没有一行硬编码的 key。那 key 从哪来？答案是独立的 `packages/credentials` 服务：

- 适配器声明自己需要什么凭据：配置项 `apiKeyEnv` 默认指向 `DEEPSEEK_API_KEY`，并带 `.role('credential-ref')` 标记——**配置里存的是"凭据的名字"，不是凭据本身**；
- credentials 服务负责按名字解析：环境变量 → 凭据存储，解析失败给出清晰报错；
- 环境变量通过 `loadLayeredEnv('dsh')` 分层加载（系统级 → 用户级 → 会话级），优先级明确。

这个"引用而非内联"的设计有个安全红利：你的配置文件可以随便分享、提交 git——里面根本没有 key。**凭据与配置的分离，是所有正经系统的标配**，dsh 用类型标记（credential-ref）把它做成了编译期可检查的约定。

## 多供应商路由

第 40 讲见过 `ctx.llm.registerAdapter(['deepseek'], adapter)`。当注册了多个适配器时，请求按 `provider` 字段路由：

```
请求 { provider: 'deepseek', model: 'deepseek-chat' } → DeepSeek 适配器
请求 { provider: 'openai',   model: 'gpt-4o' }        → OpenAI 适配器
```

默认模型由 `ctx.agentDefaultModel` 配置（provider/model/maxTokens 三元组），Web 设置界面可以改。于是你可以：主对话用 deepseek-chat，子智能体（第 25 讲）配便宜的小模型跑杂活——**一套系统，按任务配模型**，成本立刻可控。

对照 pi（第 12 讲）的 Models 集合路由：机制同构，粒度不同——pi 靠模型 id 反查 provider，dsh 靠请求显式指定 provider。殊途同归。

## token 计量

`packages/llm/token-meter` 包负责用量统计：挂在 llm/stream 瀑布上（第 40 讲），从 usage 数据累计每会话/每模型的 token 消耗。做个人智能体要控成本，这个包的输出就是你的仪表盘数据源。

## 试一试

跑 `pnpm dsh --profile web --dump-config`，在输出里找 `apiKeyEnv` 和 `agentDefaultModel` 两个配置项。然后故意 `export DEEPSEEK_API_KEY=""` 再启动一次——观察报错信息是否清晰指出"凭据缺失"。好的错误信息和好的功能一样重要。

## 卷五小结
LlmAdapter 接缝（40）→ DeepSeek 适配器与 SSE（41）→ 凭据与路由（42）。**智能体的"嘴"通了**。下一讲进入终卷：组装启动。
