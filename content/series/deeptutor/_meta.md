---
title: DeepTutor 源码精读
en: READING DEEPTUTOR
sub: 拆解 HKUDS 的终身个性化导师系统：标签驱动的智能体循环、三层记忆、多引擎 RAG 与"活书"引擎。
intro: >
  DeepTutor 是一个 agent-native 的学习工作台：聊天、测验、研究、可视化、解题、
  精通路径，全部跑在同一个智能体循环上。这个系列带你从零开始读懂它的 Python
  后端与 Next.js 前端，重点是三样东西：标签协议驱动的循环、可检视的三层记忆、
  多引擎 RAG——它们同样是打造个人智能体的核心零件。
category: source
level: core
hue: "#7A4B8F"
hue2: "#C9A0DC"
status: ongoing
order: 2
phases:
  - name: 卷一 · 世界观与地图
    slugPrefix: "0"
  - name: 卷二 · 核心循环与插件体系
    slugPrefix: "1"
  - name: 卷三 · 记忆与会话
    slugPrefix: "2"
  - name: 卷四 · RAG 知识库
    slugPrefix: "3"
  - name: 卷五 · 教育引擎
    slugPrefix: "4"
  - name: 卷六 · 生态与实战
    slugPrefix: "5"
---

如果说 deepseek-harness 是"如何造一匹好马具"，DeepTutor 就是"如何让马当好一位家庭教师"。

它把**学习**这件事拆成了工程：聊天/测验/研究/可视化/解题/精通路径六大模式跑在同一个智能体循环上；知识库、书、笔记、题库、人格、记忆全部连通；最难得的是它的**三层记忆**（L1 流水账 → L2 表面摘要 → L3 跨面综合）完全可检视——你能亲眼看到 AI 是怎么"记住你"的。

本系列基于 v1.5.x 真实源码精读，所有文件路径与代码都来自仓库原文。
