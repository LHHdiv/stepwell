---
title: "main.ts — CLI 启动编排"
summary: "文件头英文原意：CLI 的主入口；本文件负责解析参数，翻译成 createAgentSession() 的选项。重活在 SDK，不在这里。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/main.ts`（约 981 行）  
导出：`main`、`createSessionManager`  
被谁调用：`src/cli.ts` 或 `src/experimental/cli.ts` 传入 `process.argv.slice(2)`

## 这个文件在系统里的位置

文件头英文原意：CLI 的主入口；本文件负责**解析参数，翻译成 `createAgentSession()` 的选项**。重活在 SDK，不在这里。

把它想成火车站的总调度：

- 哪些车次根本不出站（`--version`、`auth`、`install`、`--help`、`--export`）在这里直接办完并 `process.exit`
- 要出站的，在这里选好「哪条会话轨道、什么模式、信不信任这个项目」，然后把车交给 `InteractiveMode` / `runPrintMode` / `runRpcMode`
- **不**在这里调用模型、不执行工具、不画聊天气泡

读本文件时盯一件事：`main()` 从 argv 走到三种 mode 的分支，中间每一个 `return` / `process.exit` 是提前下车。

## 依赖谁（按职责分组）

| 分组 | 从哪 import | 干什么 |
|---|---|---|
| 参数与一次性命令 | `cli/args.ts`、`cli/auth-*.ts`、`package-manager-cli.ts` | 把字符串变成结构化参数；auth/install/config |
| 会话文件 | `core/session-manager.ts`、`cli/session-picker.ts` | 新建 / 打开 / fork / 续写 JSONL |
| 运行时工厂 | `core/agent-session-runtime.ts`、`core/agent-session-services.ts`、`core/sdk.ts` | 按 cwd 装模型、工具、扩展 |
| 三种皮 | `modes/index.ts` | 交互、打印、RPC |
| 设置与信任 | `core/settings-manager.ts`、`core/project-trust.ts`、`core/trust-manager.ts` | 配置、项目是否受信 |
| 路径与版本 | `config.ts` | `APP_NAME`、`getAgentDir()`、`VERSION` |

`pi-ai`、`pi-tui` 在本文件里只碰到边角：图片类型、模型相等比较、终端能力覆盖。真正用模型在更里面。

内置扩展只有一个：`extensions/index.ts` 里的 `llama.cpp`（`hidden: true`）。`main` 把它放进 `extensionFactories`，和用户扩展一起交给资源加载器。

---

## 文件结构（按出现顺序）

```text
辅助函数（不导出）
  readPipedStdin
  reportDiagnostics
  isTruthyEnvFlag
  resolveAppMode
  toPrintOutputMode
  isPlainRuntimeMetadataCommand
  runAuthCommand
  prepareInitialMessage
  findLocalSessionByExactId
  resolveSessionPath
  promptConfirm
  validateForkFlags / validateSessionIdFlags
  openSessionOrExit / forkSessionOrExit
导出：createSessionManager
  buildSessionOptions
  resolveCliPaths
  promptForMissingSessionCwd
类型：MainOptions
导出：main          ← 从这里顺着往下读第二遍
```

下面按函数写中文注释。行号按当前 `d12cd92e4` / 0.85.1，对不上时以函数名为准。

---

## `readPipedStdin`（约 79–96 行）

**功能：** 若标准输入不是交互终端（有管道），把管道里的全部文字读完。

**返回：** `string | undefined`。是 TTY 则 `undefined`（不要去读，否则会卡住等你 Ctrl+D）。

**逻辑：**

1. `process.stdin.isTTY` 为真 → 直接返回，用户还要在 TUI 里打字。
2. 否则监听 `data` / `end`，拼成一段 UTF-8，去掉首尾空白；空则仍返回 `undefined`。

**谁用：** `main` 在选好 mode 之后。若交互模式却读到了管道内容，会把 mode 改成 `print`（管道进来的任务跑完就退出，不要再开 TUI）。

**注意：** RPC 模式跳过这个函数，因为 stdin 被 JSON-RPC 占用。

---

## `reportDiagnostics`（约 98–104 行）

**功能：** 把运行时诊断打到 stderr，按 error / warning / 其它上色。

不决定是否退出。退出由调用方看有没有 `type: "error"`。

---

## `isTruthyEnvFlag`（约 106–109 行）

把环境变量 `"1"` / `"true"` / `"yes"`（忽略大小写）当成开。用于 `PI_OFFLINE`、`PI_STARTUP_BENCHMARK`。

---

## `resolveAppMode`（约 111–122 行）

**功能：** 决定这次进程是哪一张皮。

**参数：** 已解析的 `Args`，以及 stdin/stdout 是不是 TTY。

**返回：** `"rpc" | "json" | "print" | "interactive"`（类型名 `AppMode`）。

**逻辑（有优先级）：**

1. `--mode rpc` → `rpc`
2. `--mode json` → `json`
3. `--print` **或者** stdin/stdout 不是 TTY → `print`（在脚本、CI、重定向里不能开 TUI）
4. 否则 `interactive`

JSON 模式走打印那条实现，只是输出结构化事件而不是纯文本。见下面 `toPrintOutputMode`。

---

## `toPrintOutputMode`（约 124–126 行）

`json` 保持 `json`，其它非 rpc 都当 `text`。RPC 不会进 `runPrintMode`。

---

## `isPlainRuntimeMetadataCommand`（约 128–130 行）

`--help` 或 `--list-models`，且没有 `--print`、没有显式 `--mode`。这种命令只打印元数据，**不要**把 stdout 劫持成内部日志（`takeOverStdout`）。否则 `pi --help` 的帮助会消失或乱序。

---

## `runAuthCommand`（约 132–208 行）

**功能：** 若 argv 是 `auth ...` 子命令，在这里办完并告诉 `main` 不要继续启动 Agent。

**返回：** `true` = 已经处理（无论成败），`main` 应 `return`；`false` = 不是 auth 命令，继续往下。

**逻辑：**

1. 只是 help → 打印用法，返回 true。
2. `parseAuthCommand` 失败 → 红字、`exitCode=1`、返回 true。
3. 解析不出命令 → 返回 false（不是 auth）。
4. 把剩余参数再走一遍 `parseArgs`，未知 flag 则报错返回。
5. `kind !== "check"`：把凭据打印到 stdout（给脚本用），15 秒超时，不允许为了列模型去联网（`allowModelNetwork: false`）。
6. `kind === "check"`：查这家 Provider 是否 ready；可选把凭据一起输出。退出码：ready=0，not_ready=1，invalid=2。

**失败：** 一律吞在本函数里设 `process.exitCode`，不抛给 `main`。这是「一次性工具命令」风格。

实现细节在 `cli/auth-command.ts`、`cli/auth-check.ts`，入口读完后再进。

---

## `prepareInitialMessage`（约 210–229 行）

**功能：** 把「命令行上的初始问题 + 管道 + `@文件`」收成 `prompt` 能吃的 `{ initialMessage, initialImages }`。

- 没有 `@文件`：只交给 `buildInitialMessage`
- 有 `@文件`：先 `processFileArguments` 读出文本和图片，再拼进去

`pi -p "解释这段"` 的那句话、以及 `pi 请看 @foo.ts`，都在这里变成第一轮用户消息。真正 `session.prompt` 发生在 mode 里，不在 `main`。

---

## 会话路径解析（约 231–278 行）

类型 `ResolvedSession` 四种：直接路径、当前项目里的会话、别的项目里的会话、找不到。

### `findLocalSessionByExactId`

在当前 cwd 的会话列表里找 **id 完全相等** 的那条。给 `--fork --session-id` 防冲突、给 `--session-id` 打开已有会话用。

### `resolveSessionPath(sessionArg, cwd, sessionDir)`

用户写的可能是路径，也可能是 id 前缀：

1. 含 `/` `\` 或以 `.jsonl` 结尾 → 当文件路径，用 `resolvePath` 相对 cwd 展开。
2. 否则在**当前项目**会话里找：先精确 id，再 `startsWith` 前缀。
3. 再在**全局**所有项目里同样找。找到则带上那个项目的 `cwd`（后面可能要询问是否 fork 过来）。
4. 都没有 → `not_found`。

`--session`、`--fork` 共用这套规则。

---

## `promptConfirm`（约 280–292 行）

阻塞问 `[y/N]`。只有 `y` / `yes` 为真。用于「在别的项目找到会话，要不要 fork 到当前目录」。

---

## `validateForkFlags` / `validateSessionIdFlags`（约 294–331 行）

互斥校验，冲突则打印错误并 `process.exit(1)`：

- `--fork` 不能和 `--session` / `--continue` / `--resume` / `--no-session` 一起
- `--session-id` 不能和 `--session` / `--continue` / `--resume` 一起
- `--session-id` 还要过 `assertValidSessionId`（格式）

这些是「还没碰磁盘」的参数错误，越早死越好。

---

## `openSessionOrExit` / `forkSessionOrExit`（约 333–351 行）

薄封装：打开或从某文件 fork。抛错就打印并 `exit(1)`。`main` 里大量会话分支依赖「失败即死」，不要返回半开的 manager。

---

## `createSessionManager`（约 353–444 行，已导出）

**功能：** 按 CLI 旗标决定「这回用哪一份会话」。这是 `main` 里最重要的分支之一。

**参数：** 解析后的 args、当前 cwd、会话目录、启动阶段的 SettingsManager（只用于列会话、弹选择器）。

**返回：** 一个 `SessionManager`（可能指向磁盘 JSONL，也可能是纯内存）。

**逻辑（按 if 顺序，先命中先走）：**

| 条件 | 行为 |
|---|---|
| `--no-session` 或 `--help` 或 `--list-models` | `SessionManager.inMemory`。帮助和列模型不需要写盘；`--no-session` 是一次性对话 |
| `--fork <id或路径>` | 解析源会话；可带 `--session-id` 指定新 id，若本地已有该 id 则报错退出；然后 `forkFrom` |
| `--session <id或路径>` | 本地或路径直接 `open`；若在**别的项目**找到，交互询问是否 fork 进当前目录；拒绝则 exit 0 |
| `--resume` | 弹出会话选择器（当前项目 + 全局），选中则 `open`；取消则 exit 0。`finally` 里停主题监视，因为选择器可能开过 TUI |
| `--continue` | `continueRecent`：当前项目最近一条 |
| 仅 `--session-id` | 本地已有该 id 则打开，否则警告并**用这个 id 新建** |
| 以上都没有 | `SessionManager.create` 新建一条，可选使用 `--session-id` |

**失败：** 找不到会话、打开失败 → `exit(1)`。用户取消选择 → `exit(0)`。

会话文件格式、JSONL 条目是 `session-manager.ts` 的课，这里只关心「选哪条轨道」。

---

## `buildSessionOptions`（约 446–542 行）

**功能：** 把 CLI 上的模型、思考等级、工具开关，填进 `CreateAgentSessionOptions`。**不创建** Session，只准备选项对象。

**逻辑：**

1. `--model` / `--provider`：`resolveCliModel`。支持 `--model provider/pattern`，也支持 `--model 名字:思考等级` 这种缩写。解析警告/错误进 diagnostics，不一定立刻 exit。
2. 没指定模型但有 `--models` 范围、且不是续写旧会话：若设置里保存的默认模型在范围内就用它，否则用范围里第一个。
3. 显式 `--thinking` 覆盖上面一切思考等级。
4. `scopedModels`：交互里 Ctrl+P 循环切换的那一组。思考等级没写则 `undefined`，表示切换时继承当前会话的思考等级。
5. 工具：`--no-tools` → 全部关掉；`--no-builtin-tools` → 只关默认四件，扩展工具还在；`--tools` 白名单；`--exclude-tools` 黑名单。

`--api-key` 不在这里写入 options，而在 `main` 的 runtime 工厂里 `modelRuntime.setRuntimeApiKey`：那是**进程内覆盖**，不写进 `auth.json`。

---

## `resolveCliPaths`（约 544–546 行）

把 CLI 里的扩展/Skill/主题路径：看起来像本地路径的，相对 cwd 变成绝对路径。避免之后会话换了 cwd，相对路径被二次解释错。

---

## `promptForMissingSessionCwd`（约 548–556 行）

会话文件记录的工作目录已经不存在（项目挪走过）。交互模式弹出「Continue / Cancel」：Continue 用 fallback cwd，Cancel 退出。非交互在 `main` 里直接报错退出，不走这个函数。

---

## `MainOptions`（约 558–560 行）

```ts
export interface MainOptions {
  extensionFactories?: InlineExtension[];
}
```

给测试或嵌 CLI 的调用方额外塞内置扩展。`cli.ts` 调用 `main(args)` 时不传。`main` 内部会再拼上 `builtInExtensions`（llama.cpp）。

---

## `main(args, options?)`（约 562–981 行）

这是总流程。下面按**时间顺序**分段。每一段在源码里几乎是从上到下连续的。

### A. 计时、扩展列表、离线（562–569）

- `resetTimings()`：启动耗时探针清零。`PI` 开发者用来看哪一段慢。
- 扩展工厂 = 内置 llama.cpp + 调用方额外传入的。
- argv 含 `--offline` 或环境变量 `PI_OFFLINE` 为真：写入 `PI_OFFLINE=1` 和 `PI_SKIP_VERSION_CHECK=1`，后面刷新模型目录、版本检查都会收手。

### B. 一次性命令，可能直接结束（571–632）

1. `runAuthCommand` → true 则 return（不 exit，靠内部 exitCode）。
2. Windows：清自更新隔离区。
3. `cleanupManagedInstall()`：上次安装残留。
4. `cwd = process.cwd()`，`agentDir = getAgentDir()`（默认 `~/.pi/agent`）。
5. 用 **projectTrusted: false** 建一个引导用 SettingsManager，先应用 HTTP 代理并 `configureHttpDispatcher()`。此时还没问「信不信这个项目」，所以不当项目配置是可信的。
6. `handlePackageCommand`：`pi install` / `pi update` 等。处理完 `process.exit`。Windows 上成功的 `pi update` 例外：不 `exit`，让事件循环自己排空，避开 Node 的一个 fetch+exit 断言（注释里链到 nodejs/node#56645）。
7. `handleConfigCommand`：`pi config ...`，处理完 return。
8. `parseArgs`。有 error 级诊断则 `exit(1)`；warning 只打印。
9. `--version` → 打印 `VERSION`（来自本包 package.json）→ exit 0。
10. `--export` → 把某会话导出 HTML → exit。

这些分支**都还没有** `createAgentSession`。

### C. 定 mode、校验旗标、迁移（634–664）

- `resolveAppMode`。非交互且不是纯帮助/列模型 → `takeOverStdout()`，防止工具输出和协议输出搅在一起。
- RPC 不允许 `@file`。
- `validateForkFlags` / `validateSessionIdFlags`。
- `runMigrations(cwd)`：升级旧的 auth 文件格式等，收集弃用警告。交互模式稍后才展示警告，避免破坏 TUI。
- 再建一个启动用 SettingsManager（这次按默认信任规则）。
- 交互且不是 help/list-models：可能跑第一次启动向导（主题、分析选择）。**必须在创建 runtime 服务之前**，这样选中的设置全局生效。
- `--theme` 覆盖写进启动 SettingsManager。

### D. 先定会话和最终 cwd，再创建服务（666–698）

注释写得很明确（英文原意）：`--session` / `--resume` 可能选中**另一个项目**的会话，那么项目级设置、资源、厂家、模型都必须等知道目标 cwd 之后再解析。启动 cwd 的 SettingsManager 只用来查找 `sessionDir`。

`sessionDir` 优先级：`--session-dir` → 环境变量 `PI_CODING_AGENT_SESSION_DIR` → 设置里的 sessionDir。

然后 `createSessionManager`。若会话记录的 cwd 丢了：交互则询问，非交互则报错退出。`--name` 给会话写一个可读名字。

### E. 项目信任 + runtime 工厂（700–839）

`ProjectTrustStore` 记在 `agentDir` 里：这个目录的项目扩展是否允许跑。

`autoTrustOnReloadCwd`：若 CLI 没强制信任开关，且当前目录没有「需要信任才能加载」的项目资源，换目录重载时可以自动信任。否则要问。

`createRuntime` 是一个闭包工厂，类型 `CreateAgentSessionRuntimeFactory`。交互里 `/login` 或换工作目录会**再次**调用它，所以它捕获了 CLI 解析结果、路径、信任缓存 `projectTrustByCwd`。

工厂内部每次：

1. 决定 `projectTrusted`（CLI 覆盖 / 缓存 / 信任库 / 「没有需要信任的资源」）。
2. `SettingsManager.create(cwd, agentDir, { projectTrusted })`。
3. `createAgentSessionServices`：模型运行时、资源加载器。加载器可带 `resolveProjectTrust` 回调——真有项目扩展时才弹信任 UI。
4. 把扩展加载失败映射成 error 诊断。
5. `--models` 或设置里的 enabled models → `resolveModelScope`（15 秒超时）。
6. `buildSessionOptions`。
7. `--api-key`：必须已经能确定模型，否则报错；然后 `setRuntimeApiKey`（不落盘）。
8. `createAgentSessionFromServices`：真正 `new AgentSession`。
9. CLI 指定过思考等级则再 `setThinkingLevel` 一次，确保写进会话记录。

然后：

```ts
const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: sessionManager.getCwd(),
  agentDir,
  sessionManager,
});
```

`sessionManager.getCwd()` 可能已经不是 `process.cwd()`（续写了别人的项目会话）。

### F. 帮助、列模型、管道、主题（853–893）

到这里 runtime 已经在，扩展旗标也能列进 `--help`，所以 help/list-models 放在创建 runtime **之后**。列完 `process.exit(0)`。

非 RPC：读管道。交互模式若读到管道内容 → 改成 print。

`prepareInitialMessage` 得到第一句话和图片。

主题：先挂上 JSON 校验（用户可能乱写主题文件），再 `initTheme`。

交互模式展示迁移弃用警告。

### G. 诊断、没有模型、开跑（895–980）

- 合并启动诊断。交互模式若没有 error，先不往终端打一堆 warning（TUI 自己展示）；有 error 或非交互则立刻 `reportDiagnostics`。
- 扩展加载 error → 额外提示 `pi -ne` 可关扩展启动。
- 非交互且没有可用模型 → 红字退出。交互允许先进入再 `/login`。
- `PI_STARTUP_BENCHMARK`：只允许交互；`init` 之后等 150ms 让终端查询回包，然后停 TUI、打计时、return。用来测启动速度，不是给用户用的。
- RPC 在后台刷新模型目录（15 秒 abort），不挡协议。
- **三路出口：**
  - `rpc` → `runRpcMode(runtime)`（`await` 且函数类型是 `never`，正常不返回）
  - `interactive` → `new InteractiveMode(runtime, {...}).run()`
  - 否则 print/json → `runPrintMode`，完了停主题监视、`restoreStdout`，非 0 则设 `exitCode`

`initialMessage` / `initialImages` / `parsed.messages` 作为第一轮输入交给交互或打印，**main 自己不调用 `session.prompt`**。

---

## 失败与退出码（汇总）

| 情况 | 行为 |
|---|---|
| auth check ready / not_ready / invalid | 0 / 1 / 2 |
| 参数冲突、打不开会话、扩展加载失败 | `exit(1)` |
| 用户取消选择器 / 取消 fork | `exit(0)` |
| 打印模式 Agent 失败 | `process.exitCode = exitCode`，让进程自然结束 |
| 交互模式 | 通常由 TUI 自己处理退出 |

提前 `process.exit` 的路径很多。读 `main` 时每看到一个 `exit`，问：此时有没有已经创建的 runtime 需要清理？多数一次性命令在创建 runtime 之前就走了；help/list-models 在创建之后，直接 exit，进程拆掉即可。

---

## 读完本文件你应该能指着源码说的

1. `pi` 如何从 `cli.ts` / `experimental/cli.ts` 进到 `main`。
2. 哪些 argv 根本不会创建 Agent。
3. 会话文件如何被选中，以及 cwd 可能因此改变。
4. `createRuntime` 闭包为什么要存在（换目录还要用同一套 CLI 选项）。
5. 三种 mode 的分流点在文件末尾，`prompt` 不在本文件。

## 下一个文件

`main` 已经反复用到路径常量和 `parseArgs`。先把这两个底座钉死，再进 SDK：

1. [05-config.ts.md](/series/pi-source/coding-agent/471-config-ts/) — `getAgentDir` / `APP_NAME` / 三种发行形态
2. [06-args.ts.md](/series/pi-source/coding-agent/472-args-ts/) — `Args` 和 `parseArgs`
3. 然后 [07-agent-session-runtime.ts.md](/series/pi-source/coding-agent/473-agent-session-runtime-ts/) — `main` 里那句 `createAgentSessionRuntime`
3. 然后 **`src/core/sdk.ts`**（`createAgentSession`，待写）
