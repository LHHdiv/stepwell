---
title: 第36讲·并发写安全：写入租约
summary: 多 lane 并发、多进程共存，会话仓库怎么不被写串？本讲看 pi 如何用"写入序列化"把并发写收敛成安全顺序。
objectives:
  - 说出会话仓库面临的两类并发写（lane 内并发、跨进程并发）
  - 解释为什么"harness 持有写入权威"能把 lane 并发收敛成串行
  - 把写入安全与第 18 讲 reduceLaneState、第 34 讲 SessionRepo 连起来
tags: [pi, 并发, 写入安全, 租约]
keyPoints:
  - "并发写有两类：同一会话内多 lane 同时产出（第 18 讲），与多个 pi 进程同时操作同一仓库"
  - "运行时节点的串行点在 reduceLaneState（reducer.ts:506）：多 lane 状态必须先归并，再统一落库"
  - "AgentHarness 对所属会话持有'写入权威'(逻辑租约)，外部写者都经它 funnel，避免各自乱写"
  - "跨进程安全由存储层负责：SQLite 事务 / 文件锁，具体实现封装在 SessionRepo（types.ts:361）之后"
  - "append-only 的 JSONL（第 24 讲）天然规避'读-改-写'竞态，是另一条并发安全路径"
---

第 35 讲让一段会话既能分叉、又能并发跑多 lane。但"并发"立刻带来危险：如果两条 lane 同时往同一个仓库写，会不会把对话历史写串、写丢？这一讲看 pi 怎么保证**写入安全**。

## 一、先结论：写入必须收敛成串行

并发写有两类来源：

1. **lane 内并发**：第 18 讲一个 harness 会话里多条 lane 同时产出 `TranscriptItem`，都要落库。
2. **跨进程并发**：你开了两个 pi 进程操作同一仓库（比如一个交互、一个 rpc），或评测框架并行跑多个 agent。

pi 的策略是：**所有写都先收敛成串行，再真正落盘**。具体靠两层闸门。

## 二、闸门一：运行时的 lane 归并

第一层在运行时。第 18 讲的 `reduceLaneState`（`packages/agent/src/harness/reducer.ts:506`）是 lane 状态合并的**唯一入口**——多条 lane 的局部增量，必须先经它归并成一份 `SessionState`，才谈得上"写"。

这意味着：即便两条 lane 在算，它们对仓库的"写入意图"也不会各自直冲存储层，而是先在 reducer 处排队归并。归并本身是顺序的（一次合并一个输入），于是"并发产出"被**串行化成一致的快照**。

更关键的是 ownership：`AgentHarness` 对自己所属的会话持有**写入权威**——它才是那个"能决定什么时候存盘"的角色。外部（TUI、扩展、别的进程）只能产生事件，不能直接改仓库。这个"权威"就是一把**逻辑写入租约（write lease）**：谁持有 harness，谁才能写。

## 三、闸门二：存储层的硬隔离

第二层在存储。当写请求终于到达 `SessionRepo`（`packages/agent/src/harness/session/types.ts:361`），底层实现负责真正的并发安全：

- **SQLite 实现**：用事务（transaction）+ 可能的文件锁，保证两个写操作不会交叉破坏数据库页。
- **JSONL 实现**（第 24 讲）：append-only 追加，每次写是"在文件尾加一行"，天然没有"读-改-写"竞态——你不用先读全文再覆写，所以两条并发追加也不会互相覆盖（由 OS/SQLite 的顺序写保证）。

> **知识拓展**："append-only 规避竞态"是日志结构存储（LSM、Kafka、Git）的共同智慧——把"修改"变成"追加"，就把最难的"原地更新一致性"问题消灭了。pi 的 JSONL 会话存储正是同一思路。

## 四、两层闸门如何配合

```
lane A 产出 item ─┐
                 ├─→ reduceLaneState 归并（串行点，reducer.ts:506）
lane B 产出 item ─┘         │
                           ▼
                  AgentHarness（持有写入租约）
                           │
                           ▼
                  SessionRepo.save（types.ts:361）
                           │
                           ▼
            存储层：SQLite 事务 / JSONL 追加（硬隔离）
```

上层把"并发"收敛成"一致的状态变更"，下层把"状态变更"安全地落到介质。职责清晰：harness 管"对不对"，存储层管"稳不稳"。

## 五、试一试

1. 在 `reducer.ts:506` 的 `reduceLaneState` 里看它是否对"同一 lane 重复输入"有幂等处理（Hint：搜 `laneId` 或 `seen`），推断重复事件会不会写重。
2. 在 `SessionRepo`（`types.ts:361`）的方法里找是否暴露了某种"加锁/事务"语义，还是把并发完全推给实现方。
3. 思考：如果两条 lane 都"通过工具改了同一文件"，归并后的快照该听谁的？这是状态合并问题还是写入安全问题？（提示：前者是语义冲突，后者是字节安全——pi 的写入租约管后者，前者需上层策略。）

## 下一讲预告

写入安全护住了"数据不坏"，但"系统为什么慢、哪一步出错"还得靠可观测性。下一讲回到遥测：看 `AI_TELEMETRY_SCHEMA` 如何把"埋点"做成契约，而非散落的 console.log。
