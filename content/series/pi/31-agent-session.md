---
title: 第31讲·AgentSession：3343 行的总指挥
summary: 精读 agent-session.ts 的类结构：四种模式共享的编排核心，自动压缩、重试、分支都在这。
objectives:
  - 掌握 AgentSession 的职责边界（组合了什么、对外暴露什么）
  - 理解自动压缩的触发与溢出恢复
  - 认识 branch/fork/tree 的会话操作
tags: [pi, agent-session, 编排]
keyPoints:
  - AgentSession 组合 Agent + SessionManager + SettingsManager + ExtensionRunner
  - 自动压缩触发 + 溢出恢复（_overflowRecoveryAttempted）
  - branch/fork/tree 是会话树操作的用户入口
---

`packages/coding-agent/src/core/agent-session.ts`，3343 行，pi 的总指挥。文件头注释（原文）："This class is shared between all run modes (interactive, print, rpc)"——第 01 讲的"四种模式一个内核"就落在这个类上。

## 职责边界：组合器而非实现者

AgentSession 自己不实现循环（那是 agentLoop 的活）、不实现存储（那是 SessionManager 的活）。它是**组合器**：

- 组合 `Agent`（状态+订阅）、`SessionManager`（持久化）、`SettingsManager`（配置）、`ExtensionRunner`（扩展事件）；
- 对外暴露高层 API：`prompt()/steer()/followUp()/compact()/setModel()`，以及会话树操作 `branch/fork/tree 导航`；
- 承担"胶水逻辑"：自动压缩触发、请求失败重试、bash 执行协调、扩展事件分发。

读大文件的心法再次生效：**先读类头（第 305-360 行的字段声明），再按方法名导航**，永远不要线性硬啃 3343 行。

## 自动压缩与溢出恢复

AgentSession 挂着压缩的自动触发：每轮结束后检查上下文用量，超过阈值（`contextWindow - reserveTokens`）就调 `compact()`（卷五细讲原理）。

更有意思的是**溢出恢复**（`_overflowRecoveryAttempted` 标志）：如果请求因为超出上下文被供应商拒绝（比如塞了一张巨大的图），AgentSession 会尝试紧急压缩然后重试一次——并且用标志位保证**只重试一次**，避免"压缩→还是超→再压缩"的死循环。失败路径的设计总是最能看出功力的地方。

## 会话树操作

`branch`（从某条消息分出新枝）、`fork`（复制整个会话）、`/tree` 命令（可视化切换分支）——这些用户功能全部由 AgentSession 协调 SessionManager 完成。卷五我们会深入 JSONL 里的 parentId 链，看树是怎么存的。

## 与 dsh 的对照

AgentSession ≈ dsh 的 app-boot 装配产物 + agent-loop 驱动器的合体。pi 把"编排"做成一个大类，dsh 把"装配"做成配置树——再次看到两条路线的取舍：**pi 的方式好读好改，dsh 的方式好换好拼**。

## 试一试

在 agent-session.ts 里搜 `compact`，列出所有相关方法。找出自动触发的检查点在哪个方法里——它是在每轮结束后调用，还是消息发送前？

## 下一讲预告
卷五：会话的持久化细节。JSONL 格式、parentId 链、以及 pi 独有的"会话树"。
