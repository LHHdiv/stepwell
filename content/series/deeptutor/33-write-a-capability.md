---
title: 第33讲·加一种小教法（讲清何时挂在聊天上、何时自己开流水线）
summary: 挂在聊天上的 LoopCapability 复用同一套手；独立 BaseCapability 则整堂课换剧本。
objectives:
  - 能区分 LoopCapability 与 BaseCapability 两种挂法
  - 知道 exclusive 知识类能力会换掉工具桌面
  - 能按课型选择「加工具 / 挂循环 / 开流水线」
tags: [deeptutor, 能力, 教法]
keyPoints:
  - 默认 chat 是完整能力，内部跑 agentic 管线
  - LoopCapability 给聊天加提示块与自有工具
  - deep_* 等自管阶段，用标签循环或自有编排
---

同样叫「教法」，粒度差很多：有的只是「这一轮多一只解题手」；有的是「整堂课改成：先审题、再推理、再写答案」。DeepTutor 用两层插件表达这件事——你在第十四卷附近已经见过工具与能力的分工；本讲站在**要不要新开教室**的路口。

## 两条路的结论先放桌上

| 你想要的变化 | 更合适的挂法 | 关键协议 |
| --- | --- | --- |
| 多一个单步动作 | `BaseTool`（上一讲） | `tool_protocol.py` |
| 仍在日常聊天里，但多段提示 / 多几只专用手 | **挂在聊天上的循环能力** `LoopCapability` | `capabilities/protocol.py` |
| 用户显式点选一种深度模式，多阶段剧本 | **独立能力** `BaseCapability` | `capability_protocol.py` |
| 生成书、共写等长事务 | 并列引擎（Book 等），不必硬塞进能力表 | `book/engine.py` 等 |

一句话定义：**Capability（能力）**在产品上常表现为一种模式或教法容器。源码里要再拆开看：有的能力是「整堂课的班主任」（`BaseCapability.run`），有的是「班主任袖口上的徽章」（`LoopCapability`）。

> 小结：先问「还在不在聊天教室上课」，再问「要不要新教室」。

## 挂在聊天上：不拆教室，只加教具与旁白

`deeptutor/capabilities/protocol.py` 里的 **LoopCapability** 约定：激活时，**默认仍使用聊天那一整套内置工具面**（尊重用户开关），再把自己的 `owned_tools` 叠上去。它可以贡献系统提示块、改工具私有参数、在循环前跑一次 `pre_loop` 预热（例如先客观简介附件）。登记在 `deeptutor/capabilities/registry.py` 的 `LOOP_CAPABILITIES`：掌握、解题、Obsidian、子智能体、探索上下文等。

例外是 **KnowledgeCapability**：`exclusive_tools` 为真时，**换掉**聊天工具桌面，只留自己的手加 `ask_user` 底板。这类「知识库特工」不能再顺便 web_search，是刻意的课型收束。

适合挂在聊天上的信号：

- 学生还在同一个聊天气泡里说话；
- 结束条件仍是聊天那套「还按不按按钮」；
- 你只是要多一段教学法提示，或多几只只在某模式下出现的手。

默认的 `ChatCapability`（`deeptutor/agents/chat/capability.py`）本身是完整的 `BaseCapability`：manifest 名叫 `chat`，`run` 里交给 `AgenticChatPipeline`。Loop 能力是管线内部的扩展点，不是替代 `chat` 注册名的另一扇大门。

> 小结：袖口徽章改变这一堂怎么教；教室门牌仍叫 chat。

## 自己开流水线：换门牌，换下课铃

独立 **BaseCapability** 要自备 `CapabilityManifest`（名字、说明、阶段列表、常用工具等），并实现 `async def run(context, stream)`。调度器按 `context.active_capability` 找到它，整轮课归它管。内置名单在 `deeptutor/runtime/bootstrap/builtin_capabilities.py`：`deep_solve`、`deep_question`、`deep_research`、`visualize`、`math_animator`、`mastery_path` 等。

这些模式常常：

- 自己划阶段（planning / reasoning / …）；
- 用标签循环（`THINK` / `TOOL` / `FINISH`）或其他明确交卷条件；
- 经 `stream` 推进度，而不是 `return` 一篇长文了事。

适合自己开流水线的信号：

- UI / CLI 上要出现独立模式名；
- 「讲完了」的含义与寒暄聊天不同（例如必须出完题）；
- 阶段之间有硬边界，不想跟日常工具旁白缠在一起。

加独立能力的常见步骤（读代码级，细节以注册表为准）：实现类 → 写入 `BUILTIN_CAPABILITY_CLASSES` 或经插件加载 → 准备提示词 YAML（多语言目录）→ 用 `deeptutor run <name> "..."` 或网页选模式验证。若你的教法其实只是「聊天 + 多一个工具」，优先回到上一讲或 LoopCapability，免得为小改动维护整套阶段。

> 小结：下课铃不同，就该换门牌；下课铃相同，就别新建楼。

## 试一试

打开 `capabilities/registry.py`，列出 `LOOP_CAPABILITIES` 里有哪些名字。再打开 `builtin_capabilities.py`，看门牌能力列表。任选一个 deep 能力的 `run`（例如 `agents/question/capability.py` 或 solve 目录下的 capability），数一数它是否自己开了阶段。最后用一句话回答：若只想「解题时多强调单位换算」，你选加工具、挂 Loop，还是新 deep 模式？——把理由写在纸上即可。

## 下一讲预告

下一讲毕业设计：搭一个最小家教，用学生能不能学会来验收，不空喊产品形容词。
