---
title: 第41讲·DeepSeek 适配器精读：SSE 字节流变文字
summary: 逐层拆解 llm-deepseek：请求翻译、SSE 解析、chunk 转换——看完你能给任何供应商写适配器。
objectives:
  - 读懂 adapter.ts / sse.ts / translate.ts 三件套的分工
  - 理解 SSE 协议的解析过程
  - 对照第 40 讲的清单验证"写适配器要做什么"
tags: [deepseek-harness, llm-deepseek, sse]
keyPoints:
  - 适配器三件套：adapter 主流程、sse 传输解析、translate 格式互译
  - SSE 是行协议——data 前缀、JSON 载荷、空行分隔
  - 流式解析的核心是增量缓冲：字节→行→事件→chunk
---

理论齐了，读真家伙。`packages/llm/llm-deepseek/src/` 下三个关键文件：`adapter.ts`（主流程）、`sse.ts`（传输解析）、`translate.ts`(格式互译)。这种"传输/翻译/编排"三分法本身就值得学。

## 先懂 SSE 协议

SSE（Server-Sent Events）是模型 API 流式响应的标准载体。协议朴素到可爱——服务器持续发送文本行：

```
data: {"id":"chatcmpl-1","choices":[{"delta":{"content":"你"}}]}

data: {"id":"chatcmpl-1","choices":[{"delta":{"content":"好"}}]}

data: [DONE]
```

规则：每条消息以 `data: ` 开头，载荷是 JSON，**空行**表示一条消息结束，`[DONE]` 表示流结束。就这么简单——没有二进制、没有握手，纯文本行协议。

## sse.ts：增量解析的艺术

读 sse.ts 前先想一个难题：网络包不按消息边界来！一个 TCP 包可能含三条消息，也可能只有半条。所以解析器必须**增量缓冲**：

```
字节流入 → 追加到缓冲区 → 按 \n 切行 →
  行以 data: 开头？取载荷 → 空行？说明一条消息完整，交付
  → 缓冲区保留不完整的尾巴等下一个包
```

这个"字节→行→事件"的三级流水线，是所有流式协议解析的通用套路。读 sse.ts 时留意它的缓冲区管理——尤其"半行"是怎么被保留下来的。

## translate.ts：两个方向的翻译

**出向**（请求）：内部 Message[] → DeepSeek 的 messages 格式。好消息是 DeepSeek 兼容 OpenAI 格式，映射很直接：UserMessage→role:user，tool_use 块→tool_calls 字段……坏消息是"兼容"总有细节差异，translate.ts 里那些看似啰嗦的分支，处理的全是这些差异。

**入向**（响应）：DeepSeek 的 delta JSON → 内部 StreamChunk。`delta.content` 有值→text chunk；`delta.tool_calls` 出现→tool_call_start/delta chunk；`finish_reason` 出现→finish chunk。

## adapter.ts：把三件套串起来

主流程（伪代码）：

```
async *generate(options) {
  const body = translate.toRequest(options);   // 出向翻译
  const res = await fetch(DEEPSEEK_URL, {      // 鉴权：从 credentials 取 key
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  for await (const event of sse.parse(res.body))  // 增量解析
    yield* translate.toChunks(event);              // 入向翻译
}
```

对照第 40 讲的清单：请求翻译✓、鉴权✓、流解析✓、chunk 转换✓——五个任务全落在这三个文件里，没有一个多余的字。

## 试一试
在 translate.ts 里找一个处理 tool_calls 的函数。DeepSeek 的工具调用参数是**字符串形式的 JSON**（不是对象）——找到代码里对它做 JSON.parse 的位置。想想：为什么协议要设计成字符串？（提示：参数是模型逐字生成的，生成过程中它还不是合法 JSON。）

## 下一讲预告
卷六（终卷）：组装与启动。看 dsh 如何把 50 个包拼成产品——以及最重要的：你怎么基于这一切，造出属于你自己的智能体。
