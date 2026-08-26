---
title: 第16讲·一种完整玩法是什么
summary: 能力是接管一整轮课的剧本：有简历、有 run，结局要会打铃。
objectives:
  - 能用「完整玩法」理解 Capability，而不是「又一堆函数」
  - 指认 CapabilityManifest 与 run(context, stream) 合同
  - 分清调度器请来的能力，和插在聊天上的循环插件
tags: [deeptutor, 能力, BaseCapability]
keyPoints:
  - 能力接管一轮：读统一书包，往直播间写过程
  - 简历供菜单、命令行别名和默认配置使用
  - chat / deep_solve 可以很薄，重活在流水线或循环插件里
---

选修课目录上的一门课，不是教室里的某一颗投影仪按钮。它有课名、简介、分几阶段、常用教具列表；学生选了它，整节课的节奏由这门课负责，最后还要会宣布下课。你不会把「翻页笔」和「微积分选修」当成同一层东西——尽管翻页笔会出现在微积分课上。

DeepTutor 的 **能力（Capability）**——人话：一种完整玩法——就是目录上的那一门课。合同在 `deeptutor/core/capability_protocol.py`。上一讲是 Level 1 的按钮与课表；本讲是 Level 2：谁来接管这一整轮。

## 简历 + 开演

**CapabilityManifest（能力清单 / 简历）** 是静态元数据，常见字段包括：

- `name` / `description`：目录上的课名与简介；
- `stages`：阶段名列表（给进度与文档用，不强制等于源码里每一个函数名）；
- `tools_used`：常用工具名（说明性为主，真实今日名单仍要走第 15 讲的拼单）；
- `cli_aliases`：命令行短名（如 solve）；
- `request_schema` / `config_defaults`：这一轮请求长什么样、默认旋钮是什么。

网页模式列表、CLI 帮助、SDK 发现，都靠简历说话，而不用先把课上完。`CapabilityRegistry.get_manifests()` 还会附上国际化后的描述，给界面直接用。

**BaseCapability（能力基类）** 要求子类：

- 挂上一份 `manifest`；
- 实现 `async run(self, context: UnifiedContext, stream: StreamBus) -> None`。

两个参数你在前面几卷已经见过：

- **UnifiedContext（统一上下文）**：这一轮的书包——用户那句话、会话、知识库、语言、工具开关、metadata 盖戳……
- **StreamBus（流总线 / 直播间）**：边上课边向外喊过程与正文。

能力一般不负责把事件推到浏览器 WebSocket 的每一根线；它只要往直播间写。调度器（第 07 讲）负责请对人、旁听直播、无论成败都打下课铃。仓库说明还强调：多种能力最终常汇合到共享的结果出口（如 `emit_capability_result`），好让「这一轮结果长什么样」别各说各话。

内置玩法名单在 `deeptutor/runtime/bootstrap/builtin_capabilities.py`，由 `deeptutor/runtime/registry/capability_registry.py` 加载：把字符串路径 `模块:类名` import 出来，实例化并 `register`。插件发现失败就跳过并打日志，不拖垮整张课程表。`get_capability_registry()` 第一次调用时加载内置与插件。

> 小结：简历给人挑选；`run` 对人负责把一课上完。

## 薄入口，厚厨房

不是每个能力文件都又长又猛。两个极端都合法——这正是「玩法」而不是「必须重写成框架」的证据：

**聊天。** `deeptutor/agents/chat/capability.py` 的 `ChatCapability.run` 几乎只做：新建 `AgenticChatPipeline`，交给它。简历上的阶段写 exploring / responding，工具列表指向可选工具集。礼貌、挂载、循环，都在流水线与 `agent_loop` 里。

**解题。** `DeepSolveCapability.run` 同样短：盖 `solve_mode`、读参数、还是跑 `AgenticChatPipeline`。厚的部分在循环插件与三颗脊柱工具（第 10 讲）。简历上 `stages=["responding"]`，诚实反映「没有另写多段管线」。

**出题 / 研究 / 可视化 / 动画。** 往往更像自管的多阶段流水线，内部再调用亮灯循环或其它子代理。它们仍然是 `BaseCapability`：对外一样是「选一个名字，把书包和直播间给我」。

读具体文件时，建议先看 `run` 的前二十行：它是转交流水线，还是自己 `async with stream.stage(...)` 分段推进？薄入口不是偷懒，是把「目录项」和「厨房实现」解耦——调度器只认目录项。

> 小结：能力是门牌；厨房可以租用聊天炉灶，也可以自建流水线。

## 别和「循环插件」撞名

中文里都爱说「能力」，源码里却有两层容易混。对照表比形容词有用：

| | 调度器请来的 Capability | 聊天上的 LoopCapability |
|---|---|---|
| 合同文件 | `core/capability_protocol.py` | `capabilities/protocol.py` |
| 何时上场 | 用户 / 默认选中这一轮玩法 | 该玩法盖戳后，在聊天流水线内激活 |
| 典型例子 | `chat`、`deep_solve`、`deep_question` | `SolveLoopCapability`、掌握度钩子 |
| 职责 | 拥有整轮 `run` | 追加工具、剧本、私有参数、可选 pre_loop |
| 登记处 | `CapabilityRegistry` / `builtin_capabilities.py` | 聊天流水线组装的插件列表 |

所以「解题为什么能挂在聊天上」不是说 deep_solve 不是能力——它是完整玩法；而是说它的 `run` 选择**复用聊天炉灶**，再靠循环插件把教法钉进去。出题则是另一种完整玩法，炉灶不同，常用灯当交卷信号。

读到 `KnowledgeCapability`（同在 `capabilities/protocol.py`）时再记一笔：它是循环插件族里「独占工具面」的分支，整间教室改成知识实验室，和第 15 讲的 `exclusive` 拼单是同一故事的两面。它仍通过结构满足循环插件协议，但 `exclusive_tools = True` 改变课表公式。

当你以后想「加一种教法」，先问：这是新的选修课目录项（新的 `BaseCapability` + 写进 builtin 或插件发现），还是已有聊天课上的新教法附件（新的 `LoopCapability`）？问错层，文件会建错地方——第 02 讲说的「解题在 capabilities/，出题在 agents/」正是这种分家的痕迹。

也可以用学生体验倒推：

- 若用户需要在模式菜单里**点选**它（或 CLI 里 `run <name>`），它多半是目录项能力；
- 若用户还在聊天/解题框里，只是老师突然多了计划章、掌握度章，它多半是循环插件；
- 若用户只是多了一颗可点的键（搜索、笔记），它是工具，连能力都还不算。

三层分清后，卷四的地图就完整了：按钮（14）→ 今日课表（15）→ 完整玩法（16）→ 下一讲的登记与发现。之后你要改「下课方式」，也会知道该进聊天循环、亮灯循环，还是只改某一门课的 `run`。

> 小结：目录项接管一轮；循环插件修饰聊天这一轮怎么教；加东西先选层；用菜单倒推比用文件夹倒推更稳。

## 试一试

打开 `capability_protocol.py`，只读 `CapabilityManifest` 字段和 `BaseCapability.run` 的签名。再并列打开 `agents/chat/capability.py` 与 `capabilities/solve/capability.py`，看两个 `run` 有多像。扫一眼 `builtin_capabilities.py` 的名字列表——目录上每一门课，都应能指回一个类路径。若还有余力，打开 `capabilities/protocol.py` 文件头，读「复用完整工具面、只追加不镇压」那段英文，用第 15 讲的拼单顺序复述一遍。

## 下一讲预告

下一讲走进储物柜：内置工具里哪些是你能开关的体验增强，哪些要等挂了讲义、开了沙箱才自动摆上桌。
