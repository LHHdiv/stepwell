---
title: 第00讲·导读：什么是"可自我扩展"的智能体
summary: Pi 是什么、它和 DeepSeek Harness 的路线差异、这个系列怎么学——三个问题一次讲清。
objectives:
  - 说出 pi 的三个包主线（ai → agent → coding-agent）
  - 理解"自我扩展"与普通插件系统的区别
  - 完成本系列的学习准备
tags: [pi, 导读, 学习方法]
keyPoints:
  - pi 是 npm workspaces 管理的 TypeScript monorepo（并非 pnpm）
  - 主线三包：pi-ai（模型抽象）→ pi-agent-core（循环）→ pi-coding-agent（产品）
  - 自我扩展 = 扩展与 Skills 是智能体的常规能力，不是外挂
---

你可能在两个地方见过 Pi：npm 上的 `@earendil-works/pi-coding-agent`，或者 pi.dev。它是 Pi Agent Harness 的老家——一个"**self extensible coding agent**"，可自我扩展的编码智能体。

## 先拆这个词

**Coding agent**：帮你写代码的智能体，同类有 Claude Code、Codex CLI、以及你正在学的 deepseek-harness（dsh）。

**Self extensible（自我扩展）**：这是 pi 最特别的地方。一般的智能体装插件，要人去改配置文件；pi 的扩展系统（`ExtensionAPI`）和 Skills 标准（`SKILL.md`）让**智能体自己在对话中就能学会新技能**——你说"以后遇到 X 就这么做"，它把这条经验写成 Skill 文件存进 `~/.pi/agent/skills/`，下次自动生效。智能体在成长。

## 三包主线

pi 是 npm workspaces 的 monorepo（注意：**不是** pnpm，包列表写在根 package.json 的 `workspaces` 字段）。10 个包里，主线只有三个，依赖关系干净得像教学示例：

```
pi-ai（packages/ai）
  ↓ 只依赖它的类型
pi-agent-core（packages/agent）
  ↓
pi-coding-agent（packages/coding-agent）
```

- **pi-ai**：统一 35+ 模型供应商的抽象层（OpenAI/Anthropic/Google/DeepSeek…）；
- **pi-agent-core**：与供应商无关的运行时——核心循环、工具调用、状态管理；
- **pi-coding-agent**：产品本体——TUI 界面、会话管理、内置工具、扩展/Skills。

这个分层和 dsh 的 session/agent-loop/llm 主干几乎一一对应。**智能体的"解剖学"是通用的**——这正是两个系列对照读的价值。

## 与 dsh 的路线差异（先给结论，后面展开）

| 维度 | pi | dsh |
|---|---|---|
| 架构哲学 | 紧凑的库式分层，显式 import，无 DI 容器 | Cordis 微内核 + 数百个小插件，"一切皆插件" |
| 包粒度 | 10 个大包（数千行/包） | 60+ 插件域的小包 |
| UI | 终端 TUI 是一等公民（自研差分渲染） | Web UI 是一等公民 |
| 扩展方式 | 回调式 ExtensionAPI + Skills 标准 | 插件注册 + 配置树 patch |

读代码时你会反复看到这个对比：**pi 像精心组织的图书馆，dsh 像乐高仓库**。两种组织方式各有代价，没有标准答案——这正是值得你亲自体会的"架构品味"。

## 怎么跑起来

```bash
cd Project/pi
npm install --ignore-scripts
npm run build
./pi-test.sh        # 直接从源码跑 pi（任意目录可用）
```

配好任一供应商的 API key（如 `DEEPSEEK_API_KEY`）就能开始对话。调试 TUI 时官方建议用 tmux（AGENTS.md 有标准流程）。

## 试一试

跑通 `./pi-test.sh`，在 TUI 里输入 `/help` 看看内置的 22 个斜杠命令。找到 `/tree` 和 `/compact`——它们分别是卷五（会话树）和压缩机制的用户入口，先混个脸熟。

## 下一讲预告

下一讲画 pi 的全景地图：一次输入从 TUI 到模型 API 的完整旅程，以及 10 个包各自的站位。
