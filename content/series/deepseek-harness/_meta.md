---
title: DeepSeek Harness 源码精读
en: READING DSH
sub: 拆解 DeepSeek 官方开源的智能体运行框架，看一个真正的 Agent 是如何被构造出来的。
intro: >
  dsh（deepseek-harness）是 DeepSeek 官方开源的 Agent Harness——把大模型变成
  一个能干活的智能体所需的全部"骨架"：会话管理、工具调用、模型适配、插件系统。
  这个系列带你从第一行代码开始，沿着一次对话的生命线，逐个拆开它的核心部件，
  最终目标是：基于它打造属于你和家庭的个人超级智能体。
category: source
level: core
hue: "#2F6B4F"
hue2: "#7FB89A"
status: ongoing
order: 1
phases:
  - name: 卷一 · 世界观与准备（00-04）
    slugPrefix: "0"
  - name: 卷二 · 数据模型：一切的地基（10-16）
    slugPrefix: "1"
  - name: 卷三 · 主循环：产品的心脏（20-25）
    slugPrefix: "2"
  - name: 卷四 · 工具系统：智能体的手脚（30-32）
    slugPrefix: "3"
  - name: 卷五 · LLM 层：与模型对话的艺术（40-41）
    slugPrefix: "4"
  - name: 卷六 · 组装启动与个人智能体实战（50-51）
    slugPrefix: "5"
---

「Harness」这个词的本义是**马具**——套在马身上、让人能驾驭马的那套皮带和挽具。大模型就是那匹马力惊人的马，而 harness 就是让人类能安全驾驭它的那套装置。

DeepSeek 官方开源的这套 harness 叫 `dsh`。它回答了一个问题：**当我们说"AI 智能体"的时候，工程上到底需要哪些零件，它们又是怎么咬合在一起的？**

## 全系列 25 讲 · 六卷完整路线

- **卷一（00-04）世界观与准备**：什么是 harness、全景图、一次 turn 的生命线、Cordis 插件框架、动手跑起来
- **卷二（10-16）数据模型**：Branded ID、消息词汇表、Session 日志"宪法"、deriveMessages、查询投影、持久化、scope 隔离
- **卷三（20-25）主循环**：Agent 接口五动词、Agent Loop 骨架、工具派发与中断、system-prompt、压缩、子智能体
- **卷四（30-32）工具系统**：工具注册表与 defineTool、内置工具巡礼、沙箱与审批
- **卷五（40-41）LLM 层**：LlmAdapter 接缝、DeepSeek 适配器与 SSE 精读
- **卷六（50-51）组装与实战**：profile/bundle 装配、毕业设计——写出你的第一个插件包

本系列的最终目标不只是"看懂"，而是让你有能力基于它维护一套属于自己的智能体——一个可以陪你学习、工作的终身伙伴。
