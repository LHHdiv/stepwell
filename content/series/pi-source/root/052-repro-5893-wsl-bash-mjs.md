---
title: "48 · repro-5893-wsl-bash.mjs — 在 Windows 上复现 issue 5893"
summary: "issue 5893 是：coding-agent 的 bash 工具在通过 C:\\Windows\\System32\\bash.exe（WSL 启动器）跑命令时，把 $name 这类 shell 变量错误展开或吃掉。本文件用产品自己的 "
tags: [pi, root]
---
源码：`scripts/repro-5893-wsl-bash.mjs`  
被谁调用：人在 **Windows 原生** PowerShell/CMD 里 `node scripts/repro-5893-wsl-bash.mjs`。不是 CI（ubuntu runner 会立刻 throw）。不是 `npm test`。

## 本课目标

issue 5893 是：coding-agent 的 bash 工具在通过 `C:\Windows\System32\bash.exe`（WSL 启动器）跑命令时，把 `$name` 这类 shell 变量错误展开或吃掉。本文件用产品自己的 `createBashTool(cwd, { shellPath })` 跑两例，期望 stdout 精确等于：

```text
Hello, World!
Iteration 1 of 3
...
```

命令字符串在 JS 里写成 `"Hello, ${nameExpansion}!"` 而 `nameExpansion = "$" + "{name}"`，避免 **本文件被 JS 模板先展开**。这是双层转义教学：JS 一层，bash 一层。AGENTS.md「别把多行脚本塞进 bash 工具参数」和这里是同一类坑。

## 在仓库中的位置

```text
assert process.platform === "win32"     否则 throw（不要在 macOS 或 WSL 内部跑）
assert existsSync("C:\\Windows\\System32\\bash.exe")
createBashTool(process.cwd(), { shellPath })
  execute 简单变量
  execute for-loop 变量
```

直接 import `packages/coding-agent/src/core/tools/bash.ts`。跑的是源码工具实现，不是 bundle。需要能按根 tsconfig 解析，或 node 能加载 TS（取决于你怎么调：`node --experimental-strip-types` 或 tsx）。文件是 `.mjs` 却 import `.ts`——在仓库里通常用 tsx 跑，或 Node 22 strip。直接 `node scripts/repro-5893-wsl-bash.mjs` 在未开 strip 时会失败。这是维护者夹具的粗糙处。

`getTextOutput` 只拼接 `content.type === "text"` 的块，和工具结果的真实形状对齐。

## 关键逻辑

为什么必须「Windows 上调 bash.exe」而不是「在 WSL 里跑」？WSL 内部的 bash 是正常 Linux bash，5893 的转义发生在 **Win32 启动器如何把命令行递给 WSL**。在 macOS 上绿不能证明修了 5893。

失败会怎样：

- 非 win32：throw，提醒你环境不对
- 没装 WSL：throw not found
- 回归：output !== expected，throw 带 Expected/Actual。这就是「修没修好」的定义
- 不进 test.sh：Linux CI 永远不跑它。回归要靠 Windows 维护者或以后的 Windows CI job。注释/issue 号把责任钉在 5893

## 和启动链的关系

不启动 CLI。它实例化默认工具之一。课表读到 `core/tools/bash.ts` 时，用本文件当「Windows 路径的可执行规格」。

## 下一课

从这里开始是会话 JSONL 的离线分析家族，先看最简单的花费统计：[49-cost.ts.md](/series/pi-source/root/053-cost-ts/)。
