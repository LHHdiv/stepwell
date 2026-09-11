---
title: "12 · index.ts — SDK 对外门面，不是 CLI 入口"
summary: "看一张「产品对外 API 清单」。读完应能指出：编程接入 Runtime 从哪几个函数进、交互皮如何被二次嵌入、哪些东西故意没导出（比如 main 里的 argv 调度细节）。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/index.ts`  
被谁 import：外部 `import { createAgentSession, InteractiveMode, ... } from "@earendil-works/pi-coding-agent"`；扩展作者也从这里拿类型和组件。  
**不是** `pi` 命令入口。CLI 走 `src/cli.ts` / `src/experimental/cli.ts`。

## 本课目标

看一张「产品对外 API 清单」。读完应能指出：编程接入 Runtime 从哪几个函数进、交互皮如何被二次嵌入、哪些东西故意没导出（比如 `main` 里的 argv 调度细节）。

## 在系统中的位置

```text
外部进程 / 扩展
  import "@earendil-works/pi-coding-agent"
    → 本文件 re-export
      core/agent-session.ts、sdk.ts、session-manager.ts
      modes/index.ts（InteractiveMode / runPrintMode / RpcClient）
      modes/interactive/components/*、theme.ts
      utils 里少数稳定函数
```

本文件几乎没有运行时代码。它是一份**稳定表面**：内部文件可以挪，只要这里的名字还在，扩展不破。

## 分组读导出

### 配置路径

`CONFIG_DIR_NAME`、`getAgentDir`、`getPackageDir`、`VERSION` 等来自 `config.ts`。SDK 调用方自己拼 `auth.json` / `models.json` 时用这些，不要硬编码 `~/.pi/agent`。

### 会话与 Runtime

`AgentSession`、`createAgentSession`、`createAgentSessionRuntime`、`createAgentSessionServices` 是编程接入的主入口。CLI 也走同一套，见 [07](/series/pi-source/coding-agent/473-agent-session-runtime-ts/)–[09](/series/pi-source/coding-agent/475-sdk-ts/)。

`parseArgs` / `Args` 也从这里露出：有人要自己解析 argv 再调 `main` 或 `createAgentSession`。

### 扩展系统

`Extension`、`ExtensionAPI`、`defineTool`、`discoverAndLoadExtensions` 一整坨类型和工厂。扩展文档写的「从 `@earendil-works/pi-coding-agent` import」就是这里。

### 四种皮

```ts
export {
  InteractiveMode,
  runPrintMode,
  RpcClient,
  runRpcMode,
  ...
} from "./modes/index.ts";
```

`main` 也导出：`export { type MainOptions, main } from "./main.ts"`。嵌入式宿主可以跳过 CLI 解析，直接 `main(argv)`。

### UI 组件

`AssistantMessageComponent`、`CustomEditor`、`ModelSelectorComponent` 等从 `modes/interactive/components/index.ts` 再导出。扩展 `ui.custom()` 或自绘 TUI 时用。**不要**假设 CLI 进程一定加载了这些：print/RPC 路径不会 import 本段。

### 主题

`Theme`、`initTheme`、`highlightCode`、`getMarkdownTheme`。自定义工具的 `renderCall` 必须用这里的 `theme`，才能跟当前皮肤一致。

### 工具与压缩

`createReadTool` 等到 `createCodingTools`：给「我只要工具、不要整套会话」的嵌入方。压缩 API（`compact`、`shouldCompact`）给自己做摘要的宿主。

### 杂项 utils

只露出稳定、无进程副作用的：`copyToClipboard`、`parseFrontmatter`、`resizeImage`、`getShellConfig`。剪贴板读图、下载 `fd`/`rg` 这类带副作用的**不**从这里出去。

## 失败与边界

- 本文件一被 import 就会间接加载 `sdk.ts`，而 `sdk.ts` 会 `setDefaultStreamFn(streamSimple)`。扩展作者 import 类型时也会把默认 stream 插上。这是有意的。
- 没导出 `runMigrations`、`handlePackageCommand`：那些是 CLI 私货。
- 类型很多是 `export type`，运行时不存在。`tsc` 后的 `.d.ts` 才有它们。

## 下一课

[13-rpc-entry.ts.md](/series/pi-source/coding-agent/481-rpc-entry-ts/) — 专门给 RPC 子进程用的入口，对照本文件「不是 CLI」。
