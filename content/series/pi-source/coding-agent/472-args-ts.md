---
title: "args.ts — 手写 CLI 参数"
summary: "没有 commander / yargs。一个 for 循环扫 string[]，填 Args。Args 是 CLI 世界的结构化快照；main 再把它翻译成 createAgentSession() 的选项。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/args.ts`  
被谁调用：`main.ts` 的 `parseArgs(args)`；auth 子命令也会再 parse 一遍剩余参数。

## 这个文件在系统里的位置

没有 commander / yargs。一个 `for` 循环扫 `string[]`，填 `Args`。`Args` 是 CLI 世界的结构化快照；`main` 再把它翻译成 `createAgentSession()` 的选项。

本文件还负责 `printHelp`（`pi --help`）。帮助文本里的扩展旗标是运行时拼上去的：要等扩展加载完，`main` 才调用 `printHelp(extensionFlags)`。所以 `--help` 发生在创建 runtime **之后**，不是 parse 完立刻打。

## 依赖谁、被谁调用

- 依赖：`ThinkingLevel`（agent-core）、`APP_NAME` 等（config）、扩展旗标类型、`TuiMode`
- 被调用：`main`、`runAuthCommand`
- 不创建 Session，不读磁盘（`--append-system-prompt` 的文件内容由后面的流程读）

---

## 类型 `Args`

按职责分组记，不必背每一个可选字段：

| 组 | 字段例子 | 后来谁用 |
|---|---|---|
| 模型 | `provider` `model` `apiKey` `thinking` `models` | `buildSessionOptions` |
| 会话 | `continue` `resume` `session` `sessionId` `fork` `noSession` `sessionDir` `name` | `createSessionManager` |
| 工具 | `tools` `excludeTools` `noTools` `noBuiltinTools` | `buildSessionOptions` |
| 资源 | `extensions` `skills` `promptTemplates` `themes` `useTheme` 以及对应的 `no*` | runtime 工厂里的 `resourceLoaderOptions` |
| 模式 | `mode` `print` `tuiMode` `verbose` `offline` | `resolveAppMode` |
| 一次性 | `help` `version` `export` `listModels` | `main` 里短路退出 |
| 信任 | `projectTrustOverride`（`--approve` / `--no-approve`） | 项目扩展信任 |
| 输入 | `messages` `fileArgs` | `prepareInitialMessage` |
| 扩展点 | `unknownFlags` | 扩展自己登记的 CLI 旗标 |
| 解析期问题 | `diagnostics` | `main` 打印；有 error 则 `exit(1)` |

`Mode` 只有 `"text" | "json" | "rpc"`。交互不是 parse 出来的，是 `resolveAppMode` 在 TTY 上推出来的。

---

## `parseArgs(args: string[]): Args`

**功能：** 把 argv 变成 `Args`。不抛错；坏输入进 `diagnostics`。

**逻辑：** 从左到右 `for`。每个分支吃掉当前 token，需要值的旗标再 `++i`。

几个值得盯的分支：

### `--` 结束解析

之后全部当位置参数：`@x` 进 `fileArgs`（去掉 `@`），其余进 `messages`。这样 prompt 里可以出现 `-v`，不会被当成 `--version`。

```text
pi -p -- "- Summarize these points"
```

### `--print` / `-p`

设 `print = true`。若下一个 token 不像旗标、也不像 `@file`，把它当成第一条消息吃掉。于是 `pi -p "你好"` 不必再写 `--`。

以 `---` 开头的 token 也当消息（三个短横），避免和 `--flag` 撞车。

### `@file`

出现在任何还没遇到 `--` 的位置，去掉 `@` 推进 `fileArgs`。`main` 里 `processFileArguments` 再读文件、抽图片。

### 未知 `--flag`

不立刻当错误。`--foo=bar` 或 `--foo bar` 或单独的 `--foo` 进 `unknownFlags`（值是字符串或 `true`）。扩展加载之后才知道这是不是合法旗标。内核先收着。

### 未知短旗标

`-x` 这种（不是已识别的 `-p` / `-h` 等）进 `diagnostics` 的 error。短旗标没有「留给扩展」的通道。

### `--thinking` 非法值

warning，不是 error。进程继续，思考等级当没写。

### `--name` 缺值、`--use-theme` 缺值、`--tui-mode` 非法

error 诊断。`main` 看到 error 会 `exit(1)`。

### 位置参数

剩下不以 `-` 开头的，进 `messages`。交互模式可以 `pi "读 README"` 把这句话当第一轮输入。

**返回：** 填好的 `Args`。调用方必须自己看 `diagnostics`。

---

## 其它导出

| 符号 | 干什么 |
|---|---|
| `isValidThinkingLevel` | `"off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" \| "max"` |
| `normalizeSessionName` | trim；空则 `undefined`。`main` 在 `--name` 上用 |
| `printHelp(extensionFlags?)` | 把用法打到 stdout；扩展旗标可选附在后面 |

`printHelp` 很长，是给用户看的说明书，不是给模型看的。读源码时当对照表：某个旗标不认识，来这里搜字符串，再回到 `parseArgs` 对应分支。

---

## 和 `main` 的分工

`parseArgs` **不管**互斥（`--fork` 不能配 `--session`）。那是 `main` 里的 `validateForkFlags` / `validateSessionIdFlags`。parser 只负责「字符串 → 字段」。

`runAuthCommand` 会在确认是 auth 子命令之后，对剩余 argv **再**调一次 `parseArgs`。所以 `pi auth print-api-key --provider openai` 的 `--provider` 仍走同一套解析。

## 失败时

本函数不 `process.exit`。失败信息在 `diagnostics`。未知短选项是 error；未知长选项先当扩展旗标。

## 读完应能指着源码说的

1. 为什么没有 yargs。
2. `unknownFlags` 为什么必须存在（扩展 CLI）。
3. `--` 和 `-p` 各自怎么把后面的 token 收成消息。
4. `messages` 和 `fileArgs` 的差别。

## 下一个文件

[07-agent-session-runtime.ts.md](/series/pi-source/coding-agent/473-agent-session-runtime-ts/)。`main` 选好会话之后，用工厂闭包创建 runtime。
