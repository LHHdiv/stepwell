---
title: "21 · session/index.ts — 会话层对外出口"
summary: "把 session 子目录的地图钉在一页。后面每课对应一个实现文件，本课只当目录。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/index.ts`  
被谁调用：包默认入口 `export * from "./harness/session/index.ts"`；`package.json` 的 `./harness/session` 子路径。

## 本课目标

把 session 子目录的地图钉在一页。后面每课对应一个实现文件，本课只当目录。

## 导出分组

| 来源 | 符号 |
|---|---|
| `commit.ts` | `insertEntry` / `insertUsage` / `prepareStorageCommit` / `validateCommittedWrites` 及 CommittedWrite 类型 |
| `fork.ts` | `createForkSnapshot` |
| `fork-policy.ts` | `projectForkCurrentStateWrite`、`ForkCurrentStatePlan` |
| `jsonl/index.ts` | `JsonlSessionRepo`、版本常量、JSONL metadata 类型 |
| `memory.ts` | `MemorySessionRepo` |
| `session.ts` | `StorageBackedSession` 和 Session*Error |
| `types.ts` | Storage / Session / OperationState / Entry … |
| `values.ts` | `value()` / `setValue` / `branchTip` 等地址 |

**不**从这里导出 `testing/`。测试夹具走 `@earendil-works/pi-agent-core/harness/session/testing`。

## 和 Agent 会话的差别

coding-agent `SessionManager` 写的是产品 JSONL（v3 消息流）。harness 的 Session 是 **三仓库**：entries 树、values/lists、usage ledger。同一份磁盘格式（jsonl v4）可以表达操作状态机；v3 打开时会在第一次 commit 升级。

## 下一课

[22 · session/types.ts](/series/pi-source/agent/263-harness-session-types-ts/)：13 个 operation 叶子和 Storage 接口。这是 harness 里最值得当字典用的文件。
