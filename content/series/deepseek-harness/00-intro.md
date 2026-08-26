---
title: 第00讲·导读：怎样真正读懂 deepseek-harness
summary: 建立"地图优先、源码与文档双轨、动手验证、类型即文档"四原则，并用真实仓库布局讲清这套精读课怎么上。
objectives:
  - 说清 harness 在 AI 工具版图里的位置，以及 dsh 为什么值得精读
  - 掌握本系列四项学习方法，并理解每条原则背后的工程原因
  - 在本地准备好可编译的运行环境（pnpm install 成功、typecheck 退出 0）
tags: [deepseek-harness, 导读, 学习方法]
keyPoints:
  - dsh 是 DeepSeek 开源的 Agent harness，核心哲学是"一切皆插件"，由 Cordis 驱动
  - 大模型只做 token 进/出；记忆、手脚、眼睛、自律四类缺口，才是 harness 的全部工程量
  - 四项原则：地图优先、源码与文档双轨、动手验证、类型即文档
  - 本机前置：Node 22.19+/24、Corepack 启用的 pnpm、Git 2.26+；跑真实任务可选 DeepSeek API Key
---

你执行 `git clone` 把 deepseek-harness 拉到本地，根目录是 55 个包、几十篇文档，vendor 里还嵌着一整套 Cordis 框架源码。README 只有三行。绝大多数人卡在第一步：**从哪读？** 本讲不急着进代码，先给你一张"怎么读这个项目"的方法地图——后面 45 讲全部按它走。

## 一、先定位：harness 补的是哪道缺口

要理解 dsh 为什么存在，先看清它补的是什么缺口。调用 DeepSeek 的 API，你得到的只有一种能力：

> 输入一串 token，输出一串 token。仅此而已。

没有记忆（每次请求都要把历史重新发一遍）、没有手脚（不能执行任何操作）、没有眼睛（看不到你的文件系统）、没有自律（可能编造事实、可能执行危险操作）。把这四种"没有"补齐，就是一个生产级智能体的全部工程量：

| 缺口 | 补齐它的器官 | dsh 里对应的真实包 |
|---|---|---|
| 没有记忆 | 会话日志与历史管理 | `core/session`、`storage` |
| 没有手脚 | 工具定义、派发与执行 | `core/tools`、`shell`、`fs`、`subprocess` |
| 没有眼睛 | 文件、网页、代码的读取 | `workspace`、`web`、`lsp` |
| 没有自律 | 权限审批、沙箱、防御性检查 | `sandbox`、`guard`、`interaction` |

把上述器官**组装起来并让它们协同运转**的那根主轴——接收输入、组装请求、解析回复、派发工具、循环往复——叫 **Agent Loop**，住在 `core/agent-loop` 包里。

这张表就是本系列的藏宝图：卷二拆第一行（记忆），卷三拆主轴（Agent Loop），卷四拆第二、三行（手脚、眼睛），卷五拆"怎么跟模型说话"，卷六到卷八拆外接设备和整机装配。你现在不必记住这些包名，只需记住这个印象：**每一个"没有"，都对应一组真实源码。**

> **知识拓展：harness 与 dsh 这两个词指什么？**
> "Harness"本义是马具——套在马身上让人能驾驭它的皮带和挽具。大模型就是那匹马力惊人但不识路、不懂交通规则的马；harness 是让人能安全驾驭它的那套装置（缰绳=权限、马鞍=会话、蹄铁=工具）。`dsh` 是 DeepSeek 官方开源的实现，README 第一句写明它由 **Cordis** 驱动、采用 **everything is a plugin（一切皆插件）** 架构。本系列要做的，是把这套马具逐个零件拆开、看懂、再装回去。

## 二、为什么是 dsh：三个真凭实据

市面上的 Agent 框架不少（Claude Code、Codex CLI 等）。选 dsh 当精读对象，有三个基于仓库事实的理由：

**第一，官方文档密度罕见地高，且随代码同步。** 仓库 `docs/` 目录下有几十篇文档：`architecture.md`（架构总览）、`agent-lifecycle.md`（轮次时序图）、`cordis-primer.md`（插件框架入门）、`event-producer-consumer.md`（事件生产/消费映射）、`capability-seams.md`（能力接缝图谱）、`config-catalog.md`（配置目录）……其中不少由 `scripts/gen-doc-graphs.ts` 等脚本从源码生成。AGENTS.md 还写明一条铁律：**"Docs accompany every code change"**——改代码必须同步改文档。这意味着你阅读时永远有官方地图可查，不是在孤军奋战地猜代码。

**第二，它足够完整，且被反复锤炼。** 从会话日志、工具沙箱、流式输出、上下文压缩，到 MCP 协议接入、子智能体调度，一个生产级智能体该有的器官它都有。更硬核的是测试纪律：AGENTS.md 写明 CI 覆盖门禁是 **per-file 100% on packages/*/*/src**（每个源文件 100% 覆盖）。读懂它，等于拿到一张智能体解剖图；以后你看任何 Agent 框架，都是在看这张图的变体。

**第三，它是 TypeScript 写的，类型即设计文档。** 相比 C++/Rust，TS 的类型系统把作者意图直接写在代码里：函数接收什么、返回什么、哪些状态不可变，签名本身就是微型文档。零基础读者遇到生疏语法，本系列会就地开"知识拓展"小灶（例如读到 Branded ID 时讲 TypeScript 类型体操，第 05 讲）。

## 三、四项学习方法：本系列铁律

本系列不是"教你怎么用 dsh"的使用手册，而是**源码精读课**。每章固定遵循四条原则，请把它当成阅读契约：

1. **地图优先。** 先懂依赖分层，再进细节。dsh 的 `packages/` 按依赖方向分层（详见第 01 讲），本系列的讲序 = 依赖顺序 = 数据流动顺序。永远先知道"这块零件在整台机器哪一格"，再拆它。
2. **源码与文档双轨。** 每讲同时打开真实 `.ts` 文件和 `docs/` 里对应的官方文档。文档告诉你"为什么这样设计"，源码告诉你"具体怎么实现"，二者对勘才能真懂——只读其一都会偏。
3. **动手验证。** 每讲的"试一试"必须真跑。源码阅读是肌肉记忆，不是观光；光看不敲，三天就忘。
4. **类型即文档。** 卡住时先读 TypeScript 签名与联合类型，而不是跳过。一个 `Phase = idle | maintenance | running` 的判别联合，比三段文字解释更精确（第 02 讲细讲）。

## 四、前置准备：真实可核对的环境

本系列假设你在本机有一个能编译 dsh 的环境。依据 `docs/development.md` 的 Prerequisites，你需要的工具链是：

- **Node.js 22.19+ 或 24+**（CI 覆盖 22.19 / 24 / 26）；
- **Corepack 启用的 pnpm**（仓库在 `package.json` 锁定 `pnpm@11.7.0`）；
- **Git 2.26+**（用于 worktree 本地钩子）；
- 可选：**DeepSeek API Key**，仅在你真要用模型跑任务、跑 demo 或做真实 API e2e 测试时才需要。

先核对版本，避免后面卡在环境：

```sh
node --version      # 期望 >= 22.19，或 24 / 26
corepack enable     # 若 pnpm --version 无法解析，先启用 Corepack
pnpm --version      # 期望 11.7.0（由仓库锁定）
git --version       # 期望 >= 2.26
```

若 `node --version` 低于 22.19，去 nodejs.org 装 LTS；若 `pnpm` 解析不出，跑一次 `corepack enable` 即可。

## 试一试

完成三件小事，确认环境就绪、并和官方地图打过照面：

1. 克隆仓库：`git clone https://github.com/deepseek-ai/deepseek-harness.git && cd deepseek-harness`；
2. 安装依赖并跑一次类型检查：`pnpm install`，随后 `pnpm run typecheck`——**看到命令成功退出（exit 0）即达标**；
3. 打开 `docs/architecture.md`，读第一节 "Cordis"，把它和本讲第三节的"一切皆插件"对一下号。

这一步只验证"环境能编译"，并不代表你已经读懂。但它告诉你：后面每一讲引用的文件，你本地都能打开、能打断点、能改了重跑。

## 下一讲预告

环境有了，地图也要有。下一讲我们打开真实的 `packages/` 目录，按依赖方向把 55 个包分成"核心脊柱—能力器官—生态协议—平台装配—用户界面"五层，并给你一条**按依赖顺序**的学习路线——先拿到地图，再进森林。
