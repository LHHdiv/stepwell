---
title: 第18讲·默认辅导课是怎样开场的
summary: 没选模式就上聊天课：同一条 AgentLoop，旁白办事，放下工具才是板书。
objectives:
  - 知道默认能力名是 chat，不必先选课
  - 能说出 exploring 与「没点工具就下课」的关系
  - 明白提示词要求默认动手，缺信息才问学生
tags: [deeptutor, 聊天, AgentLoop]
keyPoints:
  - 调度器空白时默认 chat
  - ChatCapability 把课交给 AgenticChatPipeline → AgentLoop
  - 停止条件：这一轮不再点工具
---

学生推门进来，没填选修单。叫号员（上一卷的调度器）看书包是空的，就请出默认老师：**chat**。能力登记在 `deeptutor/runtime/bootstrap/builtin_capabilities.py`，课堂本身在 `deeptutor/agents/chat/capability.py`。

## 两段牌子，一条炉灶

`ChatCapability` 的说明书（**CapabilityManifest**，能力清单）上写着阶段：`exploring` → `responding`。听起来像两道工序，真正干活的却是一条 **AgentLoop（智能体循环）**：问模型 → 若点了工具就办事并把结果塞回对话 → 再问；若这轮一个工具都不点，这段话就是给学生的讲解，循环结束。

装配车间是 `deeptutor/agents/chat/agentic_pipeline.py`：它按上一讲的规矩拼好桌上的教具，再把话筒交给 `deeptutor/agents/chat/agent_loop.py`。文件头用英文写了同一套礼貌——**narration（旁白）** 对「还在按按钮」，**finish（下课板书）** 对「手放下了」。

简单问候常常第一轮就不按按钮：寒暄不该先检索三本教材。这是快路。

> 小结：默认辅导课 = 一条循环；下课铃响在「这轮没点工具」。

## 开场白怎么写给学生听

中文提示在 `deeptutor/agents/chat/prompts/zh/agentic_chat.yaml`。它要求模型自称学习教练，**不要**向学生背诵内部阶段名；缺关键信息才用 **ask_user** 一次问清，其余情况带着合理假设直接做，并在回答里说明假设。挂了知识库时，还可能先塞一小段预检索片段（seed），不够再用 `rag` 深挖。

轮数有预算：探索用尽，会先给一点收尾时间，再不行就强制「别再按按钮，把能说的说完」。和第八讲同一套课堂礼节，这里只是把它放回「默认课型」的帽子下。

> 小结：提示词管教态，循环管刹车；两者对准「可教的回答」，不是炫技日志。

## 试一试

在网页或 CLI 里什么模式都不选，只问「你好」。再问一道需要翻讲义的题（先挂知识库）。对比两次：第一次是否几乎立刻出板书，第二次是否先出现旁白再出结论。然后打开 `capability.py`，确认它几乎只做一件事——把课交给流水线。

## 下一讲预告

下一讲换「解题课」：还是这条聊天循环，但桌上多了计划尺子——先写步骤，再算，不许跳步装懂。
