---
title: "28 · fork-policy.ts — 拷贝哪些当前值，丢掉哪些操作态"
summary: "fork 不是「把文件复制一遍」。对话树可以整棵或一条祖先链；正在跑的 operation、pending、result、usage 一律不拷。新会话是 idle 的。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/fork-policy.ts`  
被谁调用：`createForkSnapshot`、`InMemoryStorageState.createFork`、JSONL `projectJsonlForkWrite`。

## 本课目标

fork 不是「把文件复制一遍」。对话树可以整棵或一条祖先链；**正在跑的 operation、pending、result、usage 一律不拷**。新会话是 idle 的。

## `selectBranchFork`

从 source.tip 沿 parent 走到根。找到 `entryId`（默认 tip）：

- `position !== "before"`：destinationTip = 该 entry，并 select 它
- `position === "before"`：destinationTip = 它的 parent，不 select 它本身
- 比它更老的祖先全部 select

entry 不在该分支上 → throw。缺 parent 链接 → throw（树损坏）。

## `projectForkCurrentStateWrite`

| namespace | 行为 |
|---|---|
| `pi.session.name` | 拷 |
| `pi.entry.label` | 仅当 entry 被拷 |
| `pi.branch.tip` | tree：全拷；branch：只改所选 branch 的 tip 为 destinationTip |
| `pi.lane.config` | tree 全拷；branch 只拷该 lane |
| `pi.lane.state` | 同上，但 **值改成 idle**（current/last operation null，inbox []） |
| `pi.result` | 丢 |
| `pi.op.*` / `pi.pending.*` | 丢 |
| 其它 `pi` / `pi.*` | throw 未知保留名 |
| 应用 namespace | 仅 tree scope 拷；branch fork 丢掉（避免半份应用状态） |

## 失败与边界

branch fork 要求源是 **配置过的 AgentLane**（有 config+state），纯数据分支不能当 fork 源——`createForkSnapshot` 另检。未知 `pi.foo` 宁可炸也不默默丢，防止以后加地址却忘了更新策略。

## 下一课

[29 · fork.ts](/series/pi-source/agent/270-harness-session-fork-ts/)：内存快照上跑一遍政策。
