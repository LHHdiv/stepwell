---
title: 第00讲·导读：怎样真正读懂 Pi
summary: 建立"地图优先、源码与文档双轨、动手验证、类型即文档"四原则，并用 pi 独有的"缺口表"讲清这套精读课怎么上。
objectives:
  - 说清 harness 在 AI 工具版图里的位置，以及 pi 为什么值得精读
  - 掌握本系列四项学习方法，并理解每条原则背后的工程原因
  - 在本地准备好可编译的运行环境（npm install 成功、build 退出 0）
tags: [pi, 导读, 学习方法]
keyPoints:
  - pi 是 earendil-works 开源的「自扩展编码智能体」，最大特色是 ExtensionAPI 把插件粒度做到极致
  - 大模型只做 token 进/出；记忆、手脚、眼睛、自律、可扩展五道缺口，对应仓库里的真实包
  - pi 没有内置权限系统，信任边界靠 client/server 进程分离来兜——这是它和 dsh 的关键差异
  - 四项原则：地图优先、源码与文档双轨、动手验证、类型即文档
---

你执行 `git clone` 把 pi 拉到本地，根目录是 11 个包、一份 AGENTS.md 开发铁律、还有 `grok-pi-study` / `hy-study` 两个前人写的学习站点。README 只有十几行，却藏着一句要害：**"Pi does not include a built-in permission system"**。绝大多数人卡在第一步：**从哪读？** 本讲不急着进代码，先给你一张"怎么读这个项目"的方法地图——后面 45 讲全部按它走。

## 一、先定位：harness 补的是哪道缺口

要理解 pi 为什么存在，先看清它补的是什么缺口。调用任何一家大模型 API，你得到的只有一种能力：

> 输入一串 token，输出一串 token。仅此而已。

没有记忆（每次请求都要把历史重新发一遍）、没有手脚（不能执行任何操作）、没有眼睛（看不到你的文件系统）、没有自律（可能编造事实、可能执行危险操作）、**没有可扩展性**（你没法在不改核心代码的前提下给它加新能力）。把这五种"没有"补齐，就是一个生产级智能体的全部工程量：

| 缺口 | 补齐它的器官 | pi 里对应的真实包 |
|---|---|---|
| 没有记忆 | 会话状态与历史管理 | `agent`（SessionState）/ `session-backends`（SQLite 仓库） |
| 没有手脚 | 工具定义、派发与执行 | `agent`（tools）/ `coding-agent`（内置工具） |
| 没有眼睛 | 文件、网页、代码的读取 | `coding-agent`（内置工具） |
| 没有自律 | 信任边界与隔离 | 无内置权限；靠 `client`/`server` 进程分离 + 容器化兜底 |
| 没有可扩展 | 插件系统 | `coding-agent`（ExtensionAPI） |

把上述器官**组装起来并让它们协同运转**的那根主轴——接收输入、组装请求、解析回复、派发工具、循环往复——叫 **Agent Loop**，住在 `packages/agent/src/agent-loop.ts` 里。

这张表就是本系列的藏宝图：卷三拆主轴（Agent Loop），卷四拆第二、三、五行（手脚、眼睛、可扩展），卷二拆"怎么跟模型说话"，卷五到卷八拆信任边界、终端 UI 和整机装配。你不必记住这些包名，只需记住这个印象：**每一个"没有"，都对应一组真实源码。**

> **知识拓展：pi 与 dsh 的同一道题、两种解**
> 本站的姊妹篇《DeepSeek Harness 源码精读》拆解的是 dsh——它用 Cordis 框架实现 "everything is a plugin"。pi 走得更远：它的 `ExtensionAPI`（`packages/coding-agent/src/core/extensions/types.ts:1198`）允许扩展注入**事件订阅、LLM 工具、斜杠命令、键盘快捷键、CLI flag、provider、markdown 转换器、UI 组件**整整八类能力。换句话说，dsh 的"插件"主要在运行时零件层面，pi 的"插件"连产品形态本身都能改。读完两套，你对"插件化"的理解会从"可替换零件"升级到"可重组产品"。

## 二、为什么是 pi：三个真凭实据

市面上的 Agent 框架不少（Claude Code、Codex CLI、dsh 等）。选 pi 当精读对象，有三个基于仓库事实的理由：

**第一，它的"自扩展"设计是活教材。** pi 不靠改核心源码来加功能，而是把能力接缝（`ExtensionAPI`）提前设计好，扩展用工厂函数 `(pi: ExtensionAPI) => void` 注册（`types.ts:1519`）。读懂它，你学到的是"如何设计一个能被用户无限生长的软件"，而不只是"一个智能体怎么写"。

**第二，它是一套分层干净的依赖教科书。** pi 的依赖方向极其讲究：`pi-ai`（LLM 抽象）只依赖 `pi-telemetry`（类型层）；`pi-agent-core`（运行时）依赖 `pi-ai` + `pi-telemetry`，**不依赖** `client`/`server`/`protocol`；`pi-coding-agent`（产品）才把 UI、传输、扩展全部粘起来。这种"地基不认识天花板"的分层，正是大型 TS 项目该有的样子——本系列会反复拿它当正面案例。

**第三，它是 TypeScript 写的，类型即设计文档。** 相比 C++/Rust，TS 的类型系统把作者意图直接写在代码里：函数接收什么、返回什么、哪些状态不可变，签名本身就是微型文档。零基础读者遇到生疏语法，本系列会就地开"知识拓展"小灶（例如读到 CBOR 编码时的二进制小课，第 09 讲）。

## 三、四项学习方法：本系列铁律

本系列不是"教你怎么用 pi"的使用手册，而是**源码精读课**。每章固定遵循四条原则，请把它当成阅读契约：

1. **地图优先。** 先懂依赖分层，再进细节。pi 的 `packages/` 按依赖方向分层（详见第 01 讲），本系列的讲序 = 依赖顺序 = 数据流动顺序。永远先知道"这块零件在整台机器哪一格"，再拆它。
2. **源码与文档双轨。** 每讲同时打开真实 `.ts` 文件和 `AGENTS.md` / `README.md` 里的官方约定。文档告诉你"为什么这样设计"，源码告诉你"具体怎么实现"，二者对勘才能真懂——只读其一都会偏。
3. **动手验证。** 每讲的"试一试"必须真跑。源码阅读是肌肉记忆，不是观光；光看不敲，三天就忘。
4. **类型即文档。** 卡住时先读 TypeScript 签名与联合类型，而不是跳过。一个 `Phase` 判别联合，比三段文字解释更精确（第 12 讲细讲）。

## 四、前置准备：真实可核对的环境

本系列假设你在本机有一个能编译 pi 的环境。依据根 `package.json` 与 `AGENTS.md`：

- **Node.js ≥ 22.19**（根 `package.json` 的 `engines.node` 锁定 `>=22.19.0`）；
- **npm**（pi 用 npm workspaces，不是 pnpm；`npm install --ignore-scripts` 装依赖）；
- 可选：**bun**（仓库用 `bun build --compile` 打独立二进制，本地跑源码不强制）；
- 可选：**模型 API Key**，仅在你真要用模型跑任务、跑 demo 时才需要（如 `ANTHROPIC_API_KEY`，见 `packages/ai/src/env-api-keys.ts:31`）。

先核对版本，避免后面卡在环境：

```sh
node --version      # 期望 >= 22.19
bun --version       # 可选，期望任意较新版本
git --version       # 任意较新版本
```

> **注意：pi 没有内置权限系统。** README 第 40 行明确写道：默认以启动它的用户/进程的权限运行。这意味着你在本机跑 pi 时，它对你的文件系统拥有和你一样的权限。**动手跑之前，请务必在受信任的目录里、用不会造成损失的提示词测试**，或按 README 的 containerization.md 做容器隔离。这一点和 dsh 有内置 sandbox 不同，是 pi 的设计取舍，第 25 讲会展开。

## 试一试

完成三件小事，确认环境就绪、并和官方地图打过照面：

1. 克隆仓库：`git clone https://github.com/earendil-works/pi.git && cd pi`；
2. 安装依赖并跑一次构建：`npm install --ignore-scripts`，随后 `npm run build`——**看到命令成功退出（exit 0）即达标**（构建顺序在根 `package.json` 的 `build` 脚本里写死：tui → telemetry → ai → agent → session-backends → protocol → client → server → coding-agent）；
3. 打开 `AGENTS.md`，读"never `git add -A`"和"never hand-edit `models.generated.ts`"两条铁律，把它们和本讲第三节的"分层干净"对一下号。

这一步只验证"环境能编译"，并不代表你已经读懂。但它告诉你：后面每一讲引用的文件，你本地都能打开、能打断点、能改了重跑。

## 下一讲预告

环境有了，地图也要有。下一讲我们打开真实的 `packages/` 目录，按依赖方向把 11 个包分成"基础库—运行时核心—传输层—终端 UI—产品装配—持久化—质量门禁"七层，并给你一条**按依赖顺序**的学习路线——先拿到地图，再进森林。
