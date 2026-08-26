---
title: 第01讲·全景地图：55 个包如何组成一台智能体
summary: 基于真实 packages/ 树与官方架构文档，给出可核对的分层地图与自底向上的学习路线。
objectives:
  - 说出 dsh 仓库的顶层结构与五大包族群的分工
  - 对照官方文档指出核心脊柱的七个包及其 ctx 键
  - 建立"按依赖顺序自底向上"的讲次地图与心理定位
tags: [deepseek-harness, 架构, monorepo]
keyPoints:
  - 仓库是 pnpm monorepo：packages/ 下 55 个包，外加 vendored Cordis、docs 文档群、examples
  - 核心脊柱七包：session、system-prompt、tools、agent、agent-loop、scope、llm，各占稳定 ctx 键
  - 其余包都是"插件器官"，通过 ctx 键与脊柱打交道，彼此尽量不互相 import
  - 本系列讲序 = 依赖序 = 数据流动序：自底向上爬塔
---

上一讲我们把大模型比作那匹只认得 token 的马，dsh 是那套马具。这一讲我们打开马具箱——先别研究每根皮带，而是把箱子摊开，看清分格布局：哪些零件放一起、谁连着谁、哪一格最重要。

打开仓库根目录，你会看到这样的真实结构（依据 AGENTS.md 的 Repository layout）：

```text
vendor/      内嵌的 Cordis 框架源码（@deepseek-ai/cordis），清单与同步流程见 vendor/README.md
packages/    @deepseek-ai/dsh-<pkg> 工作区，位于 packages/<group>/<pkg>/（全系列主角）
docs/        architecture / 生成的目录 / postmortem / cookbook（官方地图）
scripts/     仓库门禁与生成器（gen-doc-graphs.ts 等从源码生成文档）
examples/    可运行的 cordis.yml 叶子，叠在 packages/examples 的 bundle 之上
.agents/     Agent 工作流与 Agent Notes（notes/ 里是架构决策记录）
website/     docs/ 中选定双语文档的 VitePress 投影
python/      Python SDK 与捆绑运行时
native/      @deepseek-ai/node-addon-landlock-run 的权威源码
```

99% 的学习时间会花在 `packages/` 和 `docs/` 两个目录里。下面把 `packages/` 的 55 个包，按 AGENTS.md 的真实分组成五个族群来讲。

> **知识拓展：什么是 monorepo？**
> monorepo（单体仓库）指把多个可独立发布的包放进同一仓库管理。dsh 用 pnpm workspace 协调：每个包有独立 `package.json`，可互相依赖、统一构建、统一发版。好处是"改一处、全局同步"——这也是为什么 `core/session` 一改，依赖它的几十个包立刻看到。代价是需要纪律，所以仓库里有大量脚本从代码生成文档和目录，保证 55 个包不失控。这种"文档即代码"的做法本身就值得学。

## 族群一：核心脊柱——七个包撑起整台机器

这是全仓库最重要的七个包，也是 `docs/architecture.md` 的 "Core packages" 表格点名的"核心包"。它们各自向插件容器贡献一个稳定的服务键（依据官方表格，逐一核对）：

| 包 | 职责一句话（官方原话） | 挂载点 |
|---|---|---|
| `core/session` | 仅追加的 `SessionEvent` 日志与内存存储 | `ctx.sessions` |
| `core/system-prompt` | 提示词片段与工具 schema 的组装 | `ctx.systemPrompt` |
| `core/tools` | 作用域化的工具注册表与带把关的执行流水线 | `ctx.tools` |
| `core/agent` | `Agent` 接口、活跃注册表、`agent/*` 事件 | `ctx.agents` |
| `core/agent-loop` | 该接口的默认驱动器（主循环） | `ctx.agentLoop` |
| `core/scope` | 按 agent 划分作用域的注册原语 | 库，无键 |
| `llm/llm` | 消息与流式词汇表 + 模型适配器接缝 | `ctx.llm` |

看不懂具体职责？完全正常，这正是后续每一讲的内容。现在只需记住两件事：第一，**这七个包是脊柱**——卷二拆 `session`/`scope`，卷三拆 `agent`/`agent-loop`/`system-prompt`，卷四拆 `tools`，卷五拆 `llm`；第二，注意右列的 `ctx.xxx` 写法——这就是第 03 讲要讲的"插线板插槽"。其他所有包都通过这些插槽和脊柱打交道，**而不是直接 import 彼此的内部代码**。

## 族群二：能力器官——让智能体"能干活"的包

脊柱之外是一大批各司其职的能力包（依据 AGENTS.md 的真实分组）：

- **执行世界**：`shell`（bash 能力）、`subprocess`（进程孵化）、`terminal`（持久终端）、`fs`（文件系统策略）、`code-runtime`（代码运行时）、`workspace`（工作区），以及 `sandbox` 家族（`sandbox` 接口 + `sandbox-local` 本地沙箱 + `sandbox-policy` 策略）→ 卷四；
- **上下文管理**：`compaction`（历史压缩）、`spill`（内容外溢存储）、`context`（上下文注入）→ 卷三；
- **任务与协作**：`plan` / `todo` / `goal`（任务三件套）、`jobs` / `schedule` / `workflow`（后台工作）、`subagent` 家族（子智能体调度）→ 卷六、卷七；
- **扩展机制**：`hooks`（拦截钩子）、`skill`（技能系统）、`extensions`/`self-modification`（自检/挂载自己的插件）→ 卷七。

这些包的共同点是：**都挂在脊柱提供的插槽上，彼此尽量不互相认识**。比如 `shell` 不关心消息怎么组装，`compaction` 不关心工具怎么执行。这种解耦让你可以只读某一个包就理解它——也是本系列敢"逐包精读"的前提。

## 族群三：生态协议——连接外部世界的接口

智能体不是孤岛，这一族群负责和外部标准对话（依据 AGENTS.md）：

- `mcp/mcp-client`：接入 MCP（Model Context Protocol，模型上下文协议——让任何工具提供方都能被任何智能体使用的开放标准）→ 第 27 讲；
- `lsp`：接入 LSP（Language Server Protocol，语言服务器协议——VSCode 用的代码智能协议，让智能体获得跳转定义、查引用等能力）→ 第 28 讲；
- `acp`：ACP（Agent Client Protocol，智能体客户端协议，自动化专用）→ 第 29 讲；
- `web` 家族：`web-search-*` 三家搜索适配 + `web-fetch-http`（网页抓取）→ 第 30 讲；
- `subagent` 家族最有趣：除自家进程内实现，还有 `subagent-claude-code`、`subagent-codex` 这类适配器——**把别家产品的智能体当成自己的子智能体调用**→ 第 31 讲。

## 族群四、五：平台装配与用户界面

零件造好，总得装成整机：`boot`（启动流程）、`bundle` 家族（`base` / `web-app` / `headless` 三种出厂组合）、`preset`（预设）、`settings`、`credentials` 与 `identity`（密钥与身份）→ 卷八。用户界面则是 `client`（终端）、`api`（API 网关）、`web`（浏览器聊天 UI）、`sdk`（第三方编程接口）——同一台发动机配了三种驾驶舱 → 卷八。

## 一张分层图收束全景

把这五个族群按依赖方向排成塔，就得到 dsh 的分层架构——**上层依赖下层，下层不知道上层存在**（依据 architecture.md 的 Profiles and bundles 与 Events 两节）：

```text
        ┌─────────────────────────────┐
 第五层  │  用户界面: client / web / api / sdk │   ← 你看得见的部分
        ├─────────────────────────────┤
 第四层  │  装配: boot / bundle / preset / settings │ ← 出厂组合
        ├─────────────────────────────┤
 第三层  │  能力器官: shell/fs/sandbox/mcp/lsp/subagent/hooks/skill…│
        ├─────────────────────────────┤
 第二层  │  核心脊柱: session · tools · agent · agent-loop · llm …│
        ├─────────────────────────────┤
 第一层  │  Cordis 插件框架（vendor/ 内嵌）      │   ← 插线板本身
        └─────────────────────────────┘
```

这张图也解释了本系列讲序为何这样排：**自底向上，沿依赖链爬塔**。先懂插线板（Cordis，第 03 讲），再懂脊柱（数据模型与主循环，第 02、05–17 讲），然后器官、协议、装配——每一步都踩在已理解的地基上。

> **知识拓展：为什么分层能防止"代码腐烂"？**
> 关键在两条纪律（AGENTS.md）：其一，**没有特权内核**——所有行为都通过 `ctx` 上的插件扩展点挂载，换能力 = 挂/卸插件，而非改核心；其二，**注册是可逆副作用**——插件卸载时它贡献的注册自动撤销。二者合起来，DeepSeek 自己迭代时也是"加插件、换插件"，核心不会被补丁腐蚀。这也是 dsh 特别适合"学习"和"改造"的根本原因。

## 试一试

进入 deepseek-harness 仓库（clone 或在 GitHub 网页均可），完成两个真实侦察：

1. 在终端执行 `ls packages/*/ -d | wc -l`（或网页端数 GitHub 左侧 `packages/` 下的目录），和本讲的"55 个包"对一下账；
2. 打开 `docs/architecture.md`，找到 "Core packages" 那张表，逐行对照本讲族群一的七行——看官方原话怎么描述这七个包，以及它们各自占的 `ctx` 键。

## 下一讲预告

地图有了，接下来看"一次心跳"：你在输入框敲下回车，到回复流出来之前，这条消息经历了哪些站？下一讲我们直接打开真实源码 `packages/core/agent-loop/src/agent.ts`，照着 `Phase` 状态机与 `turn()` 主循环，走完一条消息的一生——这一讲会第一次出现大段真实代码。
