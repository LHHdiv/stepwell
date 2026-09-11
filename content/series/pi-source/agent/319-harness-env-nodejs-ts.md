---
title: "78 · env/nodejs.ts — ExecutionEnv 的 Node 实现"
summary: "对照 FileSystem/Shell 合同：方法 catch 成 Result，不 throw。exec 是重头：spawn、超时、abort、OutputCapture、spill 背压。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/env/nodejs.ts`（约 900 行）  
从 `@earendil-works/pi-agent-core/node` 导出。

## 本课目标

对照 `FileSystem`/`Shell` 合同：方法 catch 成 Result，不 throw。exec 是重头：spawn、超时、abort、OutputCapture、spill 背压。

## 路径

`resolvePath`：`~`、`~/`、`file://`、相对 cwd。`absolutePath` 不要求存在、不跟 symlink。`fileInfo`/`listDir` 用 lstat。`canonicalPath` 用 realpath。errno → FileErrorCode。

`NodeTextLineReader`：逐行 UTF-8，保留 `terminated`。close best-effort。

写：mkdir 父目录、rename 原子替换。tmp 文件/目录用 os.tmpdir。

## `exec`

校验 timeout。cwd 必须存在否则 spawn_error 说明「不能跑 bash」。解析 shell（bash -lc / 或 stdin 传命令，Windows 另套）。`detached` 非 win32，便于杀进程树。

stdout/stderr → `OutputCapture.push`。spill：超限后建 `pi-output-*.log`，writeStream highWaterMark 8MB，背压时 pause stdio。abort/timeout：`killProcessTree`。exit 后等 stdio 100ms 再 settle。

`onUpdate` throw → callback_error 并杀进程。

`cleanup`：杀仍登记的 child pid，关 spill。

## 失败与边界

合同：永不 throw。实现里 spawn 前的同步错误也收进 Result。Windows 无 detached 进程组，杀树靠 pid 列表尽力。

## 下一课

utils：[79 · usage.ts](/series/pi-source/agent/320-harness-utils-usage-ts/)。
