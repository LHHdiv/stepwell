---
title: 第20讲·内置工具巡礼
summary: 工具从哪来？pi 的工具有三个来源——内置默认、配置注入、扩展注册。本讲理清这条供给链，并借官方示例看清工具的真实形态。
objectives:
  - 说出 pi 工具的三个来源，以及 --no-builtin-tools 开关的作用
  - 通过官方示例扩展，识别一个真实 ToolDefinition 的关键字段
  - 理解"同名工具覆盖"机制：扩展可以整体替换内置工具
tags: [pi, 工具系统, 内置工具, 扩展]
keyPoints:
  - "工具的三个来源：内置默认工具、AgentSession 配置里的 customTools（agent-session.ts:208）、以及扩展通过 registerTool（loader.ts:264）注入"
  - "--no-builtin-tools 开关（cli/args.ts:35 与 :121，main.ts:538）可整体关闭内置工具，只留自定义与扩展工具"
  - "工具最终都进 AgentSession 的 _toolRegistry（getAllTools 见 agent-session.ts:908），按名字启用（setActiveToolsByName :928）"
  - "同名覆盖：用 registerTool 注册与内置同名的工具会整体替换它（examples/extensions/built-in-tool-renderer.ts:14）"
  - "官方示例扩展（hello/bash-spawn-hook/sandbox/ssh/gondolin 等）是最具体的'工具长相'公开样本，字段与第 19 讲 ToolDefinition 一一对应"
---

第 19 讲我们看到 `defineTool` 只是给工具发"身份证"。但一个能干活的产品，绝不会让用户从零定义所有工具——它一定**出厂自带一套**。这一讲回答：pi 的工具到底从哪来？又长什么样？

## 一、工具的"三条供给线"

pi 的工具不是只有一个入口，而是来自三个源头，最终汇进同一个注册表：

1. **内置默认工具**：随 pi 一起发布、开箱即用（读文件、跑命令、搜代码等）。它们可被整体关闭。
2. **配置注入的 `customTools`**：在 `AgentSession` 的配置里直接传 `ToolDefinition[]`。看 `packages/coding-agent/src/core/agent-session.ts:208`：

   ```ts
   customTools?: ToolDefinition[];   // AgentSession 配置项
   ```
   在 `:383` 它被收进 `this._customTools`，运行时合入可用工具集。
3. **扩展注册**：扩展在加载时调用 `registerTool`。看 `packages/coding-agent/src/core/extensions/loader.ts:264`：

   ```ts
   registerTool(tool: ToolDefinition): void {
       // 把工具塞进当前正在加载的扩展的工具集合
   }
   ```

三条线在 `agent-session.ts:908` 的 `getAllTools()` 处汇合——它遍历 `_toolDefinitions` 这个 Map，给每个工具贴上 `sourceInfo`（标记来自内置 / 配置 / 扩展），再返回给上层。

## 二、开关与覆盖：谁说了算

**关掉内置工具**：命令行有 `--no-builtin-tools`。看 `packages/coding-agent/src/cli/args.ts:35`：

```ts
noBuiltinTools?: boolean;
// 解析到 :121 时置 true；main.ts:538 据此跳过内置工具的装载
```

这给了"沙箱 / 受限环境"一个干净的下限：连内置工具都不给，只认你显式传入的 `customTools` 和审批过的扩展。

**覆盖内置工具**：更妙的是，扩展可以用**同名**工具整体替换内置实现。官方示例 `packages/coding-agent/examples/extensions/built-in-tool-renderer.ts:14` 的注释说得很直白：

> registerTool() with the same name as a built-in replaces it entirely

也就是说，工具的"名字"是全局唯一键，谁后注册同名工具，谁就覆盖前者。这让 pi 既能"出厂够用"，又能"按需换芯"，而不用改核心代码。

## 三、真实工具长什么样：借官方示例

内置工具的实现细节不在公开示例里，但 `packages/coding-agent/examples/extensions/` 下有一批**完整可跑的扩展工具**，它们的字段结构与内置工具完全一致。挑几个有代表性的：

| 示例文件 | 工具意图 | 看点 |
|---|---|---|
| `examples/extensions/hello.ts:25` | 最小 `pi.registerTool({...})` | 一个工具的全部必填字段 |
| `examples/extensions/bash-spawn-hook.ts:24` | 在 shell 前后插钩子 | `execute` 里如何 spawn 子进程 |
| `examples/extensions/sandbox/index.ts:214` | 沙箱化执行 | 工具如何再包一层安全边界 |
| `examples/extensions/ssh.ts:128` | 远程执行 | 工具能跨机，不只是本地 |
| `examples/extensions/gondolin/index.ts:443–509` | 一组小工具 | 一个扩展注册多个 `registerTool` |
| `examples/extensions/question.ts:45` | 向用户提问 | `onUpdate` 之外的"反向交互" |
| `examples/extensions/structured-output.ts:64` | 结构化输出 | 用 `TDetails` 约束返回形状 |

随便打开 `hello.ts:25`，你会看到第 19 讲 `ToolDefinition` 的活体实例：`name`、`description`、`parameters`（TypeBox schema）、`execute`。理论和实践在这里严丝合缝。

> **知识拓展**：为什么 pi 把"工具"做成可覆盖、可来自多源？因为它把"产品能力"和"核心引擎"解耦——核心只认 `ToolDefinition` 这个契约，至于能力清单，交给"出厂配置 + 用户配置 + 扩展"三者博弈。这正是第 03 讲"自扩展哲学"在工具层的落地。

## 四、试一试

1. 打开 `examples/extensions/hello.ts`，把它的 `parameters` schema 改成包含两个字段（比如 `name` 和 `count`），体会 TypeBox 如何同时约束"模型传参"和"你写代码时的类型提示"。
2. 在 `agent-session.ts` 里搜索 `sourceInfo`，看看它除了标记来源，还携带了哪些信息（扩展名？文件路径？）。
3. 设想一个场景：你只想让 agent 能读文件、不能执行命令。结合 `--no-builtin-tools` 和 `customTools`，描述你会怎么搭出这个最小能力集。

## 下一讲预告

工具只是 `ExtensionAPI` 开放的八类能力之一。下一讲我们正式走进 `ExtensionAPI` 这个"产品形态开关面板"——工具、命令、快捷键、CLI flag、provider……一个 pi 进程装不同扩展，就变成了不同产品。
