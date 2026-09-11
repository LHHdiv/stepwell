---
title: "76 · tools/bash.ts — 尾部截断、spill 全文、2s 打一次 checkpoint"
summary: "commandPrefix 拼在命令前（例如 source ~/.bashrc）。prepare(execution, toolContext, context) 可改 cwd/env/inheritEnv——沙箱扩展点。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/tools/bash.ts`

## 选项

`commandPrefix` 拼在命令前（例如 `source ~/.bashrc`）。`prepare(execution, toolContext, context)` 可改 cwd/env/inheritEnv——沙箱扩展点。

timeout 有限正秒，上限约 2^31 ms。

## execute

`env.exec` + capture tail 2000 行/50KB + spill。`onUpdate` 维护 view；每 2s 且 JSON 快照变化才 `{ checkpoint: true }`。live 更新更勤，磁盘 checkpoint 限速。

退出后：截断则在文本末加 Showing lines / 单行超限提示和 spillPath。`!result.ok`：timeout/aborted/其它 message，若已有输出则拼在前面，**throw**。非 0 exit 同样 throw（模型看到 isError）。0 则 `(no output)` 或文本。

`replay` 默认 never：跑着崩溃 → interrupted + 最近 checkpoint 输出，命令可能已产生副作用。

## 失败与边界

callback_error（onUpdate throw）由 Node env 杀掉进程。prepare throw 进 execute 失败。commandPrefix 让模型以为自己只发了后半——写审计日志应记完整 execution.command。

## 下一课

[77 · image.ts](/series/pi-source/agent/318-harness-tools-image-ts/)。
