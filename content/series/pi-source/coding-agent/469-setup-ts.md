---
title: "setup.ts — 进程级准备"
summary: "CLI 特有的「开机动作」。SDK 嵌入（createAgentSession）不会走这里。所以：用 pi 命令启动和把 Pi 嵌进桌面，进程环境不一样。做学习伴侣桌面时不要假设 PICODINGAGENT=true 一定存在，除非你自"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/setup.ts`（全文 13 行）  
被谁调用：`src/cli.ts` 和 `src/experimental/cli.ts` 都在 `main()` 之前同步调用一次。

## 这个文件在系统里的位置

CLI 特有的「开机动作」。SDK 嵌入（`createAgentSession`）**不会**走这里。所以：用 `pi` 命令启动和把 Pi 嵌进桌面，进程环境不一样。做学习伴侣桌面时不要假设 `PI_CODING_AGENT=true` 一定存在，除非你自己设。

## 依赖谁

- `../config.ts` 的 `APP_NAME`（默认 `"pi"`，可被 package.json 的 `piConfig.name` 改掉，用于衍生项目改命令名）
- `../core/http-dispatcher.ts` 的 `configureHttpDispatcher`

## 函数：`setupCli()`

**功能：** 给当前 Node 进程打上「我是 Pi CLI」的标记，并尽早配好 HTTP 客户端。

**参数：** 无。  
**返回：** `void`。  
**时机：** 必须同步、必须在任何可能发网络请求的代码之前。

### 逐行中文注释

```ts
process.title = APP_NAME;
```

进程在 `ps` / 活动监视器里显示为 `pi`，而不是 `node`。方便你认出一堆 Node 里哪一个是 Agent。

```ts
process.env.PI_CODING_AGENT = "true";
process.env.AI_AGENT = "pi";
```

两枚环境变量，给**子进程**和工具里跑的命令看：

- `PI_CODING_AGENT`：明确「现在是 Pi 编程助手 CLI」
- `AI_AGENT=pi`：更通用的「我是名为 pi 的 Agent」。bash 工具、用户脚本可以用它避免递归（例如别在 Pi 里再启动另一个会调 Pi 的包装器时死循环）

源码里其它地方会读这些变量（工具执行环境会把它们传下去）。SDK 路径若没设，子进程就看不到。

```ts
process.emitWarning = (() => {}) as typeof process.emitWarning;
```

把 Node 的 `process.emitWarning` 换成空函数。效果：进程级 warning（弃用 API、实验特性等）不再打到 stderr。

用意：交互式 TUI 占着整个终端，Node 冷不丁打一行 `DeprecationWarning` 会把画面打乱。代价：真有警告你也看不见。这是 CLI 产品取舍，不是库该做的事，所以只放在 `setupCli`，不放进 `createAgentSession`。

```ts
// Configure undici before provider SDKs issue requests. Settings are applied
// once SettingsManager has loaded global/project configuration.
configureHttpDispatcher();
```

英文原注释：在厂家 SDK 发出请求**之前**先配置 undici（Node 官方 HTTP 客户端）。完整的代理、超时等设置要等 `SettingsManager` 读完配置之后，`main.ts` 里会再调一次 `configureHttpDispatcher` / `applyHttpProxySettings`。

这里的第一次调用是「先有一个能用的调度器，别让最早的请求走默认值」。`main.ts` 读到用户的 `httpProxy` 之后会覆盖。

`configureHttpDispatcher` 的实现本课不展开，记在 `core/http-dispatcher.ts`，读网络层时再进。

## 失败时

`configureHttpDispatcher` 若抛错，CLI 起不来。没有回退路径。

## 下一个文件

[04-main.ts.md](/series/pi-source/coding-agent/470-main-ts/)（`src/main.ts`）。这是入口的主体。
