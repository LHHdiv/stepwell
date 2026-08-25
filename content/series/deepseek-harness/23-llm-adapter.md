---
title: 第23讲·LlmAdapter 接缝：与模型对话的统一词汇表
summary: 精读 llm 包：适配器注册、PreparedLlmCall、流式词汇 StreamChunk 与 BlockAssembler 的组装术。
objectives:
  - 描述 ctx.llm 上"注册路由→prepareCall→stream"的三步调用协议
  - 区分消息内容块的类型词汇及其各自来源
  - 理解 BlockAssembler 如何把碎片流组装成完整消息
tags: [deepseek-harness, llm, 流式]
keyPoints:
  - llm 包（index.ts 超 1000 行）定义消息/流式词汇 + 适配器接缝，是全系统最宽的接口
  - 调用协议：配置经瀑布提案 → prepareCall 绑定适配器 → stream 拿异步碎片流
  - PreparedLlmCall 携带解析后的确切配置、重试策略与模型容量信息
  - 内容块类型化：text / reasoning / tool-call / … 各有明确来源与消费者
---

卷五开篇。前四卷我们始终站在"框架侧"看问题；本讲转向对话的另一半——**怎么跟大模型说话**。`packages/llm/` 是个家族（llm 本体、deepseek 适配器、pi-ai 适配器、retry 插件、token-meter 计量器），本体包的 index.ts 超过一千行，是全系统最宽的接口面。别慌，抓主线即可。

## 一、接缝的位置：ctx.llm 上有什么

回忆第 01 讲核心脊柱表：llm 包贡献 `ctx.llm`。它对外提供的服务方法里最重要的是两个：

- **registerAdapter()**：模型提供方在此注册自己（第 03 讲归属表第一条"添加模型提供方→在 ctx.llm 上注册其适配器"）。注册时路由信息（provider/model 名）连同该适配器的默认行为、嵌套 retryPolicy 一起被捕获；
- **prepareCall(config)** 与 **stream(request)**：发起调用的入口。

三步调用协议在主循环里已经见过（第 14 讲 buildRequest），现在补齐细节：

```text
① 提案   agent/request 瀑布产出目标配置（provider/model/温度/…）
② 绑定   preparedCall = await llm.prepareCall(config, signal)
         → 解析出确切的适配器 + 归一化的 config + adapterDefaults + 容量信息
③ 流式   for await (const chunk of preparedCall.stream(request)) { ... }
```

PreparedLlmCall（index.ts:156）值得专门认识：它是"一次已就绪的调用"，携带解析到确切型号后的最终配置、适配器声明的默认值（哪些字段由适配器拍板——第 14 讲 requestProposal 摘掉的就是它们）、retryPolicy 和 contextWindow。**把"想调用什么"和"实际将怎么调用"分成两步**，中间留出了校验、路由解析和插件插手的空隙。

## 二、消息词汇表：内容块的世界

llm 包定义了全系统的对话词汇：UserMessage、AssistantMessage、ToolResultMessage，以及组成它们的**内容块**（ContentBlock）。类型化的块是关键设计：

```text
text 块        普通文字
reasoning 块    思维链内容（推理模型的思考过程）
tool-call 块    工具调用请求（name + arguments + callId）
```

为什么不用一条字符串加标记？因为不同块的**来源和去向完全不同**：reasoning 块要展示给用户但不能当事实喂回历史；tool-call 块要被调度器提取执行（第 14 讲）；text 块直接进历史。字符串+正则的世界里这些区分靠约定，类型世界里它们靠编译器。第 14 讲那句 `message.content.filter(block => block.type === 'tool-call')` 就是红利现场——filter 出来的数组自动收窄为 ToolCallBlock[]。

还有个不起眼但重要的细节：callId 是 Branded 类型（第 05 讲的品牌政策成员）——工具调用与其结果的配对关系靠它跨越流水线的十几道关卡而不出错。

## 三、BlockAssembler：从碎片到成品

流式响应是一串碎块，谁负责把它们拼成完整的 AssistantMessage？答案是一个专门的组装器类。它的职责清单：

- **push(chunk)**：每来一个碎片追加进去（同时主循环把它落账，第 14 讲）；
- **blocks()**：输出排序合并后的内容块数组；
- **usage**：从流的元数据里收集 token 用量（第 06 讲说的"账单随行"就是它填的）;
- **interruptedBlocks()**：中断时输出"已送达的部分"（第 14 讲的保真落账靠它）；
- **finish**：终局分类——completed / max-tokens / error / aborted 四种结局，驱动 step 循环的分支。

组装器是纯内存状态机，不碰日志也不碰网络——单一职责，因此可以在测试里用假碎片序列精确驱动。

## 四、错误词汇：LlmError 与 errorChain

llm 包还统一了错误的形状。LlmError 携带结构化的 failure（message + code + 原始事实），code 是有限枚举：RATE_LIMIT、SERVER、TIMEOUT、TRANSPORT、EMPTY_RESPONSE……这些 code 不只是日志装饰——它们是第 25 讲重试策略的**判分依据**（哪种错误可重试、哪种是死刑）。而其他一切异常会被 errorChain 展平成 UNKNOWN 码的结构化失败（第 13 讲 turn 结局处理里见过）。**让错误的形状可预期，自动化处理才有可能。**

> 💡 **知识拓展："接缝宽度"的设计感**
> 数一数 llm 包对外导出的概念：配置、消息、三种内容块、流式碎片、组装器、错误、重试策略、用量计量……为什么这个接缝这么宽？因为它处在**整个系统唯一的外部依赖边界**上：外面是完全不可控的模型 API 世界（各家方言、限流、格式漂移），里面是需要稳定契约的四十几内部包。接缝的价值随环境的不稳定性上升——越是不靠谱的边界，越需要一个厚实的翻译层。反例是内部包之间的接缝（如 scope）就该又薄又稳。

## 试一试

打开 `packages/llm/llm/src/content.ts`（202 行），列出全部内容块类型，找出一个本讲没提到的类型并推测它的用途。顺便观察每个类型的字段都是 readonly 的——数一数这个文件里出现了多少次 deep-freeze 或 as const 类似的不可变手法。

## 下一讲预告

接口层看完了，进入唯一的官方一手适配器：llm-deepseek。下一讲逐行精读 sse.ts——如何把 HTTP 字节流解码成事件、[DONE] 哨兵的严格语义、以及"截断的回复不可信"背后的协议洁癖。
