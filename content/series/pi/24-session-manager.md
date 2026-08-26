---
title: 第24讲·会话管理：SessionManager 与分支
summary: 会话不是跑完就丢——SessionManager 负责列出、加载、创建与分叉会话，把"时间"变成可回退、可并行的一等公民。
objectives:
  - 说出 SessionManager 承担的三类职责（列出/加载/分叉）
  - 解释"会话分支"解决什么问题，它和聊天历史有什么本质不同
  - 把 SessionManager 与第 18 讲 harness 的 lane / SessionState 连起来
tags: [pi, 会话管理, SessionManager, 分支]
keyPoints:
  - "SessionManager（session-manager.ts:855）是会话的'档案室'：负责列出、加载、创建会话，并提供分叉能力"
  - "静态方法 list（:1638）与 listAll（:1653）按目录枚举本地会话，支撑 UI 里的'继续上次对话'"
  - "会话底层持久化走 SessionRepo 抽象（agent/src/harness/session/types.ts:361），JsonlSessionRepo（jsonl/types.ts:20）是其中一种实现"
  - "分叉(fork)让同一会话从某个历史节点长出新支线，使'试错'不再破坏主线——这是聊天机器人没有的能力"
  - "SessionManager 之上就是第 18 讲 AgentHarness 的 SessionState，二者一持久一运行，合起来支撑跨进程会话"
---

聊天机器人跑完一轮就忘了；而 pi 把"一次对话"当成**可以存、可以读、可以分叉**的对象。这一讲的主角 `SessionManager`，就是管理这些对象的"档案室"。

## 一、先结论：SessionManager 是会话的目录管理员

`packages/coding-agent/src/core/session-manager.ts:855`：

```ts
export class SessionManager {
	// 负责会话的列出、加载、创建、分叉
}
```

它不直接持有对话内容（那在第 18 讲的 `SessionState` / `AgentHarness` 里），而是管理"**有哪些会话、它们在哪、怎么开新支线**"。核心职责三类：

1. **列出（list）**：扫描本地，告诉你有哪些会话可续。
2. **加载（load）**：把一个存量会话还原成可继续运行的 `AgentSession`。
3. **分叉（fork）**：从某个历史节点另开一条支线。

## 二、列出：让"继续上次对话"成为可能

看两个静态方法：

```ts
static async list(cwd: string, sessionDir?, onProgress?): Promise<SessionInfo[]> { ... }  // :1638
static async listAll(sessionDir?, onProgress?): Promise<SessionInfo[]> { ... }            // :1653
```

- `list` 针对某个 `cwd` 列出该项目下的会话；
- `listAll` 跨项目枚举全部。

这俩方法支撑了终端 UI 里"选择历史会话继续"的能力——你关掉 pi 再打开，之前的对话还在，正是因为 `SessionManager` 知道去哪找它们、并把元数据读出来给你挑。

## 三、持久化抽象：SessionRepo

会话内容怎么落盘？pi 没有硬编码"一定存成某格式"，而是走一个抽象 `SessionRepo`：

```ts
// packages/agent/src/harness/session/types.ts:361
export interface SessionRepo<...> {
	// 定义会话如何存、如何取、如何列
}
```

其中一种实现是 `JsonlSessionRepo`（见 `packages/agent/src/harness/session/jsonl/types.ts:20` 的 `JsonlSessionRepoOptions`）——把对话事件以 JSONL（每行一条记录）追加写入。这种"只追加"的格式天然适合会话这种**顺序增长、偶尔要回放**的数据。

> **知识拓展**：为什么用 JSONL 而不是一个大 JSON？因为会话可能很长，每次都重写整个文件既慢又容易写崩。JSONL 让"追加一条新消息"是 O(1) 的磁盘操作，且中途崩溃最多丢最后一行，不会损坏整段历史。配合第 37 讲要讲的写入租约，能保证并发安全。

## 四、分叉：把"试错"变成低风险操作

`SessionManager` 最有意思的能力是**分叉（fork）**。普通聊天机器人只有一条线性历史；pi 允许你从某个历史节点"长出新支线"：

- 主线：你让 agent 用方案 A 重构模块。
- 分叉：从历史某点另开一条线，让 agent 用方案 B 试试，主线毫发无损。

这和第 18 讲讲的 `lane`（泳道）概念遥相呼应：运行时里，并发的工作线程叫 lane；持久化层里，同一会话的多个探索方向就是分支。**运行态的并发与持久态的分叉，是同一思想的两种尺度。**

> **一句话总结**：`SessionState` 管"这一次运行长什么样"，`SessionManager` 管"历史上有哪些次运行、怎么续、怎么分叉"。一个负责活着的当下，一个负责可回放的时间。

## 五、试一试

1. 在 `session-manager.ts` 里搜 `fork` 或 `branch`，看分叉时底层是复制文件还是新建引用（Hint：看它是否调用了 `SessionRepo` 的某个方法）。
2. 打开 `agent/src/harness/session/jsonl/types.ts:20`，看 `JsonlSessionRepoOptions` 需要哪些参数（文件路径？压缩？），推断它怎么定位一个会话的存储位置。
3. 思考：如果同一个会话被两个 pi 进程同时加载并分叉，会发生冲突吗？结合第 37 讲"写入租约"的伏笔，预判 pi 会如何规避。

## 下一讲预告

会话说到底要"跨进程"——本地 agent 跑着，受信任的"大脑"在另一进程。为什么 pi 非要把自己拆成两个进程？下一讲进入**信任边界**：client/server 分离的真正动机。
