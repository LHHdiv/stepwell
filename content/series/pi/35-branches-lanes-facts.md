---
title: 第35讲·分支、泳道与快照
summary: 一段会话不只是线性的。pi 用 branch（分叉）、lane（并发线）、snapshot（快照）三个概念把"时间"与"并行"都做成一等公民。
objectives:
  - 区分 branch（历史分叉）与 lane（并发工作线）各自解决什么问题
  - 说出 SessionSnapshot 如何把多 lane 的状态聚合成一个可序列化时刻
  - 把 branch/lane/snapshot 与第 18 讲 harness、第 24 讲 SessionManager 连起来
tags: [pi, 持久化, 分支, 泳道, 快照]
keyPoints:
  - "branch（分支）来自第 24 讲 SessionManager 的 fork：从历史某点另开一条探索线，不破坏主线"
  - "lane（泳道）是第 18 讲 harness 里的并发工作线，reduceLaneState（reducer.ts:506）把多 lane 合并成一份状态"
  - "SessionSnapshot（protocol schemas.ts:241）是一个时刻的会话全貌：聚合所有 lane 的 TranscriptItem"
  - "TranscriptItem（schemas.ts:193）是最小单元，branch/lane/snapshot 都是在它之上组织的'视图'"
  - "三者让会话既能'回到过去试别的路'(branch)，又能'同时跑多条线'(lane)，还能'随时存盘'(snapshot)"
---

第 34 讲把会话存进了仓库。但"一段会话"不是一条单调的时间线——你可能想"回到三小时前试另一条路"，也可能想"同时让 agent 干两件不冲突的事"。这一讲看 pi 用来表达这些能力的三个概念：**branch、lane、snapshot**。

## 一、先结论：三个维度刻画一段会话

| 概念 | 维度 | 解决什么 |
|---|---|---|
| branch（分支） | 时间上的"另选路径" | 试错不破坏主线，可回退 |
| lane（泳道） | 并行上的"多条工作线" | 一次会话内并发推进不冲突的任务 |
| snapshot（快照） | 时刻上的"全貌定格" | 把当前所有状态序列化，可存盘/恢复 |

三者都建立在同一个最小单元上：**`TranscriptItem`**（第 10 讲 `protocol/schemas.ts:193`）——对话里的一条消息、一次工具调用、一个事件。branch/lane/snapshot 只是对这堆 item 的不同**组织视图**。

## 二、branch：时间旅行式试错

branch 的源头是第 24 讲的 `SessionManager.fork`——从历史某节点"长出新支线"。

- 主线：agent 用方案 A 重构模块。
- 分支：从同一节点另开一条线，让 agent 试方案 B，主线毫发无损。

这把"试错"从"破坏性操作"变成"低风险探索"。聊天机器人没有 branch，你每改主意就得开新对话、丢上下文；pi 的 branch 让**同一段上下文能长出多个平行未来**，随你切换。

## 三、lane：一次会话内的并发

lane 来自第 18 讲的 harness。一个 `AgentHarness` 会话里，可以并发跑多条工作线（lane）——比如一边让 agent 写代码，一边让另一个 lane 跑测试。

`reduceLaneState`（`packages/agent/src/harness/reducer.ts:506`）负责把多条 lane 的局部状态**合并**成一份统一状态：

```ts
function reduceLaneState(...): SessionState {
	// 把各 lane 的增量合并，产出一致的 SessionState
}
```

注意 branch 和 lane 的区别：
- **branch 是"历史的平行"**——两条线不会同时活，你选一条走；
- **lane 是"当下的并行"**——多条线同时跑，由 reducer 归并。

一个像 Git 的分支，一个像并行任务队列。pi 同时给了你两者。

## 四、snapshot：把一切定格

`SessionSnapshot`（`protocol/schemas.ts:241`）是某个时刻的会话全貌——它聚合了**所有 lane** 的 `TranscriptItem`，形成一个可序列化、可落盘的对象。

这正是第 34 讲仓库存的东西：仓库不存"过程"，存的是一个个 `SessionSnapshot`（以及构成它的 item 流）。当你"恢复会话"，本质是把某个 `SessionSnapshot` 读出来，重建出 `SessionState`（第 18 讲 `harness/session/state.ts:50`），agent 接着往下跑。

> **一句话总结**：`TranscriptItem` 是砖，`lane` 是同时砌的几堵墙，`branch` 是同一块地基上另起的楼，`snapshot` 是某刻整个工地的全景照片。三者合起来，会话既是线性的、又是可回溯、可并行的。

## 五、和全系列的咬合

回顾：

- 第 18 讲 `AgentHarness` + `reduceLaneState`：运行时的 lane 归并；
- 第 24 讲 `SessionManager.fork`：持久化的 branch；
- 第 34 讲 `SessionRepo`：把 `SessionSnapshot` 存进 SQLite；
- 本讲：把 branch/lane/snapshot 这三个概念统一到第 10 讲的 DTO 上。

从"运行时的并发"到"持久态的分叉"到"可序列化的快照"，pi 用一套一致的词汇贯穿始终。

## 六、试一试

1. 在 `protocol/schemas.ts:241` 的 `SessionSnapshot` 里看它引用了哪些字段（Hint：是否含 `lanes`？`items`？`createdAt`？），推断一个快照如何表达"多 lane"。
2. 在 `reducer.ts:506` 的 `reduceLaneState` 里看合并时发生冲突（两条 lane 改了同一文件）怎么处理，是"后者覆盖"还是"报错"？
3. 思考：branch 和 lane 都制造"多个可能状态"。如果要从一个 branch 的某个 snapshot 再开 lane，数据模型能否自然表达？（提示：snapshot 是 lane 的聚合，branch 是 snapshot 的序列。）

## 下一讲预告

branch/lane/snapshot 让会话既并行又可回溯，但也带来一个新风险：多个写者同时落库，会不会写串？下一讲看 pi 如何用"写入序列化"保证并发安全。
