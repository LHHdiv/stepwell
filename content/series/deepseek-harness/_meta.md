---
title: DeepSeek Harness 源码精读
en: READING DSH
sub: 从第一行代码到毕业设计，把 DeepSeek 官方开源的智能体框架完整拆一遍。
intro: >
  dsh（deepseek-harness）是 DeepSeek 官方开源的 Agent Harness——把大模型变成一个能干活的智能体所需的全部"骨架"。
  这个系列共九卷 39 讲，覆盖全仓库：从会话日志的数据模型，到 Agent Loop 主循环，
  再到工具沙箱、模型适配、MCP/LSP 协议生态、hooks 与 skill 高阶能力，最后以 profile/bundle 装配和
  个人智能体毕业设计收尾。面向零基础读者：每个知识点先建心智模型，再进源码，就地补齐 TypeScript 语法。
category: source
level: deep
hue: "#2F6B4F"
hue2: "#7FB89A"
status: ongoing
order: 1
phases:
  - name: 卷一 · 启程：世界观与地图（00-04）
    slugPrefix: "0"
  - name: 卷二 · 地基：数据模型与会话日志（10-16）
    slugPrefix: "1"
  - name: 卷三 · 心脏：Agent 接口与主循环（20-25）
    slugPrefix: "2"
  - name: 卷四 · 手脚：工具系统与沙箱（30-34）
    slugPrefix: "3"
  - name: 卷五 · 对话的艺术：LLM 层（40-43）
    slugPrefix: "4"
  - name: 卷六 · 生态协议：连接世界（50-54）
    slugPrefix: "5"
  - name: 卷七 · 高阶能力插件（60-64）
    slugPrefix: "6"
  - name: 卷八 · 产品形态与装配（70-73）
    slugPrefix: "7"
  - name: 卷九 · 毕业：测试、工作区与实战（80-82）
    slugPrefix: "8"
---

「Harness」的本义是**马具**——套在马身上、让人能驾驭马的那套皮带和挽具。大模型就是那匹马力惊人的马，而 harness 就是让人类能安全驾驭它的那套装置。

DeepSeek 官方开源的这套 harness 叫 `dsh`。它回答了一个问题：当我们说「AI 智能体」的时候，工程上到底需要哪些零件，它们又是怎么咬合在一起的？

## 全系列九卷 39 讲

- **卷一（00-04）启程**：什么是 harness、全景地图、一次 turn 的生命线、Cordis 插件框架、动手跑起来
- **卷二（10-16）地基**：Branded ID 类型体操、SessionEventMap 消息词汇表、仅追加日志哲学、deriveMessages 投影、session-query、持久化与 fork、scope 作用域
- **卷三（20-25）心脏**：Agent 接口、主循环骨架精读、工具派发与中断、system-prompt 组装、compaction 压缩与 spill、inbox 输入机制
- **卷四（30-34）手脚**：工具注册表 defineTool、内置工具巡礼、执行流水线、sandbox 沙箱家族与审批策略、shell/terminal/fs 执行世界
- **卷五（40-43）对话的艺术**：LlmAdapter 接缝、llm-deepseek 与 SSE 流式精读、重试与错误处理与 token 计量、credentials 身份密钥
- **卷六（50-54）生态协议**：MCP 客户端、LSP 代码智能、ACP 协议、web-search/fetch 家族、subagent 子智能体家族
- **卷七（60-64）高阶能力**：hooks 拦截体系、plan/todo/goal 三件套、jobs/schedule/workflow 后台工作、skill 技能系统、settings/preset
- **卷八（70-73）产品形态**：profile/bundle/patch 装配机制、client TUI 与 API Gateway、web 前端架构、sdk 编程界面
- **卷九（80-82）毕业**：测试策略与防御性模式、开发工作区调试回路、毕业设计——写出你的个人智能体插件包

本系列的最终目标不只是"看懂"，而是让你有能力基于它打造属于自己的智能体——一个可以陪你学习、工作的终身伙伴。
