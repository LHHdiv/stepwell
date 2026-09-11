---
title: "16 · modes/index.ts — 四种运行皮的出口"
summary: "记住「皮」和「肉」的分界。肉是 AgentSession.prompt。皮只决定：键盘、stdout 文本、JSONL、还是 RPC。本文件自己没有逻辑。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/index.ts`（16 行）  
被谁调用：`main.ts`、`src/index.ts`（SDK）。

## 本课目标

记住「皮」和「肉」的分界。肉是 `AgentSession.prompt`。皮只决定：键盘、stdout 文本、JSONL、还是 RPC。本文件自己没有逻辑。

## 导出对照

| 导出 | 源文件 | `main` 何时用 |
|---|---|---|
| `InteractiveMode` | `interactive/interactive-mode.ts` | TTY 且不是 `-p` / json / rpc |
| `runPrintMode` | `print-mode.ts` | `-p` 或管道进来的 print |
| `runRpcMode` | `rpc/rpc-mode.ts` | `--mode rpc` |
| `RpcClient` | `rpc/rpc-client.ts` | SDK 宿主自己 spawn RPC 子进程 |
| `JsonAgentSessionEvent` | `json-event.ts` | json 模式和 RPC 的事件形状 |

`PrintModeOptions`、RPC 的 command/response 类型一并 re-export，避免 SDK 从深层路径 import。

## 和 print-mode 的关系

[10-print-mode.ts.md](/series/pi-source/coding-agent/476-print-mode-ts/) 已经精读过 print 皮。json 模式也走 `runPrintMode`，差别只在 `mode: "json"` 时用 `toJsonEvent` 写 stdout。交互皮比 print 多了整个 `modes/interactive/`。RPC 皮没有 TUI，但命令面比 print 宽（set_model、fork、bash…）。

## 下一课

[17-json-event.ts.md](/series/pi-source/coding-agent/489-json-event-ts/) — 为什么 JSON 线上不能带 `partial` 快照。
