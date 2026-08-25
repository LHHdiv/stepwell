---
title: 第01讲·全景地图：一次提问的完整旅程
summary: 从浏览器里敲下一句话开始，追踪它穿过 FastAPI、WebSocket、编排器、能力、工具、服务的每一站。
objectives:
  - 画出 DeepTutor 后端的分层架构图
  - 说出一次对话轮（turn）经过的每个组件
  - 理解 StreamBus 在其中的角色
tags: [deeptutor, 架构, 全景]
keyPoints:
  - 分层：入口层 → 编排层 → 协议层 → 实现层 → 服务层 → 数据层
  - unified_ws 是唯一主 WebSocket 端点，承载所有对话流
  - ChatOrchestrator 把 UnifiedContext 变成 StreamBus 上的事件流
---

读代码先拿地图。DeepTutor 的后端（`deeptutor/` 目录）是清晰的六层结构：

```
入口层   api/main.py（FastAPI 应用）+ api/routers/（33 个路由模块）
传输层   api/routers/unified_ws.py   ← 唯一主 WebSocket，所有对话流走这里
编排层   runtime/orchestrator.py     ← ChatOrchestrator（总调度）
协议层   core/                       ← 工具协议/能力协议/上下文/事件流
实现层   agents/ + capabilities/     ← 具体能力实现
服务层   services/（307 个文件）      ← llm/rag/memory/session/…
数据层   SQLite + JSON/YAML 文件
```

## 一次提问的旅程

你在网页输入"帮我总结上一章"。接下来发生的事：

**第 1 站 · WebSocket 接单。** 浏览器通过 `/api/v1/ws` 发出 `message/start_turn` 消息。`unified_ws.py` 是唯一的主对话端点——注意是"唯一"，DeepTutor 刻意把所有对话流量收敛到一个 WS 端点，用消息类型区分动作（启动轮次、订阅、取消、恢复、重新生成……）。

**第 2 站 · 编排器路由。** `ChatOrchestrator.handle()` 接到请求，把所有输入打包成一个 `UnifiedContext`（统一上下文：用户消息、启用的工具、知识库、附件、语言、记忆、人格……全在里面），然后决定路由给哪个 Capability——默认是 Chat。

**第 3 站 · TurnRuntime 后台执行。** 编排器不亲自干活，它把这一轮交给 `TurnRuntimeManager` 在后台跑，自己立刻返回。这一轮产生的事件全部发到 **StreamBus**（事件总线）。

**第 4 站 · 能力执行。** ChatCapability 是个薄壳，真正干活的是 `AgenticChatPipeline`——那个标签协议驱动的循环（卷二主角）。循环里模型可能调用工具（Level 1），比如检索你的知识库（RAGTool）。

**第 5 站 · 服务层支援。** 工具调用落到 `services/`：RAG 服务去向量库检索、LLM 服务去调模型、记忆服务读取你的 L3 画像注入上下文。

**第 6 站 · 事件回流。** 生成的每个片段、每次工具调用，都作为 StreamEvent 发上 StreamBus；WebSocket 路由订阅总线，把事件推回浏览器，你看到字往外蹦。

**第 7 站 · 落盘。** 消息、轮次、事件序列写进 SQLite（`chat_history.db`），记忆事件追加进 L1 JSONL。**每一轮都被完整记录，断线可回放。**

## StreamBus：全项目的"神经"

为什么所有事件都走一条总线？因为**消费者不止浏览器**：前端要实时渲染、会话库要持久化、记忆系统要收集素材、调试面板要监控。如果每个消费者都直接盯着生产者，耦合会爆炸。StreamBus 让生产者只管"广播"，消费者各取所需——这是事件驱动架构的标准解法，和 dsh 的 session 日志异曲同工（一个推、一个拉，解决同一个问题：事实的唯一来源）。

## 为什么要先记这张图

后面每一讲我们都在这张图上"放大"一个站点：卷二放大第 3、4 站（循环与协议），卷三放大第 7 站（记忆与会话），卷四放大第 5 站的 RAG 部分，卷五放大 Mastery Path。地图在手，走到哪都不迷路。

## 试一试

打开 `deeptutor/api/main.py`，滚到路由挂载段（约 L313-482），数一数一共挂了多少个路由模块。找出三个你猜得到用途的、三个猜不到的——猜不到的记下来，它们会在后续章节陆续登场。

## 下一讲预告
地图上最核心的两个协议：BaseTool（Level 1）和 BaseCapability（Level 2）。读懂这两个"合同"，DeepTutor 的插件体系就对你敞开了。
