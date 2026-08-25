---
title: 第50讲·ExtensionAPI：智能体的自我扩展
summary: 精读 extensions 三件套（loader/runner/types）：35 种生命周期事件、动态工具注册、以及"智能体给自己写插件"。
objectives:
  - 掌握扩展的三件套架构（加载/分发/类型）
  - 了解 ExtensionAPI 的核心能力面
  - 理解"自我扩展"的完整闭环
tags: [pi, extensions, 扩展系统]
keyPoints:
  - loader 用 jiti 直接加载 TypeScript 扩展，无需预编译
  - runner 分发约 35 种生命周期事件（before_provider_request/tool_call/session_before_compact…）
  - 扩展可 registerTool/registerCommand/on(event)——能力面覆盖循环的每个环节
---

终卷：扩展系统。pi 的"自我扩展"招牌就立在这里。`core/extensions/` 三件套：

- **loader.ts**：用 jiti 动态加载 TypeScript 扩展（不用预编译），还注入 virtualModules 解决 Bun 单文件二进制下的模块解析；
- **runner.ts**：生命周期事件的分发执行器；
- **types.ts**（1729 行）：`ExtensionAPI` 接口（第 1198 行起）——扩展开发者的全部世界。

## ExtensionAPI 能做什么

四大能力面：

1. **registerTool**：动态注册新工具（和内置工具平起平坐）；
2. **registerCommand**：注册斜杠命令（`/my-command`，第 1260 行）；
3. **on(event)**：订阅约 35 种生命周期事件——`input`（用户输入时）、`before_provider_request`（请求模型前，可改写请求！）、`tool_call`（工具执行前后）、`session_before_compact`（压缩前）……
4. **读写会话与设置**：通过暴露的上下文操作消息、模型、配置。

对照 dsh：dsh 的插件挂在 Cordis 服务上（注册制），pi 的扩展挂在事件流上（回调制）。**注册制适合"提供能力"，回调制适合"干预流程"**——pi 的 35 种事件几乎覆盖了循环的每个决策点，干预能力极强。

## "自我扩展"的闭环

现在把第 00 讲的伏笔收掉。"智能体给自己装插件"的完整链路：

1. 对话中你说："以后帮我写周报时，先读 `~/notes/` 里的日志再总结"；
2. 模型决定把这个经验固化 → 调用写文件工具，生成 `~/.pi/agent/skills/weekly-report/SKILL.md`（第 30 讲的 Skills 格式）；
3. 下次你说"写周报"，`formatSkillsForPrompt` 把这个 Skill 带进提示词，模型按你上次的规矩办事。

如果需要更硬的能力（新工具），扩展还能让模型引导你装一个扩展包。**经验沉淀成 Skills，能力扩展靠 Extensions**——软技能与硬能力两条腿，pi 的智能体就这样越用越懂你。

这对你打造个人/家庭智能体是最直接的启发：**不要只写死功能，要设计"让智能体积累经验"的机制**。

## 试一试

写一个最小的 TypeScript 扩展（20 行内）：`on("input")` 打印用户输入、`registerCommand("hello")` 返回一句问候。放进 `~/.pi/agent/extensions/`，重启 pi 试 `/hello`。跑通它，你就跨过了 pi 二次开发的门槛。

## 下一讲预告
毕业设计：综合全系列，规划你的"pi 版个人智能体"——并与 dsh 版做最终对比选型。
