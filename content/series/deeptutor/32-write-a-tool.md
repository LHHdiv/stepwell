---
title: 第32讲·加一颗小按钮（对照 BrainstormTool，步骤写细，给非熟手看）
summary: 照着内置头脑风暴工具，写清定义、执行、注册三步，让模型多一颗可按的按钮。
objectives:
  - 能指出 BaseTool 必须实现的两个方法
  - 对照 BrainstormTool 写出最小可用工具骨架
  - 知道注册进 ToolRegistry 后模型才「看得见」
tags: [deeptutor, 工具, 动手]
keyPoints:
  - 说明书（ToolDefinition）与动手（execute）成对出现
  - BrainstormTool 薄包装，逻辑可放旁边模块
  - load_builtins / register 之后才进入可选清单
---

想象遥控器上要多一颗「头脑风暴」键：按下后，家教不去深挖一条路，而是横着给出好几个方向。DeepTutor 里这颗键已经存在，名字叫 `brainstorm`。本讲不要求你发明新算法，只要求你**跟着这颗键的形状**，看懂以后如何再焊一颗自己的。

## 按钮的契约：叫什么、怎么按、按完回什么

一句话定义：**工具（Tool）**是模型在对话中途可以点名调用的一次动作。为什么不能随便写个函数？因为模型只认「名片」：名字、说明、参数表；程序只认 `execute`；返回值要包成 `ToolResult`，好塞回对话。

打开 `deeptutor/core/tool_protocol.py`，先认三样：

1. **`ToolParameter`**：一个参数的名字、类型、说明、是否必填。类型用 JSON Schema 那几个词（`string`、`integer`…）。若是 `array`，请填 `items`，否则有的厂商会直接拒绝。
2. **`ToolDefinition`**：工具名片；`to_openai_schema()` 会变成厂商要的 function 形态。
3. **`ToolResult`**：至少给 `content` 字符串——这是模型下一眼看到的「工具回话」。

基类 **`BaseTool`** 要求你实现：

- `get_definition()` → 返回名片  
- `execute(**kwargs)` → 做事并返回 `ToolResult`

文件里的示例类几乎就是最小骨架。本讲后面所有步骤，都是往这副骨架里填肉。

> 小结：先有名片，再有手指；回话要装在 ToolResult 里。

## 对照 BrainstormTool：薄壳 + 旁边的真逻辑

打开 `deeptutor/tools/builtin/__init__.py` 里的 `BrainstormTool`（类就在文件前部）。逐步对照：

**步骤 A · 起名与说明**  
`name="brainstorm"`，description 用英文写清「广撒网探索多个可能，并给简短理由」。这句会进模型眼睛：写得含糊，它就不爱按，或乱按。

**步骤 B · 参数表**  
两个参数：`topic`（必填）、`context`（选填）。没有花哨嵌套。你做第一颗按钮时，也尽量 1～2 个字符串参数，降低模型填表失败率。

**步骤 C · execute 只做搬运**  
它 `from deeptutor.tools.brainstorm import brainstorm`，把 kwargs 传进去，再把返回字典里的 `answer` 放进 `ToolResult(content=..., metadata=...)`。真逻辑——拼提示词、调 `llm_stream`——在 `deeptutor/tools/brainstorm.py`。这种拆法的好处：协议壳稳定，实验提示词时不必碰注册表。

**步骤 D · 可选：提示词提示（hints）**  
`BrainstormTool` 混入了 `_PromptHintsMixin`，会从 `tools/prompting/hints/` 读「何时优先用我」。没有 hints 也能跑；有 hints，系统提示里的工具导览更像样。

**步骤 E · 出现在内置清单**  
同文件靠后有 `BUILTIN_TOOL_TYPES` 一类列表，把 `BrainstormTool` 收进去。`ToolRegistry.load_builtins()`（`deeptutor/runtime/registry/tool_registry.py`）会实例化并 `register`。全局 `get_tool_registry()` 第一次调用时自动 load。

**步骤 F · 还要能被这一轮选中**  
注册表里有，不等于每次聊天都带上。有的工具在设置页开关；有的随知识库、沙箱等条件自动挂上；也可以在 CLI / 请求里显式点名。加完新工具后若「模型从不按」，先查：有没有进 `BUILTIN_TOOL_TYPES`？这一轮的 enabled 列表里有没有它的名字？日志里有没有执行记录？

若你要仿做一颗「比喻生成」小按钮，最小路径是：新建 `my_metaphor.py` 写异步函数 → 在 `builtin/__init__.py` 加 `MetaphorTool` 薄壳 → 推进 `BUILTIN_TOOL_TYPES` → 重启进程 → 用一句明确需要比喻的提问试探。不必一次搞 MCP、不必改前端。

> 小结：壳在 builtin，肉可在旁边；清单 + 本轮启用，模型才摸得到。

## 试一试

只读不改也行：从 `BrainstormTool.get_definition` 抄参数名到纸上，再打开 `brainstorm.py`，看 `_SYSTEM_PROMPT` 是否要求「5–8 个方向」这种可检查的输出。然后在 `tool_registry.py` 找到 `load_builtins` 与 `execute`，确认「按名查找 → 调 execute」这条线。若你环境允许改代码，再按步骤 F 加一颗只返回固定字符串的 Hello 工具，用 CLI 显式 `--tool`（或设置里启用）验证模型能点到——具体旗标以你安装版 CLI 帮助为准，不要背死过期参数。

## 下一讲预告

下一讲升级：何时只在聊天循环上挂一种小教法，何时值得自己开一整条流水线能力。
