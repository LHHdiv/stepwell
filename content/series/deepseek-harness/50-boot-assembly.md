---
title: 第50讲·启动装配：profile 与 bundle 的分层艺术
summary: 精读 app-boot：从一行命令到插件树就绪，配置如何层层叠加、又如何被你覆盖。
objectives:
  - 理解 profile → bundle → patch 三层装配模型
  - 看懂 cordis.patch.yml 覆盖机制
  - 掌握 --dump-config 调试法
tags: [deepseek-harness, boot, 配置]
keyPoints:
  - profile 选择一组 bundle，bundle 携带插件清单，patch 做用户级微调
  - 装配产物是一棵配置树，Cordis 按树挂载插件
  - 改行为的正确姿势：加插件/改 patch，永远不 fork 核心
---

终卷。前面读完了所有零件，现在看总装车间：`packages/boot/app-boot`。

## 三层装配模型

第 04 讲跑过 `pnpm dsh web`，当时没细说中间发生了什么。完整链路：

```
apps/cli/src/bin.ts        解析命令行 → 决定 profile
    ↓
packages/boot/app-boot     装配：profile → bundle 清单 → 合并配置树
    ↓
Cordis Loader              按配置树逐个挂载插件
    ↓
服务就绪：ctx.llm / ctx.tools / ctx.sessions …
    ↓
循环启动，等待第一条输入
```

**profile**（档案）回答"要哪种产品"：`web`（带界面）、`headless`（无界面）、`plugin`（作为插件被加载）。**bundle**（捆绑）回答"装哪些零件"：dsh-base 是地基（模型适配+工具+持久化+沙箱），web 形态再叠上 host/client 等。**patch**（补丁）回答"用户想改哪"：你的 `cordis.patch.yml` 可以按 row id 替换/插入配置树的任意一行。

三层各自独立演化：官方升级 bundle、你只维护自己的 patch——升级不冲突。这是配置管理的教科书设计：**分层叠加，下层不知道上层存在**。

## dump-config：装配的"透视镜"

第 04 讲用过 `--dump-config`。现在你能真正读懂它了：它打印的就是三层叠加后的**最终配置树**。以后遇到"我配置了 X 怎么没生效"，第一反应应该是 dump 一份出来：要么 patch 的 row id 写错了，要么被更高层的 patch 覆盖了——树上一目了然。

## 你的个人智能体 = 一份配置 + 几个插件

把六卷所学串起来，你打造个人智能体的路径其实已经清晰：

1. **人格**：插件注册 system-prompt 段落（第 23 讲）；
2. **专属能力**：defineTool 写工具（第 30 讲），比如查日历、控制米家设备、读你的笔记库；
3. **安全边界**：审批策略 + 沙箱白名单（第 32 讲），家务智能体不该能删代码；
4. **模型选择**：注册你的 DeepSeek 适配器（第 40-41 讲），配好 key；
5. **常驻运行**：选 headless 形态跑在服务器/家里的小主机上，接上微信/Telegram 之类的入口。

每一步都是"加配置、加插件"，dsh 核心一行不改——所以它升级你跟着升，你的智能体却始终是你自己的。这就是"终身伙伴"的工程含义。

## 试一试
跑一次 `pnpm dsh --profile web --dump-config`，在输出里找：你的系统提示词段落注册在树的哪个位置？工具插件挂在哪个节点下？把你未来想改的两个节点圈出来——那就是你个人智能体的施工图。

## 下一讲预告
系列正课完结，但学习才刚开始。下一篇"毕业设计"指南：从零写一个完整插件包（含测试），把它变成你智能体的第一个专属能力。
