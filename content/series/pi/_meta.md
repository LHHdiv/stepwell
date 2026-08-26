---
title: Pi Agent Harness 源码精读
en: READING PI
sub: 从一个能自己装插件的编码智能体，逆向拆解整套自扩展 harness 的工程骨架。
intro: >
  pi（Pi Agent Harness）是 earendil-works 开源的「自扩展编码智能体」——它和 DeepSeek 的 dsh 一样，回答的是同一个问题：
  把大模型变成能干活的生产级智能体，到底需要哪些零件、它们怎么咬合。但 pi 给出了一个更激进的答案：零件的边界本身也是可插拔的。
  这个系列共九卷 46 讲，覆盖全仓库：从统一多供应商的 LLM 抽象层（pi-ai）、手写差分渲染的终端 UI（pi-tui）、
  到把「大脑」放在受信任服务端的 client/server 进程分离、再到 ExtensionAPI 驱动的工具/命令/provider 扩展系统，
  最后以 SQLite 会话仓库、评测与毕业设计收尾。面向零基础读者：每个知识点先建心智模型，再进源码，就地补齐 TypeScript 语法。
  它和本站《DeepSeek Harness 源码精读》是姊妹篇——对照着读，你会看清两个优秀 harness 在「插件化」「信任边界」「可观测性」上的不同取舍。
category: source
level: deep
hue: "#3A2F6B"
hue2: "#8A7FB8"
status: done
order: 2
phases:
  - name: 卷一 · 启程：世界观与地图（00-04）
    slugPrefix: "0-4"
  - name: 卷二 · 地基：LLM 抽象与线协议（05-11）
    slugPrefix: "5-11"
  - name: 卷三 · 心脏：Agent 运行时（12-18）
    slugPrefix: "12-18"
  - name: 卷四 · 手脚：工具与扩展系统（19-24）
    slugPrefix: "19-24"
  - name: 卷五 · 信任边界：client/server 分离（25-28）
    slugPrefix: "25-28"
  - name: 卷六 · 终端 UI 与可扩展能力（29-33）
    slugPrefix: "29-33"
  - name: 卷七 · 持久化与可观测性（34-37）
    slugPrefix: "34-37"
  - name: 卷八 · 产品总装：coding-agent（38-42）
    slugPrefix: "38-42"
  - name: 卷九 · 毕业：测试、调试、实战与附录（43-45）
    slugPrefix: "43-45"
---

「Harness」的本义是**马具**——套在马身上、让人能驾驭马的那套皮带和挽具。大模型就是那匹马力惊人但不识路、不懂交通规则的马；harness 是让人能安全驾驭它的那套装置。

earendil-works 开源的这套 harness 叫 `pi`。它和 DeepSeek 的 `dsh` 是同一道题的两个精彩解。本系列最大的特色是：**pi 把「插件化」做到了极致**——不仅记忆、工具、UI 是插件，连「支持哪家模型供应商」「接受什么斜杠命令」「绑定哪个快捷键」都通过 `ExtensionAPI` 交给扩展去注入。一个 `pi` 进程，装了不同扩展，就变成了不同的产品。

## 全系列九卷 46 讲

- **卷一（00-04）启程**：学习方法与缺口表、十一个包的依赖分层全景、一次对话的生命线、自扩展设计哲学、动手跑起来
- **卷二（05-11）地基**：Message/Model 类型体系、流式归一（AssistantMessageEvent/EventStream）、Provider 统一多供应商、模型注册表与生成代码、framed CBOR 线格式、握手与快照 DTO、遥测契约
- **卷三（12-18）心脏**：Agent 类与 MutableAgentState、主循环 runLoop 双层 while、流式响应与工具派发、顺序/并发工具执行、StreamFn 接缝、ExecutionEnv 与 node 适配、持久会话 harness 与 lane reducer
- **卷四（19-24）手脚**：工具注册表 defineTool、内置工具巡礼、ExtensionAPI 扩展系统、jiti 动态加载、interactive/print/rpc 三模式、SessionManager 与分支
- **卷五（25-28）信任边界**：为什么分进程、server 受信任大脑、client 瘦控制器、Unix socket 可插拔传输
- **卷六（29-33）终端 UI 与可扩展能力**：差分渲染、组件与布局、键位输入分发、事件到组件更新、vitest-evals 轨迹打分
- **卷七（34-37）持久化与可观测性**：SQLite 会话仓库、分支/泳道/事实、写入租约并发安全、AI_TELEMETRY_SCHEMA 埋点
- **卷八（38-42）产品总装**：CLI 自研参数解析、AgentSession 把 Agent 包成会话、扩展式可塑性、模式分派、SDK 逐层工厂
- **卷九（43-45）毕业**：测试策略与防御性模式、开发工作区调试回路、毕业设计，外加命令速查与术语对照两篇附录

本系列与《DeepSeek Harness 源码精读》是姊妹篇。建议对照阅读：当你在 dsh 里看到「everything is a plugin（Cordis）」，再来 pi 里看 `ExtensionAPI`，会立刻理解两者在「插件粒度」上的不同野心。
