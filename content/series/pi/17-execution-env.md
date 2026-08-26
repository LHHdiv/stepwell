---
title: 第17讲·ExecutionEnv 与 node 适配
summary: 把"读文件、跑命令"抽象成 ExecutionEnv 接口，NodeExecutionEnv 是本地实现；换实现即换沙箱或远程执行，工具代码一行不动。
objectives:
  - 说清 ExecutionEnv 由哪两组能力（FileSystem + Shell）组成
  - 解释为什么文件/命令执行要抽象成接口而非直接 import node:fs
  - 描述 NodeExecutionEnv 之外还能有哪些替身实现
tags: [pi, execution-env, 沙箱]
keyPoints:
  - ExecutionEnv（harness/types.ts:315）= FileSystem（:231）∪ Shell（:304），是 harness 跑工具时的"世界接口"
  - 所有文件/命令操作都返回 Result<T, E> 而非抛异常，失败被编码进值（harness/types.ts:228 的契约）
  - NodeExecutionEnv（harness/env/nodejs.ts:347）用 node:fs/node:child_process 落地这套接口，是默认本地实现
  - 抽象动机：同一套工具代码在本地、Docker 沙箱、远程容器里都能跑，只需换 ExecutionEnv 实现
  - node.ts（:1）只做一行再导出，说明"node 适配"是可选子入口，core 主体不耦合 Node 运行时
---

工具要读文件、要跑 shell，`StreamFn` 管的是"怎么调模型"，那"工具怎么动文件系统、怎么执行命令"由谁管？这一讲看 `ExecutionEnv`——pi 把"工具脚下的那片土地"也抽象成了接口。和 `StreamFn` 一样，这是 pi"边界可插拔"哲学在另一个维度的体现。

## 一、ExecutionEnv：工具眼中的"世界接口"

定义集中在 `packages/agent/src/harness/types.ts:315`：

```ts
/** Filesystem and process execution environment used by the harness. */
export interface ExecutionEnv extends FileSystem, Shell {}
```

它 = `FileSystem` + `Shell` 两个能力接口的并集。拆开看：

```ts
export interface FileSystem {            // harness/types.ts:231
	cwd: string;                                  // 当前工作目录
	readTextFile(path, signal?): Promise<Result<string, FileError>>;
	writeFile(path, content, signal?): Promise<Result<void, FileError>>;
	listDir(path, signal?): Promise<Result<FileInfo[], FileError>>;
	exists(path, signal?): Promise<Result<boolean, FileError>>;
	createTempDir(prefix?, signal?): Promise<Result<string, FileError>>;
	// … 共十几个文件操作方法 …
	cleanup(): Promise<void>;
}

export interface Shell {                 // harness/types.ts:304
	exec(command, options?): Promise<Result<{ stdout; stderr; exitCode }, ExecutionError>>;
	cleanup(): Promise<void>;
}
```

**一句话定义**：`ExecutionEnv` 是工具代码能接触的"整个世界"——能读哪些文件、能在哪跑什么命令。工具不直接 `import` 任何操作系统 API，只通过 `env.readTextFile(...)`、`env.exec(...)` 与世界交互。

## 二、为什么是接口，而不是直接 import node:fs

如果工具的代码里直接写 `import { readFile } from "node:fs"`，就绑死了 Node 运行时，也绑死了"当前真实机器"。pi 偏要把它抽成接口，两个硬理由：

1. **错误必须"编码进值"而非抛异常**。注意所有方法返回的都是 `Result<T, E>`，接口注释（`harness/types.ts:228`）白纸黑字：**"Operation methods must never throw or reject. All filesystem failures … must be encoded in the returned `Result`."** 这让工具逻辑可以 `if (err) …` 优雅地处理"文件不存在""权限不足"，而不必到处 `try/catch`。`Shell.exec` 也返回带 `ExecutionError`（含稳定 `code`：`aborted`/`timeout`/`spawn_error`…，见 `:157`）的结果，跨后端错误码一致。
2. **可替换的执行场地**。同一份"读文件再总结"的工具，在本地机器、在 Docker 沙箱、在远程容器里都能跑——只要给一个对应的 `ExecutionEnv` 实现。工具代码一行不动。

> **知识拓展**：`ExecutionError.code`（`harness/types.ts:158`）是一组"后端无关"的枚举：`aborted`/`timeout`/`shell_unavailable`/`spawn_error`/`callback_error`/`unknown`。无论底层是 Node 的 `spawn` 还是某个远程 gRPC 执行器，抛给上层的都是这套稳定码。工具据此决定"重试还是放弃"，而不是去解析各家运行时的_errno_。

## 三、NodeExecutionEnv：默认的本地实现

落地在 `packages/agent/src/harness/env/nodejs.ts:347`：

```ts
export class NodeExecutionEnv implements ExecutionEnv {
	// 内部用 node:child_process 的 spawn、node:fs/promises 的各类方法实现接口
	async exec(command, options?): Promise<Result<{ stdout; stderr; exitCode }, ExecutionError>> {
		// 用 spawn 起子进程，按 timeout/abortSignal 管理生命周期，
		// 把异常翻译成 ExecutionError(code)
	}
	async readTextFile(path, signal?): Promise<Result<string, FileError>> { /* … */ }
	// … 其余 FileSystem 方法逐个用 node:fs 实现 …
}
```

它就是把 `node:fs`、`node:child_process` 的能力"翻译"成 `ExecutionEnv` 接口。比如 `exec` 内部用 `spawn` 起进程，处理 `timeout`（`:38` 的 `resolveTimeoutMs`）、`abortSignal`、stdout/stderr 分块回调（`ShellExecOptions.onStdout`，`types.ts:298`），最后把任何崩溃包成稳定的 `ExecutionError`。

而 `packages/agent/src/node.ts:1` 只有一行：

```ts
export { NodeExecutionEnv } from "./harness/env/nodejs.ts";
```

这一行很有信息量：**`node` 适配是独立的子入口**（`packages/agent/package.json:13` 的 `"./node"` 导出）。core 主体不 `import` Node 运行时，只有当你显式 `import "@earendil-works/pi-agent-core/node"` 时，才把 `NodeExecutionEnv` 拉进来。于是同一份 `pi-agent-core` 既能被 Node 用，也能被任何提供自有 `ExecutionEnv` 的环境用（比如浏览器、边缘运行时、测试桩）。

## 四、替身实现：沙箱与远程

`ExecutionEnv` 是接口，意味着无限替身。举几个 pi 天然支持的（或容易实现的）：

- **沙箱实现**：`FileSystem` 的所有路径方法落到一个容器内的 overlay 文件系统，`Shell.exec` 的 `command` 在受限 namespace 里跑。工具代码无感——它仍调 `env.readTextFile`，只是读到的是沙箱里的副本。这正是第 25–28 讲"信任边界"的延伸：危险命令在沙箱里炸，不波及宿主。
- **远程/容器实现**：`exec` 通过 SSH 或 gRPC 把命令发到远程 worker，`readTextFile` 走远程文件服务。对工具而言，世界就是那台远程机。
- **测试桩（testing）**：`packages/agent/session/testing` 入口暗示存在测试版 `ExecutionEnv`——让单测在内存文件系统上跑工具，不碰真实磁盘。

> **对比第 16 讲**：`StreamFn` 抽象"模型从哪来"，`ExecutionEnv` 抽象"工具脚下的土地从哪来"。两个接缝一上（模型）一下（执行），把 `pi-agent-core` 包的"零外部依赖"贯彻到底——它定义接口，具体实现由宿主按场景注入。

## 试一试

打开 `packages/agent/src/harness`：

1. 看 `types.ts:228` 那段"must never throw or reject"契约。如果 `NodeExecutionEnv.readTextFile` 在文件不存在时直接 `throw`，哪个上游代码会很难写？（提示：工具里要判"文件是否存在"时。）
2. `node.ts:1` 只再导出 `NodeExecutionEnv`。如果要在浏览器里跑 pi 的工具，你大概率需要提供什么？（提示：`FileSystem` + `Shell` 两个接口的方法清单在 `types.ts:231` 与 `:304`。）
3. `Shell.exec` 返回的 `ExecutionError.code`（`types.ts:158`）为什么要做成稳定枚举、而不是透传 Node 的 `errno`？跨沙箱/远程实现时这带来什么好处？

## 下一讲预告

`Agent` 是内存里的运行时，进程一关对话就没了。但 pi 还有一层更重的"持久会话主机" `AgentHarness`（`harness/agent-harness.ts:305`）：它把对话存进可恢复的 `SessionState`（`session/state.ts:50`），还能用 `reduceLaneState`（`reducer.ts:506`）把并发 lane 合并成一份快照。下一讲收尾卷三。
