---
title: 第01讲·全景地图：一次输入的完整旅程
summary: 从你在 TUI 敲下回车开始，追踪请求穿过 AgentSession、核心循环、pi-ai、供应商 API 的每一站。
objectives:
  - 画出 pi 的包依赖图与数据流图
  - 说出一次对话轮经过的每个组件
  - 知道四种运行模式的区别
tags: [pi, 架构, 全景]
keyPoints:
  - 入口链：cli.ts(22行) → main.ts(973行) → 模式分发 → AgentSession
  - 四种模式：interactive(TUI)/print/json/rpc 共享同一个 AgentSession
  - 数据流：TUI → AgentSession → agentLoop → StreamFn(pi-ai) → 供应商
---

pi 的入口链干净得可以背下来：

```
cli.ts（22 行，设置进程标题/环境/HTTP dispatcher）
  → main.ts（973 行：参数解析、模式分发）
    → AgentSession（会话编排核心）
      → agentLoop（pi-agent-core 的循环）
        → StreamFn（pi-ai 的流函数）
          → 供应商 API（OpenAI/Anthropic/DeepSeek…）
```

## main.ts：交通枢纽

`packages/coding-agent/src/main.ts` 的 `main()` 函数（第 569 行起）做四件事：

1. 处理子命令（`pi auth` 管理凭据、`pi pkg` 管理包）；
2. 解析参数（`-p` 打印模式、`--export` 导出 HTML…）；
3. **构建 SettingsManager 和 AgentSession**——把配置、扩展、会话全部装配好；
4. 按 `resolveAppMode` 的结果分发到四种模式。

## 四种模式，一个内核

`modes/index.ts` 导出四种运行模式：

| 模式 | 触发 | 用途 |
|---|---|---|
| InteractiveMode | 默认 | TUI 交互界面（6403 行的大文件） |
| runPrintMode | `-p "问题"` | 一次性输出，脚本友好 |
| json 模式 | `--json` | 输出 JSON 事件流，程序对接 |
| runRpcMode | RPC | 被其他程序当服务调用 |

关键设计：**四种模式共享同一个 `AgentSession`**（`core/agent-session.ts`，3343 行）。文件头注释写明："This class is shared between all run modes"。UI 可以千变万化，内核只有一个——和 DeepTutor 的"三入口一个编排器"异曲同工。

## AgentSession：总指挥

`AgentSession` 是 pi 的高层编排器，它组合了四个零件：

- `Agent`（pi-agent-core）：低层循环与状态；
- `SessionManager`：JSONL 持久化与会话树；
- `SettingsManager`：配置；
- `ExtensionRunner`：扩展事件分发。

对外提供 `prompt()/steer()/followUp()/compact()/fork()/setModel()` 等方法。**你按一次回车，就是调了一次 `prompt()`**——它把输入交给核心循环，循环再通过 pi-ai 调模型，事件流逐层冒泡回 TUI 渲染。

## 数据流的双向旅程

**上行（输入）**：TUI 编辑器 → `AgentSession.prompt()` → `agentLoop()` → 组装上下文 → `StreamFn` 发起模型请求。

**下行（输出）**：供应商 SSE 流 → pi-ai 的 `AssistantMessageEvent` 事件流 → agentLoop 的 `AgentEvent` 事件 → AgentSession 分发 → TUI 差分渲染（字往外蹦）→ 同时 SessionManager 把消息追加进 JSONL 文件。

记住这条双向河流。卷二我们潜入河的最深处：pi-ai 的抽象层。

## 试一试

打开 `packages/coding-agent/src/cli.ts`——只有 22 行。数一数它做了几件事，然后想想：为什么入口要做这么薄？（提示：想想"入口薄、内核厚"对测试和复用的好处。）

## 下一讲预告

pi-ai 的类型宇宙：`types.ts`（831 行）里的 Api、Model、Message、Usage——一切类型的源头。
