---
title: 第24讲·llm-deepseek 精读：SSE 字节流的协议之旅
summary: 逐行精读 sse.ts：帧解析、[DONE] 哨兵、截断即错误的洁癖；再看 translate 层与文件 API。
objectives:
  - 说清 SSE 协议的帧结构与解析器的职责边界
  - 解释为什么 EOF 没有 [DONE] 必须抛 STREAM_CLOSED
  - 概述适配器内部 translate/serialize/file-store 的分工
tags: [deepseek-harness, sse, llm-deepseek]
keyPoints:
  - SSE 帧 = 事件 + 空行终止符；注释与非 data 字段被跳过，多行 data: 合并
  - [DONE] 是 DeepSeek/OpenAI 的终结哨兵；EOF 前没见到它 = STREAM_CLOSED 截断错误
  - 解析器只管解码字节流，协议语义（含哨兵处理）归调用方——分层清晰
  - 适配器包内另有 translate(方言转换)、serialize、files-api(文件上传) 三位配角
---

第 23 讲的接缝上只挂着一个官方一手适配器：**llm-deepseek**。它演示了"写一个模型适配器"的完整工艺，其中最值得逐行读的是 `src/sse.ts`——区区几十行，却把流式协议的严谨性演绎到极致。

## 一、SSE 是什么：三十秒补课

SSE（Server-Sent Events）是 HTTP 上的单向推送协议，大模型的流式输出事实标准。它的文本格式朴素到可爱：

```text
data: {"choices":[{"delta":{"content":"你"}}]}

data: {"choices":[{"delta":{"content":"好"}}]}

data: [DONE]
```

每个事件以 `data:` 开头、以**空行**结尾；服务器发完真数据后补一条字面量 `[DONE]` 表示"说完了"。听起来简单，但工程细节的魔鬼全在边界上——这正是 sse.ts 的价值所在。

## 二、sse.ts 精读：模块头就是设计文档

先看模块注释，它把职责边界划得清清楚楚：

> **帧处理（framing）**——分块重组、UTF-8/CRLF/BOM 处理、注释与非 data 字段跳过、多 data: 行合并——是 eventsource-parser 的活。本模块保留 DeepSeek 协议语义：字面量 [DONE] 被原样 yield 出去，由调用方拥有最终冲刷；EOF 前未见它则抛 LlmError。

注意这个分工哲学：**通用难题用成熟库（eventsource-parser），协议个性自己扛**。帧解析是标准化的苦役（TCP 分片可能把一个 UTF-8 字符劈成两半！），没必要重造轮子；而 [DONE] 语义是 DeepSeek 方言，必须自持。列一下 parseSse 处理的脏活清单：

1. **任意位置的分块**：网络包可能在任何字节处断开，包括多字节 UTF-8 序列中间；
2. **CRLF 与 BOM**：Windows 风格换行、文件头的隐形字节，都得认；
3. **注释与杂项字段**：`:` 开头的心跳注释、event:/id: 等字段不进入数据流（注释可通过可选回调上报——用于"传输还活着"的活动检测）；
4. **多行 data: 合并**：一个事件可以拆成多个 data: 行，按规范要拼接。

## 三、核心裁决：没有 [DONE] 的结局 = 不可信

函数文档里最硬的一句话：

> EOF 前未见到 [DONE] 时抛 LlmError('STREAM_CLOSED')——**截断的回复不可信**（the model call cannot be trusted）。且帧解析是 spec-strict 的：事件只在空行终止符处分发，EOF 时未终结的尾巴是截断，而不是可冲刷的有效载荷。

两条规则都值得展开。第一条是**信任模型**：连接半途而废时，你无法区分"模型刚好说到一半断了"和"内容被中间设备剪掉了"。把残缺回复当完整事实使用，轻则答非所问，重则工具调用参数缺半截引发雪崩。dsh 的选择是把怀疑升级为显式错误，交给上层（agent/request-error 重试瀑布）决定怎么办。

第二条是**严格性立场**：EOF 时手里若还攥着没等到空行结尾的半个事件，规范说它是"未完成"，那就丢弃并报错——哪怕它"看起来已经够完整了"。宽容实现会把它冲刷出去"别浪费"，但那半事件可能正是被掐断的尾巴。又一次，**宁可响亮失败，不做善意猜测**。

```ts
export const DONE = '[DONE]'
// parseSse(stream, onComment?) —— 异步生成器：
//   yield 每个 data 载荷（按到达顺序）
//   最后 yield '[DONE]' 并正常返回
//   流结束却没有 DONE → throw new LlmError('STREAM_CLOSED')
```

异步生成器（async generator）的形态让消费端可以用 for await 自然循环——第 14 讲主循环里那个"每个 chunk 落账一次"的优雅循环，源头就是这里吐出的流。

## 四、适配器家族的其他成员

sse.ts 只是入口工序，包内还有几位配角各司其职：

- **translate.ts**：DeepSeek 方言 ↔ 内部词汇表（第 23 讲的内容块世界）的双向翻译。适配器的本质工作就是翻译；
- **serialize.ts / adapter.ts**：请求序列化与适配器主体——把统一的 LlmCallConfig 落成对 DeepSeek API 的具体 HTTP 请求；
- **files-api.ts / file-store.ts / upload-index.ts**：文件上传三件套——模型要读 PDF/图片时的附件通道，含上传索引管理；
- **invariant.ts**：老朋友了，本包的不变量伴侣。

读完这个包你会发现："写一个新模型适配器"从玄学变成了 checklist：实现翻译层、复用或重写 SSE 解码、注册进 ctx.llm、声明 retryPolicy 与默认值。仓库 cookbook 里就有 adding-an-llm-adapter 的分步指南——毕业设计的候选项目之一。

> 💡 **知识拓展：流式处理的通用模式**
> "字节流 → 帧解析 → 事件流 → 语义翻译 → 业务组装"这条五级流水线，在无数领域反复出现：WebSocket 消息、日志采集、音视频传输全是同构的。学 sse.ts 真正学到的是流水线每一级的**职责切割纪律**：上一级不知道下一级的存在，错误在最低可能的层级被发现。下次你处理任何"边收边拼"的场景，先画这五级再动手。

## 试一试

打开 `packages/llm/llm-deepseek/src/sse.ts` 通读全文（真的不长）。找一找：onComment 回调在什么场景下有价值？（提示：很多服务用 SSE 注释行当心跳保活。）再想想如果让你加"重连后从上次位置继续"的能力，需要动哪一层？

## 下一讲预告

流会断、限流会来、服务会挂。下一讲拆 llm-retry 插件：normal 与 always 两种重试模式、带对称抖动的有界指数退避、以及那些写进日志的重试事件——顺便认识给压缩策略供数的 token-meter。
