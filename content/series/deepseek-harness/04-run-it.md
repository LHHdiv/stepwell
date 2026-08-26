---
title: 第04讲·动手跑起来：安装、构建与真实任务
summary: 依据官方开发指南，走通 pnpm install、typecheck、build，并用 headless 跑一个真实任务、用 --dump-config 看穿插件树。
objectives:
  - 在本地完成 pnpm install 与 typecheck，确认环境可编译
  - 用 headless profile 跑通一个真实任务（或至少完成 build 与 dump-config）
  - 读懂 dsh --profile web --dump-config 输出的插件配置树
tags: [deepseek-harness, 实操, profile]
keyPoints:
  - 前置：Node 22.19+/24、Corepack 启用的 pnpm@11.7.0、Git 2.26+；真实任务可选 DEEPSEEK_API_KEY
  - 源码路径：pnpm install → pnpm run typecheck 退出 0 → pnpm run build 构建产物
  - headless 一次性运行：pnpm dsh --profile headless "任务"（需要 API Key）
  - dsh --profile web --dump-config 打印真实插件树，任何条目都可被你的 patch 替换
---

前两讲我们看了插件框架和主循环，全是"纸上学车"。这一讲通电：把 dsh 真正跑起来。而且不满足于"能聊天"——要用一条命令**看穿它的插件树**，亲眼验证第 03 讲讲的"一切皆插件"。本讲所有命令均来自 `docs/development.md` 与 `README.md`，照抄即可复现。

## 一、前置与首次安装

依据 `docs/development.md` 的 Prerequisites，你需要：

- **Node.js 22.19+ 或 24+**（CI 覆盖 22.19 / 24 / 26）；
- **Corepack 启用的 pnpm**（仓库在 `package.json` 锁定 `pnpm@11.7.0`）；
- **Git 2.26+**（启用 worktree 本地钩子）；
- 可选：**DeepSeek API Key**，仅在你真要跑模型任务、demo 或真实 API e2e 测试时需要。

首次从仓库根目录安装依赖：

```sh
pnpm install
```

`pnpm install` 还会通过 `scripts/install-lefthook.mjs` 配置 worktree 本地的 Lefthook 钩子和翻译配对合并驱动。若依赖是从缓存恢复的、`postinstall` 被跳过，手动补一句 `node scripts/install-lefthook.mjs` 即可。

安装完成后，**跑一次类型检查作为就绪信号**：

```sh
pnpm run typecheck
```

官方写明：*"Setup is complete when `pnpm run typecheck` exits successfully."* 看到命令成功退出（exit 0），环境就达标了。这一步同时会跑完 Host 的 lib 阶段（含生成的 Typert 契约），是后面一切的基础。

## 二、构建：生成可运行产物

dsh 是 TS 源码，运行前需要构建。依据 development.md，源码 checkout 的 demo 需要先构建：

```sh
pnpm run build
```

`pnpm run build` 做什么？它按顺序跑：Host 侧 `tsc -b` 类型检查并产出 `lib/`，`tsdown` 打包运行时，再 Client 侧同样流程，最后 `build:web`。构建产物是后面所有 demo 与 `dsh` 命令的前置条件——**demo 之前必须先 build**。普通提交和推送不要求 build，除非你选中的检查消费了构建产物。

> **知识拓展：为什么 demo 前必须 build？**
> 因为 `pnpm dsh web` 这类命令消费的是 `tsc` 产出的 `lib/` 与 `tsdown` 打包的运行时，而不是 `.ts` 源文件本身（配置子进程在纯 Node 下跑构建好的 `lib/`）。源码改动要生效，得先 `pnpm run build` 重新产出。这也是"类型即文档"的另一面：编译期就把类型错误挡在运行前。

## 三、三种运行方式与真实例子

构建好后，有三种典型入口：

**1) Web UI（本地浏览器）**——来自 `README.md`：

```sh
# 方式 A：从 npm 包直接跑（无需 clone）
npx @deepseek-ai/dsh web

# 方式 B：从已构建的源码跑
pnpm dsh web
```

`pnpm dsh web` 使用已构建产物、不再重新构建，默认在 `http://127.0.0.1:3080` 启动 Web UI 并打开浏览器；加 `--no-open` 可只起服务不开页（SSH 场景只打印宿主机 URL）。

**2) Headless 一次性运行（脚本化/自动化）**——来自 development.md，需要一个真实任务：

```sh
# 先把 Key 放进环境或仓库根目录 .env
export DEEPSEEK_API_KEY=sk-...
pnpm dsh --profile headless "summarize this workspace"
```

`headless` 是无服务器的一次性运行器：不启动任何 UI，跑完即退出。它走 `ctx.agentLoop` 的完整主循环（第 02 讲那台机器），只是没有驾驶舱。**没有 Key 时这条命令会因缺少模型凭据而报错**——这不是 bug，是真实体验：e2e 测试在无 Key 时会 self-skip，但 headless 交互运行必须提供凭据。

**3) ACP 自动化服务器**——同样来自 development.md：

```sh
pnpm run demo:acp
```

它在 JSON-RPC stdio 上暴露全新的 agent 会话，也需要 `DEEPSEEK_API_KEY`。

## 四、--dump-config：给插件树拍 X 光

现在做本讲最重要的事，把"一切皆插件"从口号变成肉眼可见的事实（依据 `docs/architecture.md`）：

```sh
pnpm run build          # 先构建
dsh --profile web --dump-config
```

终端会打印出一棵**配置树**：当前这次启动实际挂载的所有条目——模型适配器、每一个工具、持久化后端、沙箱策略、设置、凭据管理……每个条目有自己的 id 和 config。官方原话最有分量：

> *"Any row it prints can be replaced by a patch of your own."*

（它打印出的任何条目，都可以由你自己的 patch 替换。）

这条命令同时揭示了 dsh 的装配机制。一份运行中的 dsh 是一棵按序叠加的插件树，叠加顺序（依据 architecture.md）自底向上是：

```text
第 1 层  bundle 按序叠加      # profile 列出的组合包逐个应用其挂载代码与配置
第 2 层  profile 的 patch     # 该 profile 自带的 cordis.patch.yml
第 3 层  home 级的 patch      # 你机器 Harness home 里的全局 patch
第 4 层  --patch overlay      # 命令行临时补丁（调试神器）
```

**bundle（组合包）**是 Cordis 配置项及其挂载代码的分发格式——`dsh-base` 是所有 profile 的第一层（模型适配器、工具、持久化、沙箱与审批策略都在里面），`dsh-web-app` 在其上加浏览器应用，`dsh-headless` 加一次性运行器且不带服务器。**patch**则按 id 定位树上某条目，替换其整个 config 或插入新条目。分层设计的精妙在于**可预测性**：同一条目被多层命中，永远上层覆盖下层，没有玄学。

> **知识拓展：环境密钥与 .env**
> `DEEPSEEK_API_KEY` / 可选 `DEEPSEEK_BASE_URL` 来自环境或仓库根目录的 `.env`（development.md）。`BASE_URL` 默认指向公开 API，可改。AGENTS.md 铁律：**"Never commit credentials"**——`.env` 在 `.gitignore` 里，真实 Key 绝不进版本库。CI 的 e2e 在无 Key 时 self-skip，不靠硬编码凭据跑。

## 五、卷一回顾

四讲走完，你已拥有：harness 世界观与学习方法（第 00 讲）、全仓地图（第 01 讲）、一条消息的真实一生（第 02 讲）、插线板原理（第 03 讲）、以及一台自己跑起来、还能看穿插件树的机器（本讲）。

## 试一试

三步实验，把今天的知识落地（无需 Key 也能完成前两步）：

1. `pnpm install && pnpm run typecheck`，确认退出 0；
2. `pnpm run build` 后执行 `dsh --profile web --dump-config > tree.txt`，打开 `tree.txt` 搜索 `sessions`、`tools`、`llm`，找到它们的挂载点；
3. 有 Key 时再跑 `pnpm dsh --profile headless "列出当前目录里体积最大的 3 个文件，并说明它们的用途"`——观察终端里模型真的去调了 `fs`/shell 工具（第 04 讲的"手脚"第一次活起来）。

## 下一卷预告

跑起来了。下一卷我们钻进核心脊柱的第一个包 `core/session`：仅追加的事件日志、Branded ID 类型体操、SessionEventMap 消息词汇表——也就是智能体"记忆"的真实形状，以及"断电重启后一切如初"靠的是什么。
