---
title: 第42讲·SDK 逐层工厂：把 pi 嵌进你的程序
summary: coding-agent 不只有 CLI 这副面孔，还有 SDK 这副——用代码分层组装 AgentSession，把 pi 嵌进宿主应用。本讲看这层"库形态"工厂。
objectives:
  - 说出 SDK 与 CLI 的关系：同一内核的两种面孔
  - 指出 SDK 如何让你用代码注入 customTools / extensions，免去命令行
  - 把 SDK 与第 39 讲 AgentSession、第 40 讲可塑性连起来
tags: [pi, SDK, 工厂, 嵌入]
keyPoints:
  - "SDK（sdk.ts）是 coding-agent 的'库面孔'：不用命令行，用代码组装并运行 AgentSession"
  - "SDK 的配置项含 customTools（sdk.ts:73/:383），让宿主程序直接注入专属工具，对应第 40 讲旋钮二"
  - "SDK 与 CLI 共享同一套底层：都最终产出 AgentSession（第 39 讲），区别只在'谁调用 run'"
  - "examples/sdk/05-tools.ts 等示例演示如何用 SDK 注册工具、跑 agent，是'嵌入 pi'的活样本"
  - "分层工厂的意义：宿主只声明'要什么能力'，SDK 负责把 agent/工具/扩展/持久化逐层拼好"
---

第 38–41 讲看的是 `coding-agent` 的 **CLI 面孔**：用户敲命令、参数解析、模式分派。但产品还有**另一副面孔**——SDK：让你在自己的 Node 程序里，用几行代码就把 pi 跑起来、把它的能力嵌进去。这一讲看这层"库形态"工厂。

## 一、先结论：SDK 与 CLI 是同源双面孔

`coding-agent` 的 `sdk.ts` 暴露的是一套**编程接口**。它的意义和 CLI 完全一致——都是"把内核组装成可运行的 `AgentSession`"——只是入口不同：

- **CLI**：人敲命令 → `parseArgs` → 分派 → `run`；
- **SDK**：程序调用工厂 → 传配置 → 拿到 `AgentSession` → 自己驱动。

底层是同一套零件（第 12–18 讲的 agent 运行时、第 19–22 讲的工具/扩展、第 34–37 讲的持久化/遥测）。**SDK 不是另一个 pi，只是 pi 的"库入口"**。

## 二、用代码注入能力：customTools

SDK 的配置项直接对应第 40 讲的可塑性旋钮。看 `packages/coding-agent/src/core/sdk.ts:73`：

```ts
customTools?: ToolDefinition[];   // SDK 配置项
// 在 :383 被透传给 AgentSession 配置
```

宿主程序调用 SDK 时，直接传 `customTools`：

```ts
const agent = createXxx({          // SDK 工厂（具体名见 sdk.ts 导出）
	customTools: [myTool],          // 注入专属工具，无需命令行、无需扩展文件
});
await agent.prompt("帮我做 X");
```

这和第 40 讲"旋钮二"是同一回事，只是**从命令行搬到了代码里**。好处是：你的应用逻辑和 pi 的能力声明写在一起，不必让用户去记 `--no-builtin-tools` 或放 `.pi/extensions` 目录。

> **知识拓展**：这种"同一内核、CLI+SDK 双入口"的模式，在工具库里很常见（如 esbuild 既有 `esbuild` 命令也有 `require('esbuild')`）。它让产品既能被人直接用，也能被程序集成——覆盖度最大化。

## 三、分层工厂：你只声明，它来拼

SDK 的价值在"分层工厂"：宿主只声明"我要什么"，SDK 负责把零件逐层拼好。典型一层层是：

```
宿主声明（customTools / extensions / mode / 持久化选项）
   ↓
SDK 工厂：校验配置、装载扩展（第 22 讲 loader）
   ↓
创建 AgentSession（第 39 讲：包好 agent+工具+扩展+持久化）
   ↓
返回给你一个可 prompt() 的会话对象
```

你不需要懂 `runLoop`、不需要懂 `ExtensionAPI` 的加载细节、不需要懂 `SessionRepo` 的落库——SDK 把这些"组装复杂度"吞掉，只留一个干净的 `prompt()` 给你。

## 四、活样本：examples/sdk

`packages/coding-agent/examples/sdk/05-tools.ts` 等示例，是把 SDK 跑通的模板：

- 怎么用 SDK 注册工具；
- 怎么驱动 agent 跑一轮；
- 怎么把结果取回来。

它们和第 39 讲 `AgentSession.prompt` 一脉相承——示例里最终也是拿一个会话对象调 `prompt`。区别只是"这个对象是你用代码造的，不是 CLI 启动造的"。

## 五、和全系列的咬合

SDK 是"产品总装"的收口视角：

- 第 38–41 讲：CLI 面孔，`pi` 命令怎么来；
- **第 42 讲**：SDK 面孔，你的程序怎么把 `pi` 当库用；
- 两者共享：第 12–18 运行时、第 19–22 工具/扩展、第 23–24 模式/会话、第 25–28 信任边界、第 29–33 UI/评测、第 34–37 持久化/遥测。

**一副内核，两副面孔，九卷骨架**——这就是 pi 作为"自扩展编码智能体"的完整轮廓。

## 六、试一试

1. 打开 `sdk.ts`，看它导出的工厂函数签名里除了 `customTools` 还接哪些配置（extensions？mode？sessionDir？），列一张"SDK 可声明项"清单。
2. 读 `examples/sdk/05-tools.ts`，对比它注册工具的方式和第 20 讲 `hello.ts` 的扩展注册，指出 SDK 路径为何更轻量。
3. 思考：如果宿主用 SDK 嵌入 pi，却又要"密钥隔离"（第 25 讲），SDK 该配 cli 还是 server 模式？为什么？（提示：SDK 仍要走 client 连受信任 server，才能不把 key 留在宿主进程。）

## 下一讲预告

全系列九卷的技术骨架讲完。最后一卷"毕业"：测试策略、调试回路、毕业设计，外加命令速查与术语对照两篇附录，帮你把知识落成肌肉记忆。
