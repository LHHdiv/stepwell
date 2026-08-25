---
title: 第01讲·全景地图：60 多个包如何组成一台智能体
summary: 俯瞰 dsh 的 monorepo 结构：五大包族群、依赖分层，以及一条按图索骥的学习路线。
objectives:
  - 说出 dsh 仓库的顶层结构与五大包族群的分工
  - 理解"核心脊柱—能力器官—外接设备—整机装配"的依赖分层
  - 建立后续 38 讲的阅读地图与心理定位
tags: [deepseek-harness, 架构, monorepo]
keyPoints:
  - 仓库是 pnpm monorepo：packages/ 下 50 多个包 + vendor 内嵌框架 + docs 文档群
  - 核心脊柱只有七个包：session、system-prompt、tools、agent、agent-loop、scope、llm
  - 其余包都是"插件器官"，通过稳定的 ctx 键挂上插线板，可单独替换
  - 本系列的讲解顺序 = 依赖顺序 = 数据流动顺序
---

上一讲我们把大模型比作一匹马力惊人但不懂交通的马，dsh 是那套马具。这一讲我们打开马具箱——先别急着研究每一根皮带，而是把整个箱子摊开，看清**分格布局**：哪些零件放在一起、谁连接着谁、哪一格最重要。

打开仓库根目录，你会看到这样的结构（节选）：

```text
deepseek-harness/
├── packages/     # 主菜：50 多个 TypeScript 包，全系列的主角
├── vendor/       # 内嵌的第三方框架源码（Cordis 插件框架住这里）
├── docs/         # 几十篇中英双语文档，我们的"官方地图"
├── native/       # 少量原生代码（非 JavaScript 的部分）
├── python/       # Python 侧的配套工具
├── examples/     # 官方示例，毕业设计时的参考答案库
└── website/      # 官网
```

99% 的学习时间会花在 `packages/` 和 `docs/` 这两个目录里。下面把 `packages/` 里的 50 多个包分成五个族群来讲。

> 💡 **知识拓展：什么是 monorepo？**
> monorepo（单体仓库）指把多个可独立发布的包放进同一个代码仓库管理。dsh 用 pnpm workspace 协调：每个包有自己的 `package.json`，可以互相依赖、统一构建、统一发版。好处是"改一处、全局同步"；代价是需要纪律——所以你会看到仓库里有大量自动化脚本（`scripts/gen-*.ts`）从代码生成文档和目录，保证 50 多个包不失控。这种"文档即代码"的做法本身就值得学习。

## 族群一：核心脊柱——七个包撑起整台机器

这是全仓库最重要的七个包，也是官方架构文档里点名的"核心包"。它们各自向插件容器贡献一个稳定的服务键：

| 包 | 职责一句话 | 挂载点 |
|---|---|---|
| `core/session` | 仅追加的 SessionEvent 日志与内存存储 | `ctx.sessions` |
| `core/system-prompt` | 组装系统提示词片段与工具 schema 清单 | `ctx.systemPrompt` |
| `core/tools` | 工具注册表 + 带把关的执行流水线 | `ctx.tools` |
| `core/agent` | Agent 接口、活跃注册表、`agent/*` 事件 | `ctx.agents` |
| `core/agent-loop` | Agent 接口的默认驱动器（主循环） | `ctx.agentLoop` |
| `core/scope` | 按 agent 划分作用域的注册原语 | （库，无键） |
| `llm/llm` | 消息与流式词汇表 + 模型适配器接缝 | `ctx.llm` |

看不懂具体职责？完全正常，这正是后续每一讲的内容。现在只需要记住两件事：第一，**这七个包是脊柱**——卷二拆 session/scope，卷三拆 agent/agent-loop/system-prompt，卷四拆 tools，卷五拆 llm；第二，注意右列的 `ctx.xxx` 写法——这就是第 03 讲要讲的"插线板插槽"，其他所有包都是通过这些插槽和脊柱打交道的，而不是直接 import 彼此的内部代码。

## 族群二：能力器官——让智能体"能干活"的包

脊柱之外，是一大批各司其职的能力包。按功能再分组：

- **执行世界**：`shell`（命令执行）、`subprocess`（进程孵化）、`terminal`（持久终端）、`code-runtime`（代码运行时）、`fs`（文件系统策略）、`workspace`（工作区）、以及 `sandbox` 家族（`sandbox` 接口 + `sandbox-local` 本地沙箱 + `sandbox-policy` 策略）。→ 卷四
- **上下文管理**：`compaction`（历史压缩）、`spill`（内容外溢存储）、`context`（上下文注入）。→ 卷三
- **任务与协作**：`plan` / `todo` / `goal`（任务管理三件套）、`jobs` / `schedule` / `workflow`(后台工作)、`subagent` 家族（子智能体调度）。→ 卷六、卷七
- **扩展机制**：`hooks`（拦截钩子）、`skill`（技能系统）、`extensions`。→ 卷七

这些包的共同特点是：**都挂在脊柱提供的插槽上，彼此尽量不认识**。比如 `shell` 不关心消息怎么组装，`compaction` 不关心工具怎么执行。这种解耦让你可以只读某一个包就能理解它——这也是本系列敢于"逐包精读"的前提。

## 族群三：生态协议——连接外部世界的接口

智能体不是孤岛。这一族群负责和外部标准对话：

- `mcp/mcp-client`：接入 MCP（Model Context Protocol，模型上下文协议——一个让任何工具提供方都能被任何智能体使用的开放标准）；→ 第 50 讲
- `lsp`：接入 LSP（Language Server Protocol，语言服务器协议——VSCode 用的代码智能协议，让智能体获得跳转定义、查引用等超能力）；→ 第 51 讲
- `acp`：ACP（Agent Client Protocol，智能体客户端协议）；→ 第 52 讲
- `web` 家族：`web-search-deepseek` / `web-search-exa` / `web-search-perplexity`（三家搜索引擎适配）、`web-fetch-http`（网页抓取）；→ 第 53 讲
- `subagent` 家族最有趣：除了自家的进程内实现，还有 `subagent-claude-code`、`subagent-codex` 这样的适配器——**把别家产品的智能体当成自己的子智能体来调用**。→ 第 54 讲

## 族群四：平台装配——从零件到产品

零件造好了，总得有人把它们装成整机：`boot`（启动流程）、`bundle` 家族（`base` / `web-app` / `headless` 三种出厂组合包）、`preset`（预设）、`settings`（设置体系）、`credentials` 与 `identity`（密钥与身份）。→ 卷八

## 族群五：用户界面——你实际看到的东西

`client`（终端界面）、`api`（API 网关）、`web` 前端应用（浏览器里的聊天 UI）、`sdk`（给第三方开发者的编程接口）。同一个发动机，配了三种驾驶舱。→ 卷八

## 一张分层图收束全景

把这五个族群按依赖方向排成塔，就得到 dsh 的分层架构——**上层依赖下层，下层不知道上层存在**：

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

这张图也解释了本系列的讲序为什么这样安排：**自底向上，沿依赖链爬塔**。先懂插线板（Cordis），再懂脊柱（数据模型与主循环），然后器官、协议、装配——每一步都踩在已理解的地基上。

## 试一试

进入 deepseek-harness 仓库（clone 或在 GitHub 网页上均可），完成两个小侦察：

1. 数一数 `packages/` 下有多少个目录（网页端看 GitHub 左侧文件树即可），和本讲的"50 多个"对一下账；
2. 打开 `docs/architecture.zh.md`，找到"核心包"那张表——对照本讲的族群一，看看官方的原话是怎么描述这七个包的。

## 下一讲预告

地图有了，接下来看"一次心跳"：你在输入框敲下回车之后，到回复流出来之前，这条消息经历了哪些站？下一讲我们沿着官方的轮次流程图，走完一条消息的一生。
