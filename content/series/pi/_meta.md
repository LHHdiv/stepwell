---
title: Pi 智能体源码精读
en: READING PI
sub: 拆解 Pi Agent Harness：自扩展编码智能体的紧凑架构——核心循环、多供应商抽象、会话树与 TUI。
intro: >
  Pi（pi.dev）是一个"可自我扩展"的编码智能体：10 个大包组成的紧凑 TypeScript
  架构，35+ 模型供应商统一接入，JSONL 会话树，自动压缩，以及一套让智能体
  "给自己装插件"的扩展系统。本系列带你从零读懂它的每一层，并与 DeepSeek
  Harness 相互印证——两个项目对照读，智能体架构的全貌自然浮现。
category: source
level: core
hue: "#5A3A5E"
hue2: "#B08BC9"
status: ongoing
order: 3
phases:
  - name: 卷一 · 世界观与地图
    slugPrefix: "0"
  - name: 卷二 · AI 抽象层（pi-ai）
    slugPrefix: "1"
  - name: 卷三 · 核心循环（pi-agent-core）
    slugPrefix: "2"
  - name: 卷四 · 编码智能体（coding-agent）
    slugPrefix: "3"
  - name: 卷五 · 会话树与压缩
    slugPrefix: "4"
  - name: 卷六 · 扩展系统与实战
    slugPrefix: "5"
---

Pi 的自我定位是 **self extensible coding agent**——可自我扩展的编码智能体。"自我扩展"三个字是理解全项目的钥匙：它不只是"能装插件"，而是**智能体自己就能给自己装插件**（扩展系统 + Skills 标准）。

与 DeepSeek Harness 的"微内核 + 数百插件"不同，pi 走的是**紧凑的库式分层**路线：10 个大包、显式 import、无 DI 容器。两条路线没有高下之分，但对照着读，你会同时看到智能体架构的两种经典答案。

本系列基于仓库真实源码（npm workspaces，TypeScript），所有文件路径与行数均经核实。
