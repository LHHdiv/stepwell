---
title: "37 · jsonl/repo.ts — 按 cwd 分目录的会话文件"
summary: "sessionDirectoryName 把绝对 cwd 编进文件夹名，list(cwd) 只扫一个目录。文件名时间来自 createdAt，同一毫秒靠 id。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/jsonl/repo.ts`  
被谁调用：experimental worker 打开用户会话目录。

## 布局

```text
{sessionsRoot}/--{cwd 把 /\: 换成 -}--/{ISO时间}_{encodeURIComponent(id)}.jsonl
```

`sessionDirectoryName` 把绝对 cwd 编进文件夹名，list(cwd) 只扫一个目录。文件名时间来自 createdAt，同一毫秒靠 id。

## 生命周期

`create`：解析 cwd 绝对路径、分配 id、`pendingCreates` 防并发同 id、写新文件、`publishOpenSession`（StorageBackedSession + onClose 从 `openSessions` 删除）。失败关掉 storage 并 force remove 文件。

`open`：已在 openSessions → throw。loadStorage（v4 或 v3）。

`list`：按 createdAt 降序，再 id、cwd。

`delete`：打开着的不能删；文件不存在 throw。

`fork`：源若已打开，把 **当前 nextSeq** 作为边界（课 38 `kind: "open"`），避免拷到 fork 开始后才 append 的事务。源关闭则扫到 EOF。目标 parentSessionId=源 id。失败删 dest 文件。

`close` repo：关掉所有 open storage。

## 所有权

`openSessions` 保证同一 cwd+id 进程内只一份可写 Storage。规范还要求跨进程单一 owner——JSONL 文件本身不强制 flock，由 session-worker 宿主保证。

## 失败与边界

cwd 编码可能碰撞（两个 cwd 替换后同名）——依赖「绝对路径 + 替换规则」在实践中唯一。id 的 encodeURIComponent 避免文件名特殊字符。

## 下一课

[38 · jsonl/fork.ts](/series/pi-source/agent/279-harness-session-jsonl-fork-ts/)：两遍扫描，不改源文件。
