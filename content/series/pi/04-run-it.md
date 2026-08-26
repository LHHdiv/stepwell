---
title: 第04讲·动手跑起来：安装与启动 coding-agent
summary: 按真实构建链安装依赖、编译、设置 API Key，启动交互式 pi，并观察它如何按 AppMode 选择运行形态。
objectives:
  - 用 npm install --ignore-scripts + npm run build 成功编译 pi
  - 设置模型 API Key 并启动交互式 pi（./pi-test.sh 或 node dist/cli.js）
  - 解释 pi 如何按 AppMode 在 interactive / print / rpc 间切换
tags: [pi, 环境, 动手]
keyPoints:
  - 前置：Node ≥ 22.19（engines.node）、npm workspaces、可选 bun；装依赖用 npm install --ignore-scripts
  - 构建顺序写死在根 package.json 的 build 脚本：tui→telemetry→ai→agent→session-backends→protocol→client→server→coding-agent
  - 跑源码：./pi-test.sh（任意目录）；或 node packages/coding-agent/dist/cli.js "提示词" 进 print 模式（print-mode.ts:33）
  - AppMode（project-trust.ts:12）由 --mode/stdin/是否 TTY 决定：interactive | print | json | rpc
  - 模型 Key 走环境变量（env-api-keys.ts:31 ANTHROPIC_API_KEY_ENV），仅跑真实任务时需要
---

前四讲都是"读"：方法论、地图、生命线、哲学。这一讲第一次"跑"——把 pi 在你本机编译起来、启动、看它活过来。所有命令都对照根 `package.json` 与 `coding-agent` 的源码，保证你敲下去就能复现。

## 一、前置：真实可核对的环境

依据根 `package.json` 的 `engines` 与 `scripts`：

- **Node.js ≥ 22.19**（根 `package.json:64` 锁定 `engines.node: ">=22.19.0"`）；
- **npm**（pi 用 **npm workspaces**，不是 pnpm 也不是 yarn；`package.json:5` 的 `workspaces` 数组）；
- 可选 **bun**（仓库用 `bun build --compile` 打独立二进制，但本地跑源码不需要）；
- 可选 **模型 API Key**，仅在你真要让 pi 调模型时才需要。

先核对：

```sh
node --version      # 期望 >= 22.19
npm --version       # 任意较新 9+/10+
```

> **安全提醒（第 00 讲已强调）**：pi 没有内置权限系统，默认以你的用户权限运行。第一次跑请用无害提示词（如"解释当前目录结构"），或在受信任目录/容器里测试，别一上来就让它"删掉某某文件"。

## 二、安装与构建：顺序写死的依赖链

pi 是典型 monorepo，装依赖和构建都走 npm：

```sh
git clone https://github.com/earendil-works/pi.git && cd pi
npm install --ignore-scripts      # 装全部 workspace 依赖，不跑生命周期脚本（供应链 hardening）
npm run build                     # 按写死的顺序构建全部包
```

为什么 `install` 要加 `--ignore-scripts`？README 的 Development 段和 Supply-chain hardening 段都写明：pi 把依赖变更当"受审查的代码变更"对待，默认不自动跑第三方 `postinstall`，避免供应链投毒。这是它安全文化的一环，顺手学一手。

`npm run build` 不是简单的 `tsc`，而是**手工串起的有向构建**——根 `package.json:16` 的 `build` 脚本把顺序钉死：

```
tui → telemetry → ai → agent → session-backends/sqlite-node → protocol → client → server → coding-agent
```

这条顺序恰好就是第 01 讲的**依赖箭头**：先构建被依赖的基础库（tui 无依赖先跑、telemetry、ai），再构建依赖它们的 agent，最后才是 client/server/coding-agent。**看到 `npm run build` 成功退出（exit 0），就证明整条依赖链自洽**——这是本讲最重要的"跑通"信号。

## 三、启动：两种跑法

构建完，`coding-agent` 的入口是 `packages/coding-agent/src/cli.ts:21`：`main(process.argv.slice(2))`，最终落到 `main.ts:569` 的 `async function main()`。你有两种跑法：

**跑法 A：从源码脚本（推荐，任意目录都能跑）**

```sh
./pi-test.sh
```

根目录的 `pi-test.sh` 就是"从源码启动 pi"的便捷封装，可在任意目录调用。它会进入交互式 TUI——你看到的就是第 02 讲说的差分渲染终端界面。

**跑法 B：直接跑编译产物**

```sh
node packages/coding-agent/dist/cli.js "解释一下当前目录的结构"
```

不带交互、直接给提示词时，pi 进入 **print 模式**（`packages/coding-agent/src/modes/print-mode.ts:33` 的 `runPrintMode`）——跑完一轮把结果打印到 stdout 后退出，适合脚本/管道。

## 四、AppMode：pi 怎么决定"以什么形态运行"

你没显式说要哪种模式，pi 怎么知道？看 `main.ts:118` 的 `resolveAppMode()`：它根据 `--mode` 参数、是否有 stdin 输入、以及 stdout 是否 TTY，选出一个 `AppMode`（`packages/coding-agent/src/core/project-trust.ts:12`）：

```ts
type AppMode = "interactive" | "print" | "json" | "rpc"
```

- **interactive**：stdout 是终端（TTY）且无 `--mode` 强配 → 交互式 TUI（`InteractiveMode.run()`，`interactive-mode.ts:1012`）；
- **print**：直接给了提示词、非 TTY → 打印模式；
- **json**：以 JSON 事件流输出，便于程序消费；
- **rpc**：通过 stdin 的 JSON-RPC 驱动（供 IDE 插件等外部程序嵌入，对应 `rpc-entry.js`）。

同一个 `AgentSession`、同一套 `Agent` 核心，**只是输入/输出通道不同**——这正是第 01 讲"分层清洁"的回报：`coding-agent` 把"交互、打印、RPC"三种产品形态，建在同一个会话核心之上，互不影响。

## 五、让 pi 真的会"思考"：设置模型 Key

上面跑起来后，若没设 Key，pi 能启动但调模型会失败。Key 走环境变量，由 `packages/ai/src/env-api-keys.ts:31` 定义：

```ts
const ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY"
```

所以：

```sh
export ANTHROPIC_API_KEY="sk-ant-..."   # Anthropic
# 或 export OPENAI_API_KEY / GEMINI_API_KEY 等，取决于你想用哪家
./pi-test.sh
```

记一个点：`pi-ai` 的 Key 解析是**环境-based、运行在调用方进程**里（经 `withEnvApiKey`，`ai/src/compat.ts:222`）。这意味着——**当你用 client/server 分离时，Key 只在 server 进程里**，本地 client 永远看不见它（第 25 讲会坐实这一点）。单进程直接跑 `coding-agent` 时，Key 就在你这个 shell 里。

## 试一试

完成一次真实跑通，并把"形态选择"变成你亲手验证过的事实：

1. `npm install --ignore-scripts` 然后 `npm run build`，确认 exit 0（若某包报错，对照根 `build` 脚本顺序，多半是上游包没先构建）；
2. 不设 Key，先跑 `node packages/coding-agent/dist/cli.js "用一句话介绍你自己"`——预期能看到 pi 启动、尝试调模型、因无 Key 报错的完整日志；
3. 设 `ANTHROPIC_API_KEY` 后跑 `./pi-test.sh`，进交互 TUI，输入一句无害提示词（如"当前目录有哪些文件？"），观察屏幕是否按第 02 讲说的"流式 + 差分"实时更新；
4. 再试 `node packages/coding-agent/dist/cli.js "..."` 对比 print 模式与交互模式的输出差异——印证 `AppMode` 的存在。

## 下一讲预告

跑通了。从下一讲开始，我们沉到最底层的基础库——`pi-ai`。先拆它的 **Message 与 Model 类型体系**（`ai/src/types.ts`），看清一次对话在类型层面究竟由哪些零件组成；再顺藤摸瓜到流式、Provider、直到手写 CBOR 线格式。基础库读透，上层才不虚。
