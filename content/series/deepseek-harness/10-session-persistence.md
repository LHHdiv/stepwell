---
title: 第10讲·持久化与 fork：日志如何落盘、历史如何分身
summary: 拆解 storage 枢纽的后端契约、持久化插件的事件订阅模型，以及 fork 的边界与拒绝码。
objectives:
  - 描述 StorageBackend 的 facet 设计与"缺了就响亮失败"的解析策略
  - 解释持久化为何不写在 Session 内部而是事件订阅者
  - 说出 fork 的三种拒绝场景及 OPEN_TURN 背后的不变量
tags: [deepseek-harness, storage, fork]
keyPoints:
  - storage 枢纽定义后端契约（kv/table 等 facet），storage-json 与 storage-sqlite 是两个官方实现
  - Session 核心不含持久化——持久化是订阅 session/event 的普通插件
  - fork = 用 seed 重放父日志前缀创建新会话；seedLength 记录继承边界
  - 在未关闭的 turn 中间 fork 会被 OPEN_TURN 拒绝——分叉点必须落在完整轮次之间
---

上一讲的查询引擎把"实时 + 持久化"当成一个整体来读。本讲钻进另一半：**持久化是怎么接上去的**，以及会话系统最优雅的操作——**fork**。这两件事恰好体现了同一个设计信条：核心保持纯粹，能力挂在旁边。

## 一、storage 枢纽：一个契约，多个后端

`packages/storage/` 下有四个包，分工清晰：

- `storage-domain`：领域词汇；
- `storage`：枢纽本体，定义**后端契约**（贡献 `ctx.storage` 相关服务）;
- `storage-json` / `storage-sqlite`：两个官方后端实现。

打开 `storage/src/backend.ts`，契约的核心长这样：

```ts
export interface StorageBackend {
  /** 键值操作；此后端无法服务该数据形态时缺省 */
  readonly kv?: KvFacet
  /** 排空在途写入并释放介质。幂等 */
  close(): Promise<void>
}
```

这个设计的精髓在 `?` 号上。后端按"介质"划分所有权——一个后端管一个介质（一棵文件树根、一个数据库文件），它**可以只支持自己擅长的数据形态**：JSON 文件后端天然擅长键值，SQLite 后端还能伺候表格查询。某个 facet 缺席时怎么办？注释说："resolution fails loud instead"（解析时响亮地失败）——需要表格数据的消费者发现后端没有 table facet，当场报错，而不是得到一个行为诡异的降级实现。

还有两处细节透着严谨：单元名必须匹配 `UNIT_NAME_RE`（小写字母开头的安全标识符），保证它既能当文件名又能当 SQL 标识符段而无需转义——一个正则消灭一整类注入和路径穿越问题；`close()` 要求幂等且能处理并发调用（"并发和重复调用只在 teardown 完成后 resolve 一次"）——关停流程是最容易出竞态的地方，契约直接把它写死。

> 💡 **知识拓展：这种模式叫什么？**
> 面向能力的接口设计（capability-based interface）+ 六边形架构的端口思想：核心定义"我需要什么样的存储能力"（端口），任意实现只要满足契约就能插上（适配器）。测试时还能用内存假后端替换真后端——这正是 dsh 敢要求 100% 测试覆盖的物质基础之一。

## 二、持久化不在核心里

最容易误解的一点来了：翻遍 `core/session/src/index.ts` 的 1157 行，你找不到任何"写文件"或"写数据库"的代码。持久化去哪了？

源码里有一句关键注释：

> 持久化被有意地不在这里实现——持久化插件订阅 `session/event` 并在 `session/flush` 和 dispose 时刷盘。

回忆第 03 讲的事件系统：Session 每追加一条事件就广播 `session/event`；某个普通插件监听它，攒一批就在合适的时机（flush 信号或停机时）写入后端。**对核心来说，磁盘根本不存在**——它只管广播事实，谁爱听谁听。

这个解耦立刻兑现三个好处：

1. **核心可测试**：不需要 mock 文件系统就能测全部会话逻辑；
2. **后端可热插**：从 JSON 换 SQLite = 卸载一个插件挂另一个，核心无感知；
3. **策略可定制**：想要"每条都立即落盘"的偏执模式？想要"攒 5 秒批量写"的高性能模式？都是换个监听器的事。（第 06 讲提过的 `dsh-session-checkpoint-policy` 就是官方的检查点策略插件。）

甚至崩溃善后也是插件的活：第 06 讲那个"由持久层替崩溃孤儿补写 turn/end（reason: interrupted）"的机制，就发生在重载时的持久化一侧——核心循环永远不会发出这个标记。

## 三、fork：历史的分身术

现在看本讲第二主角。`ctx.sessions.fork()` 的签名（index.ts 第 1081 行）：

```ts
fork(source: SessionForkSource, boundary?: number, childSessionId?: SessionId): Session
```

语义：从源会话（活的 Session 对象或其 id）复制一份新会话，`boundary` 指定切到第几条事件为止。它的实现思路你可能猜不到——**不是复制字节，而是把父日志的前缀当作 seed（种子）重放给新会话**：

```text
父: [e1 e2 e3 e4 e5 e6]      ← 原封不动，继续活着
                ▲ boundary=4
子: [e1' e2' e3' e4'] [自己的新事件...]   ← e1'-e4' 是种子重放的副本
```

配合第 07 讲的头部字段食用：`parentSession` 记血统，`seedLength=4` 记"前 4 条是遗产"，还有一个专门的 `session/end-seed` 事件标记种子的结束位置（第 06 讲词汇表里那个 payload 为空、全靠位置表意的怪事件）。从此任何人都分得清孩子的"继承家业"和"自己奋斗"。

**但 fork 有脾气。** 源码定义了五种拒绝码，其中最有味道的是：

- `INVALID_BOUNDARY`：切分点必须是真实存在的连续 seq——不能凭空切在两条事件的缝隙里；
- **`OPEN_TURN`**：切分点落在还没关闭的轮次中间时拒绝。为什么？想想第 02 讲：turn 是"办一件事"的工作单元，半件事分出去，孩子继承的是一段连因果都不完整的悬案——工具调用了却没等到结果。**分叉只能发生在完整的轮次之间**，这条限制保护的是日志语义的自洽。

其余拒绝码也各有含义：源不存在（SESSION_NOT_FOUND）、源对象不是存储里的活跃实例（SESSION_NOT_LIVE——防止拿一个已被顶替的旧对象来 fork）、孩子 id 已被占用（SESSION_ALREADY_EXISTS）。每个错误都精确命名，调用方可以逐个处理——这也是 fail-loud 哲学在 API 层的延伸。

## 🔍 被否决的方案：把持久化接口折叠进 dsh-session？

Agent Note《fold-session-persistence-interface》（rejected）提议把独立的持久化 Service Definition 包并入 dsh-session，减少包数量。否决理由：那正是能力 seam 预期的模块化角色拆分，折叠虽省一个包，却会牺牲清晰的后端边界。——本章讲的分层不是教条，而是被正式审视过并被保住的决策；仓库里甚至有一篇《NIH 审计》笔记专门记录哪些“合并简化”被拒绝，以免后人从零重新争论一遍。

## 试一试

在仓库里搜 `session/end-seed` 的文档注释（types.ts 里那段超长的注释），找出它为什么强调"定位最后一条 end-seed 而不是第一条"？（提示：想象一个 fork 出来的会话再次被 fork，日志里会有几条 end-seed？）这道题想明白，你对种子机制的掌握就毕业了。

## 卷二小结 · 下一讲预告

卷二走完，你已经掌握了 dsh 的整个地基：Branded ID 的类型防线（10）、13 种事件的词汇表（11）、仅追加宪法的版本与失败哲学（12）、表层投影的增量缓存与运行时不变量（13）、跨会话查询引擎（14）、可插拔持久化与 fork 分身术（本讲）。

地基之上，心脏开始跳动。卷三第一讲我们拆 Agent 接口——那个只有五个动词、却被整个系统围绕的抽象，以及 `agent/pre-step` 瀑布背后"领取输入"的第一现场。
