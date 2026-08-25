---
title: 第21讲·Agent Loop 精读（上）：516 行的骨架
summary: 分段精读 core/agent-loop/src/agent.ts 的整体结构：领取输入、开回合、组装请求——先看清骨架再抠细节。
objectives:
  - 画出 agent.ts 的函数级调用骨架
  - 理解"领取输入（claim）"为什么是循环的第一步
  - 理解 prompt sections + tool schemas 的组装过程
tags: [deepseek-harness, agent-loop, 源码精读]
keyPoints:
  - agent.ts 是 Agent 接口的唯一具体实现，516 行
  - 每轮从 inbox claim 输入开始，到日志写满一个 turn 结束
  - 请求 = 系统提示词 sections + deriveMessages 的历史 + 工具 schema 清单
---

今天读 dsh 的心脏：`packages/core/agent-loop/src/agent.ts`。516 行，是全仓库最核心的单文件。一次啃完不现实，分两讲：本讲看骨架，下一讲抠细节（工具派发与中断处理）。

## 先看地图：文件里有什么

打开文件，忽略细节先数"积木"。文件大致由这些部分组成（从上到下）：

1. **导入与类型**：依赖 cordis 上下文、session、tools、llm 等包；
2. **一个默认导出的插件函数**——记住第 03 讲说的，这个循环本身是插件；
3. **驱动器类/闭包**：持有运行状态（当前回合号、是否运行中）；
4. **主循环函数**：领取输入 → 开 turn → 逐步执行；
5. **单步执行函数**：组装请求 → 流式调用模型 → 处理工具调用；
6. **辅助函数**：inbox 处理、中断处理、错误兜底。

## 骨架：伪代码版

把 516 行压缩成 30 行伪代码，主循环长这样：

```
loop:
  input = inbox.claim()            # ① 领取输入（阻塞等待）
  turn = log(turn/start)           # ② 回合开始，写入日志

  while true:                      # ③ 步循环
    decision = preStep(input)      # ④ 问插件：这步能开始吗？
    if decision == reject: break

    messages = deriveMessages()    # ⑤ 从日志推导模型视野
    prompt   = assemblePrompt()    # ⑥ 系统提示词 + 历史 + 工具清单

    stream = llm.stream(prompt)    # ⑦ 发起流式请求
    for chunk in stream:
      log(assistant/chunk, chunk)  # ⑧ 每个碎片实时入日志

    reply = log(assistant/message) # ⑨ 完整回复入日志

    if reply.hasToolCalls:         # ⑩ 模型想用工具？
      for call in reply.toolCalls:
        result = executeTool(call) # ⑪ 执行（下一讲细讲）
        log(tool/result)
      continue                     # ⑫ 回到③，开始下一步
    else:
      break                        # ⑬ 模型说完了，回合结束

  log(turn/end)
```

**先把这个骨架刻进脑子**，再读源码时你做的只是"把伪代码的每一行对应到真实函数"。这是读任何大型源码的通用技巧：先地图后道路。

## ① 为什么"领取输入"是第一步

`inbox.claim()` 意味着循环是**输入驱动**的：没有输入时，智能体安静待着（idle），不消耗任何资源。这回答了一个新手常见疑问："智能体会不会自己乱动？"——不会，一切动作都始于一条被领取的输入。

而 claim 的实现直接连着第 20 讲的 inbox：steer 的消息会在下一步开始前被 claim 出来，followup 的会在下回合。**接口设计（types.ts）与循环实现（agent.ts）就这样咬合上了。**

## ⑤⑥ 组装请求：三样东西

第 ⑤⑥ 步是"决定模型看到什么"的关键。最终发给模型的请求由三部分拼成：

1. **系统提示词（system prompt sections）**——由 `core/system-prompt` 包装配，各插件可以贡献自己的段落（你的人格设定、环境信息、工具使用说明都在这里）；
2. **历史消息**——`deriveMessages()` 从日志推导（第 12 讲讲的，这里用上了）；
3. **工具清单（tool schemas）**——从工具注册表取出当前可用的全部工具定义，告诉模型"你有哪些工具、参数怎么填"。

注意一个安全细节：**模型永远看不到日志原文，只看到推导后的消息视图**。日志里可能有 UI 才需要的事件（chunk 碎片等），推导过程会把它们过滤、折叠成模型该看的形态。

## ⑧ 为什么 chunk 也要入日志？

有人会问：碎片那么碎，记它干嘛？两个原因：一是 UI 回放时能还原"逐字输出"的体验；二是中断恢复——如果进程在生成中途崩溃，重启后从日志能精确知道断在哪。**日志的完整性优先于日志的精简**，这是事件溯源架构的一贯取舍。

## 试一试

打开 agent.ts，用编辑器的函数列表/大纲视图（VS Code 里 `Ctrl+Shift+O`）浏览全部函数名。对照本讲伪代码，找到：主循环函数叫什么？单步执行函数叫什么？claim 在哪个函数里被调用？——不用读懂实现，能对上号就达标。

## 下一讲预告

骨架清楚了，下一讲抠最精彩的两块细节：工具调用怎么派发执行、用户中途打断（cancel/steer）怎么被优雅处理——这是智能体工程里最容易出 bug 的地方，dsh 的处理非常讲究。
