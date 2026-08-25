---
title: 第11讲·标签协议：模型回复的第一行决定一切
summary: 精读 core/agentic/labels.py 与 loop.py——用 ```LABEL``` 协议让模型自主导航循环，这是全项目的灵魂。
objectives:
  - 理解标签协议的工作方式与设计动机
  - 读懂 LabelProtocol 的五个字段
  - 对比三种循环控制范式（工具调用式/事件式/标签式）
tags: [deeptutor, agentic, 核心机制]
keyPoints:
  - 模型每轮回复的第一行必须是双反引号包裹的标签（```TOOL```、```FINISH```…）
  - LabelProtocol 定义 allowed/terminal/intermediate/final/tool_label 五要素
  - 不同能力用不同标签集：chat 用三标签，solve 多一个 REPLAN
---

今天读 DeepTutor 的灵魂。先看 `deeptutor/core/agentic/labels.py` 的文档字符串（原文）：

> The agentic engine drives LLM calls with a ```LABEL```+content protocol: prompts require one allowed label, double-backtick-wrapped, on the first line of every reply… Label sets are caller-supplied: chat uses `(FINISH, TOOL, THINK)`, a solve step uses `(THINK, TOOL, FINISH, REPLAN)`…

翻译成大白话：**DeepTutor 要求模型每次回复的第一行，必须是一个双反引号包裹的标签**，声明这一轮的"意图"——是继续思考（THINK）、要调工具（TOOL）、重新规划（REPLAN），还是收工（FINISH）。循环引擎读这个标签决定下一步。

## 为什么不靠工具调用来驱动循环？

你可能会问：dsh 和 pi 都靠"模型是否发起工具调用"来驱动循环，DeepTutor 为什么要发明标签协议？

因为**教育场景的循环形态更丰富**。编码场景的循环很规律：调工具→看结果→再想→直到答完。但教学循环需要"模式切换"：讲解模式→出题模式→判卷模式→重新规划。这些切换如果全靠工具调用表达，会把控制流和业务动作混在一起；用标签则**意图显式化**——模型每轮先"亮牌"，引擎按牌行动。提示词里还可以给每个标签写使用守则，等于给模型装了导航仪。

## LabelProtocol 的五个字段

`loop.py` 第 40-59 行（原文）：

```python
@dataclass(frozen=True)
class LabelProtocol:
    allowed: tuple[str, ...]        # 允许的全部标签
    terminal: frozenset[str]        # 终止性标签（结束循环）
    intermediate: frozenset[str]    # 中间标签（继续循环）
    final: frozenset[str]           # 产出最终答案的标签
    tool_label: str | None          # 触发工具调用的标签
```

frozen dataclass——不可变，协议即宪法。注意"标签集是调用方提供的"：chat 能力注入 `(FINISH, TOOL, THINK)` 三标签，solve 能力多给一个 `REPLAN`（解题卡壳时允许推倒重来）。**循环的"语法"由引擎定，"词汇"由能力定**——这个分层让同一套引擎服务六种模式。

## 与另外两种范式对照

| 范式 | 代表 | 循环靠什么驱动 | 特点 |
|---|---|---|---|
| 工具调用式 | dsh / pi | 模型是否发起 tool_use | 通用、生态标准，但控制流隐式 |
| 事件日志式 | dsh 的 session | 事件追加 + 推导 | 审计强，循环本身仍靠工具调用 |
| 标签协议式 | DeepTutor | 回复首行标签 | 意图显式、模式切换清晰，需提示词纪律 |

没有最优只有适配：编码任务工具调用式顺手，多模式教育任务标签式清晰。**你做个人智能体时，这就是现成的第三种选项**。

## 试一试

打开 `deeptutor/agents/chat/agentic_pipeline.py`（第 185 行起），找到 chat 能力注入的标签集和每个标签的使用守则提示词。看 `THINK` 标签的守则怎么写的——那是教模型"什么时候该继续想而不是急着回答"的话术范本。

## 下一讲预告
循环的燃料与产物：UnifiedContext（一次对话轮的全部输入）与 StreamBus（全部输出的事件总线）。
