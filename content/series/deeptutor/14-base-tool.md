---
title: 第14讲·一颗按钮的说明书
summary: 工具是模型可点的一颗按钮：说明书给模型看，执行把结果说回对话。
objectives:
  - 能指认 ToolDefinition、execute、ToolResult 各管哪一段
  - 知道暂停问人和普通返回差在结果对象上的字段
  - 明白「推迟加载」的按钮为什么先只露一行简介
tags: [deeptutor, 工具, BaseTool]
keyPoints:
  - 说明书是给模型的；执行是给教室的
  - ToolResult 可带引用、失败、暂停、终止等信号
  - deferred 工具先不上完整参数表，需要时再加载
---

遥控器上每一颗键，都得同时满足两件事：面板上印着「它干什么、要你按什么」，按下之后真的打到电视机。缺一面，要么没人按，要么按了没反应。

DeepTutor 里的 **工具（Tool）**——人话：模型可以点名调用的一颗按钮——也是同一结构。从第 08 讲起我们不断说「点按钮」；从本讲起，按钮不再是比喻，而是一份可以打开的合同。合同写在 `deeptutor/core/tool_protocol.py`。卷四从此把「两层插件」的第一层钉牢：先会做一颗键，下一讲才谈钥匙串与今日课表。

## 说明书：让模型知道这颗键存在

抽象基类叫 **BaseTool（工具基类）**。子类至少要交两样作业：

1. `get_definition()` → 返回 **ToolDefinition（工具定义）**：名字、一段说明、参数列表；
2. `async execute(**kwargs)` → 真的干活，返回 **ToolResult（工具结果）**。

`ToolDefinition.to_openai_schema()` 会把定义收成常见的函数调用 JSON 形状，好让模型在「可选函数」列表里看见它。参数用 `ToolParameter` 描述：名字、类型、是否必填、枚举、数组的 `items` 等。有个实操细节写在注释里：类型是数组时最好写明 `items`；有的供应商缺了会直接 400，源码为此准备了兜底默认。对外来的复杂 JSON Schema，也可以走 `raw_parameters`，避免强行压成扁平面参数时丢信息（MCP 适配常见）。

看一颗真实按钮更清楚。`deeptutor/tools/builtin/__init__.py` 里的 `BrainstormTool`：

```python
class BrainstormTool(BaseTool):
    def get_definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="brainstorm",
            # 键帽上的字：围绕主题开阔思路
            description="Broadly explore multiple possibilities...",
            parameters=[
                ToolParameter(name="topic", type="string", ...),
                ToolParameter(name="context", type="string", required=False, ...),
            ],
        )

    async def execute(self, **kwargs) -> ToolResult:
        # 真的去跑头脑风暴服务
        result = await brainstorm(topic=kwargs.get("topic", ""), ...)
        return ToolResult(content=result.get("answer", ""), metadata=result)
```

白话拆开：定义阶段不跑搜索、不花钱，只把键帽印好；执行阶段才调用服务，把答句放进 `content`。这串字稍后作为 `role=tool` 消息回到对话，模型下一轮才读得懂「按钮返回了什么」。`name` 属性默认来自定义里的名字，登记表用它当钥匙标签。

另有 `get_prompt_hints`：给系统提示词用的短说明、何时使用、输入格式、别名等。登记表可以据此拼出「今天教室里有哪些键」的人话清单（`build_prompt_text`），而不只丢给模型一堆 JSON——辅导场景里，模型有时更吃「何时该用」的句子。

> 小结：先印键帽，再接线；模型看见的是定义，教室发生的是执行。

## 结果对象：不只是一段文字

`ToolResult` 默认很谦虚：一段 `content`、是否 `success`、可选引用 `sources`、自由 `metadata`。但辅导场景还需要几种「特殊信号」，它们也挂在这同一个对象上——循环读的是字段，不是你在 `content` 里写的自然语言暗示：

- **`pause_for_user`**：请循环在同一轮里停下来问学生（第 09 讲）。`AskUserTool` 成功时带上结构化问题载荷；`metadata["ask_user"]` 给前端画卡；占位 `content` 只在异常中断时当日志。
- **`terminate_turn`**：这颗键的输出直接当作本轮终稿。注释说 ask_user 已改走暂停；终止留给真正「键即句点」的场景。
- **`success=False`**：明确失败时，模型仍可读 `content` 里的错误说明，便于改参数再试。
- **`sources`**：检索类按钮的引用行，经直播间亮到屏幕上。

还有一个类级开关：`deferred = False`。若为真，表示 **推迟披露（progressive disclosure）**——人话：完整参数表先别塞进每一轮的工具列表；系统提示里只留一行简介，模型需要时再通过 `load_tools` 之类把详细说明书加载进来。MCP 外来工具常常这样，免得一上来上百颗键挤爆上下文。

文件里还有 `ToolLookup` 协议：许多调用方只需要查找 / 列名 / 生成 schema / 执行，不该拿到注册与注销权——那是进程级登记表的事。`provider_identity` 则提醒：别靠拆名字猜测「这是哪台 MCP 服务器」；身份应是工具对象上的明确字段，UI 才能显示对人。

> 小结：结果既能回传作业，也能举手提问或宣布下课；信号在字段里，不在修辞里。

## 按钮在辅导里的脾气

和「万能插件函数」相比，DeepTutor 的按钮更在意课堂信号：

- 检索类常带 `sources`，学生才看得到依据；
- 问人走暂停字段，而不是把猜测写进板书；
- 解题脊柱按钮（第 10 讲）通过结果改 `SolveSession`：计划是否提交、某步是否勾完；
- 失败要诚实，好让模型下一轮改，而不是装成功。

你以后若要加一颗键，最小路径就是：继承 `BaseTool`，写清定义与执行，返回规整的 `ToolResult`，再登记进表（下一讲）。不必先懂整台循环；聊天循环和亮灯循环都只认这张合同。读 `AskUserTool.execute` 结尾那几行赋值，是把「说明书 → 课堂信号」连起来的最好练习。

也可以对照解题脊柱：`SolvePlanTool` 同样继承 `BaseTool`，但 `execute` 里写的是会话状态，而不是网页搜索。合同相同，脾气不同——这正是「一层插件」的力量：循环不必为每一种教具特判类名，只要认 `ToolResult` 上的字段与内容。若你发现自己想在循环里写 `if tool_name == "ask_user":`，先回头看结果对象够不够表达；多数时候，字段已经预留了。

> 小结：一颗好按钮 = 诚实的说明书 + 可回读的结果 + 必要时的课堂信号；新脾气优先加在结果里。

## 试一试

打开 `tool_protocol.py`，浏览 `ToolResult` 的字段注释，尤其是 `pause_for_user` 与 `terminate_turn`。再打开 `builtin/__init__.py` 里 `AskUserTool.execute` 的返回值，看它如何同时设置 `content`、`metadata["ask_user"]` 和 `pause_for_user`。想一想：若只有文字、没有 `pause_for_user`，循环还知不知道要等你点选项？

## 下一讲预告

下一讲看教室门口的钥匙串：登记表怎样收齐所有按钮，以及「今天这一轮」究竟准带哪几颗进门。
