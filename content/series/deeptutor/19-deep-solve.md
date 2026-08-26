---
title: 第19讲·解题：先写步骤再算
summary: 深度解题挂在聊天循环上：先交计划，一步做完再翻页，改思路有次数上限。
objectives:
  - 知道 deep_solve 不是另起炉灶，而是给聊天课贴上解题标签
  - 能说出 solve_plan、solve_finish_step、solve_replan 各管什么
  - 明白「跳步」会被会话状态拦住，不是靠模型自觉
tags: [deeptutor, 解题, deep_solve]
keyPoints:
  - DeepSolveCapability 只打标，真正跑的是 AgenticChatPipeline
  - 计划与逐步门闩在 SolveSession 里
  - 智力在循环出口，纪律在工具与会话
---

黑板左侧写着大字：先列步骤，再动笔。有的学生却提笔就算，算到一半发现缺条件。DeepTutor 的 **deep_solve（深度解题）** 把这句校规写进软件：模型可以很聪明，但不许在没交计划之前假装已经开干。

## 还是聊天课，多三把尺子

能力入口在 `deeptutor/capabilities/solve/capability.py`。它几乎不做「自己的流水线」：给上下文打上 `solve_mode`，定好本轮会话号，读一点轮数 / 改计划预算，然后调用和聊天一样的 `AgenticChatPipeline`。

真正把解题纪律塞进循环的，是 `deeptutor/capabilities/solve/loop.py`：它在系统提示里贴上解题剧本（中文版见 `deeptutor/capabilities/solve/prompts/zh/system.md`），并把三把专用工具挂上桌：

- **solve_plan**：先交分析 + 有序步骤（多半 2–6 步；特简单也可以一步）。步骤编号由服务器写成 S1、S2……模型管目标，不管抽屉钥匙。
- **solve_finish_step**：这一步真做完了，交一句摘要；中间翻教具的碎嘴会被收成一行，省上下文。然后才发下一张任务卡。
- **solve_replan**：方向错了可以改计划，但有次数上限；改到没预算，就得拿现有结果收尾。

状态记在内存里的 **SolveSession（解题会话）**，见 `deeptutor/capabilities/solve/session.py`。没计划就想标「做完」、乱填步骤号，工具会拒绝——这是门闩，不是作文评语。

> 小结：解题课 = 聊天循环 + 计划门闩；聪明在模型，不许跳步在引擎。

## 教具还在，纪律在前

解题剧本明确说：计划交完之后，才用 `code_execution`、`rag`、`reason`、`geogebra_analysis` 等真正算、查、还原图形。用户在设置里关掉的网页搜索，解题课也尊重——上一讲的「体验开关」在这里继续有效，只是桌上**额外**多了三把解题尺子。

全部步骤完成后，模型才写最终答案：先给精确结果，再讲清楚过程。像监考老师收卷：步骤勾完，才允许在卷首写「答」。

> 小结：共用聊天的教具桌，但第一动作必须是交计划。

## 试一试

打开 `solve/prompts/zh/system.md`，数一数它命令「第一件事」是什么。再打开 `solve/tools.py`，看没有会话时工具怎样客气地拒绝。若你本机能跑 CLI，试：`deeptutor run deep_solve "解方程 x^2=4"`，观察是否先出现计划再出现计算。

## 下一讲预告

下一讲走出「挂在聊天上」的课型，去看出题课和研究课：它们为什么常常要先亮标签灯，才能算交卷。
