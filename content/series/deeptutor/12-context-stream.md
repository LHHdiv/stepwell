---
title: 第12讲·UnifiedContext 与 StreamBus：一次轮次的输入与输出
summary: 精读 core/context.py 与 stream.py——一切调用的单一载荷，与全部事件流经的总线。
objectives:
  - 掌握 UnifiedContext 的字段构成
  - 理解 StreamEvent 的类型体系
  - 明白"单一载荷 + 单一总线"带来的架构收益
tags: [deeptutor, context, stream]
keyPoints:
  - UnifiedContext 装着一次轮次的全部输入（消息/工具/知识库/附件/记忆/人格…）
  - StreamEvent 是全部输出的统一形态，StreamBus 负责广播
  - 输入收敛 + 输出收敛 = 任何新能力都自动获得全部基础设施
---

第 01 讲的旅程图里，第 2 站是"打包成 UnifiedContext"，第 6 站是"事件回流 StreamBus"。今天把这一进一出读透——它们是 DeepTutor 架构收敛性的两根支柱。

## UnifiedContext：单一载荷

`deeptutor/core/context.py` 的 UnifiedContext 是一次对话轮的**全部输入**：

```python
# 字段概览（据真实源码整理）
session_id / user_message        # 谁、说什么
enabled_tools                    # 本轮启用哪些工具
knowledge_bases                  # 挂了哪些知识库（RAG 用）
attachments                      # 附件
language                         # 语言
memory_context                   # 注入的记忆（L2/L3 摘要）
persona_context                  # 人格设定
skills_manifest                  # 可用技能清单
```

注意它有多"贪"：**连记忆和人格都是上下文的字段**。这意味着能力层拿到的永远是完整的作战地图，不需要自己去各处搜集信息。对照 dsh 的做法（deriveMessages 从日志推导 + system-prompt 段落各自注册），DeepTutor 选择在入口处一次性打包——**编排层厚一点，实现层就简单一点**。

## StreamEvent 与 StreamBus：单一出口

`core/stream.py` 定义 StreamEventType/StreamEvent——文本增量、思考增量、工具调用开始/结束、阶段变更、错误、完成……全部输出统一成一种形态。

`core/stream_bus.py` 的 StreamBus 是发布订阅总线：能力层只管 `emit`，订阅者（WebSocket 推送、会话持久化、记忆采集）各取所需。

**输入收敛（一个 Context）+ 输出收敛（一种 Event）**的收益是乘法级的：新增一个能力（比如未来的"语音陪练"），它自动获得记忆注入、知识库检索、事件持久化、断线回放——**基础设施对能力透明**。这就是第 00 讲"六大模式跑在同一个循环上"的工程底气。

## TurnRuntime：后台跑轮与断线回放

`services/session/turn_runtime.py` 的 TurnRuntimeManager 负责在后台执行一轮：把 UnifiedContext 交给能力、把产生的事件写入 `turn_events` 表（UNIQUE(turn_id, seq)——每轮内严格有序）。

这个 seq 序号是断线重连的关键：浏览器断线重连后发 `subscribe_turn` 带 `after_seq`，服务端把缺的事件按序回放——**体验上无缝续播，实现上只是按序号重发**。SQLite 的一张表 + 一个序号，解决了实时流最头疼的可靠传输问题。

## 试一试

打开 `core/context.py` 数一数 UnifiedContext 的全部字段，和本讲清单对比，找出三个本讲没列的字段并猜测用途。这个练习做完，你对"一次对话轮需要什么"的理解就系统化了。

## 下一讲预告

输入输出都清楚了，该看轮次怎么被持久化。下一讲读 SQLite 会话库的五张表——包括那个用 parent_message_id 实现的"编辑分支树"。
