---
title: 第31讲·subagent 家族：让智能体指挥智能体
summary: 拆解 ctx.subagents 服务 API：一次性与可继续子代理、提供方矩阵、冷恢复与委派深度。
objectives:
  - 区分 one-shot 与 continuable 两类子代理的生命周期
  - 列出 subagent 提供方矩阵并说出各适配器的用途
  - 理解 followup 的"确切在线直接父级"约束与冷恢复机制
tags: [deepseek-harness, subagent, 编排]
keyPoints:
  - subagent seam = 提供方注册表 + 共享请求/结果约定 + 持久描述符 + 可继续编排
  - start 走一次性子代理；startContinuable 建立可持久化的长期下属
  - 提供方矩阵含进程内繁衍、Claude Code/Codex 纳编、ACP 远程、fork 分身
  - delegationDepth 持久化在会话头部（第 07 讲伏笔回收），防无限套娃
---

卷六压轴。前面讲的 MCP/LSP/web 都是"接工具"，subagent 是更高维度的扩展：**把另一个完整的智能体当成你的一个工具**。被派出去的子智能体有自己的会话、自己的上下文窗口、自己的工具箱——主智能体只管下达任务和收取结论。这是突破单一上下文窗口限制、实现任务并行化的正统路径。

## 一、服务 API：ctx.subagents 的双轨制

`SubagentRuntime` 的方法表（README）里最重要的是一对分叉：

**start(name, request)——一次性子代理（one-shot）。** 校验请求 → 解析出"已分离的描述符"→ 等待提供方发布子代理 → 返回一个 SubagentRun 供持有。注释里的防御细节值得注意："如果调用被拒绝，提供方已经清理所有尚未发布的启动资源"——**失败路径不留孤儿**，要么完整开始，要么干净回滚。

**startContinuable(spec)——可继续子代理。** 这是更有野心的形态：建立**持久化**的长期下属，投递初始提示词后立刻拿到 `{ childId, messageId }` 就兑现——"无需等待轮次开始，也无需等待消息写入会话日志"。之后父级可以随时 followup 追加指令。它要求 ctx.agents、会话持久化和具备 prepareContinuable 能力的提供方三重前提——因为要跨重启存活，所以依赖整个持久化地基。

两者的关系像临时工和正式员工：one-shot 干完即走；continuable 有编制（childId）、有档案（持久会话）、可以随时召回。

## 二、followup 与冷恢复

可继续子代理的后续通信走 followup(parent, childId, content)，注意它的严格限定："来自**确切在线直接父级**的一条后续消息"。防止隔代传话和冒名顶替——只有登记在册的亲爹才能给下属发指令。

而子代理不在线时怎么办？"驻留中的子 agent 由其 inbox 直接接受；**不驻留的则从其持久化会话冷恢复**。"冷恢复（cold resume）是仅追加日志哲学的又一次胜利：子代理的全部历史都在日志里，重启一个新实例接上日志末尾即可满血复活——第 13 讲构造函数里那句"从日志恢复 lastTurn"的技术，在这里服务于跨进程的生命周期。

## 三、提供方矩阵：五种出身

README 家族页列出的实现矩阵是本讲的精华：

| 提供方 | 出身 |
|---|---|
| `subagent-in-process-driver` / `spawn-in-process` | **同族繁衍**：在本进程内孵化 dsh 自己的子代理 |
| `subagent-fork-in-process` | **分身术**：fork 现有会话（第 10 讲！）作为起点 |
| `subagent-claude-code` | **纳编竞品一**：把 Anthropic Claude Code 当手下 |
| `subagent-codex` | **纳编竞品二**：把 OpenAI Codex 当手下 |
| `subagent-acp` | **协议远征**：驱动任何 ACP 兼容的远程智能体（第 29 讲的另一端） |
| `subagent-dsh-sdk` | 通过 SDK 编程接口驱动的实例 |

消化一下这件事的分量：调用方统一使用 ctx.subagents 服务 API，**根本不知道也不关心**手下的血统。你的 dsh 主智能体可以把代码重构任务派给一个 Claude Code 实例、把文档检索派给自己进程内的轻量子代理——在它眼里都是"start(名字, 任务)"。第 03 讲"换一个 Provider 就改变整个产品"的终极形态：**换的不是零件，是员工。**

## 四、防套娃：delegationDepth 的闭环

无限套娃是子代理架构的原罪风险：A 派 B，B 又派 C，C 再派 D……每一层都消耗真实的模型调用和金钱。防线在第 07 讲已经埋下：会话头部的 delegationDepth 字段持久记录委派深度（顶级缺省、子代理为父+1），运行时据此执行递归预算。当时说"重启后子代理不能忘了自己是几代"——现在你看到了完整的因果链：头部字段（为什么持久化）← 递归预算（谁消费它）← 无限套娃威胁（什么风险）。dsh 的设计从来不是孤立招式，而是环环相扣的体系。

> 💡 **知识拓展：多智能体编排的两大学派**
> **中心化编排**（本讲路线）：主智能体显式派活收结果，层级清晰、责任明确、易调试——企业级主流。**去中心化协作**：一群平权智能体通过消息板/邮箱自组织（仓库里的实验性 Agent Teams 就带 roster、任务板和 mailbox）。前者像公司，后者像开源社区。中心化输在单点瓶颈（主智能体的上下文有限），去中心化输在收敛难度（聊歪了没人拍板）。dsh 把主线押在中心化、把协作当实验特性——务实的工程判断。

## 试一试

打开 `packages/subagent/subagent/README.zh.md` 通读 SubagentRuntime 完整 API 表，找到 list() 方法的注释回答：提供方按插入顺序返回意味着什么？再结合 registerProvider 的 effect 作用域约束思考：卸载一个提供方插件时，它派出去的正在运行的子代理会怎样？

## 卷六总结 · 卷七预告

五讲连通世界：MCP 接万物工具（27）、LSP 得代码之眼（28）、ACP 双向互通（29）、web 三家引擎（30）、subagent 纳编百军（31）。dsh 不再是一座孤岛，而是互操作网络上的枢纽。

下一卷转入系统的高阶能力层：hooks 如何让外部事件驱动智能体？plan/todo/goal 怎么组织任务？jobs/schedule/workflow 三兄弟如何分工后台工作？skill 技能系统又是什么形态？卷七·高阶能力，开讲。
