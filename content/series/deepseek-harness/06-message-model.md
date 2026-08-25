---
title: 第06讲·SessionEventMap：会话日志的完整词汇表
summary: 逐条精读 13 种会话事件：谁持久化、谁进模型历史、谁只给 UI 看，以及背后的取舍。
objectives:
  - 背下 SessionEventMap 的全部事件并按"三类消费者"归类
  - 说清 assistant/chunk 与 assistant/message 各自存在的理由
  - 理解 TurnEndReasonMap 的"合并可扩展"设计与声明合并的关系
tags: [deepseek-harness, session, 数据模型]
keyPoints:
  - 会话日志共 13 种事件，消费者有三类：模型（派生历史）、UI（回放渲染）、运维（审计排查）
  - assistant/chunk 保回放保真；assistant/message 是派生历史用的完整回复，token 账单随行
  - tool/call 存原始 arguments 字符串不解析——日志忠实于模型的原始输出
  - todo/write、request/header 是 log-only 事件：写进日志，但永远不进模型视野
---

第 02 讲我们看过消息的一生，其中反复出现 `user/message`、`assistant/chunk`、`tool/result` 这些名字。它们全部定义在一个地方——`packages/core/session/src/types.ts` 的 **SessionEventMap** 接口。这个接口是整个 dsh 的词汇表：**系统里发生过的一切，都必须用它来陈述**。今天逐条精读它。

## 一、先看全貌：13 个事件与三类消费者

把源码里的 13 种事件整理成一张表（按出现顺序）：

| 事件 | 记录什么 | 进模型历史？ |
|---|---|---|
| `turn/start` / `turn/end` | 轮的开关 + 结束原因 | ❌ 边界标记 |
| `step/start` / `step/end` | 步骤的开关 | ❌ 边界标记 |
| `user/message` | 用户角色消息（人话、注入上下文、目标续跑） | ✅ |
| `assistant/chunk` | 流式碎片（token 级） | ❌ 保真用 |
| `assistant/message` | 组装完成的助手回复 | ✅ |
| `tool/call` | 模型发起的一次工具调用 | ✅（经投影） |
| `tool/result` | 工具执行结果 | ✅ |
| `todo/write` | 待办清单全量快照 | ❌ log-only |
| `request/header` | 下一次请求的完整头部快照 | ❌ log-only |
| `request/context` | 模型路由元数据（变更时才记） | ❌ log-only |
| `session/end-seed` | 种子历史的结束标记 | ❌ 生命周期标记 |

右列就是第 02 讲埋下的伏笔——**不是所有日志事件都会被模型看到**。事实上每个事件的读者不止一个，准确说有三类：

1. **模型**：只看投影后的历史（下一讲细讲怎么投影）；
2. **UI**：要原样回放给你看——连打字机效果的每个 chunk 都不能丢；
3. **运维/调试**：出问题时翻日志找真相，需要 request/header 这类工程细节。

一个事件该不该存在、该给谁看，dsh 的判断标准只有一条：**这个事实需要在重新加载后依然存在吗？** 需要，就进 SessionEventMap。

## 二、三个消息事件的精读

**`user/message`——一个类型，三种来源。** 源码注释明确列出：直接的人类输入（本轮领取的那条）、合成的 `agent.inject()` 上下文（文件变更通知、子目录 AGENTS.md、skill 内容、cron 通知……）、目标续跑轮次。三者都原样投影 content，靠可选的 `source` 字段区分。注意这个设计的含义：**对模型来说，"系统塞给你的上下文"和"用户说的话"长同一个样子**——这是刻意为之，模型天然信任 user 角色的内容。

**`assistant/chunk` 与 `assistant/message`——为什么一条回复记两遍？**

```ts
'assistant/chunk': { turn: number; step: number; chunk: StreamChunk }
'assistant/message': { turn: number; step: number;
  message: AssistantMessage; usage?: TokenUsage; interrupted?: true }
```

chunk 是流式传输中飞回来的每个 token 碎片，记录它纯粹为了**回放保真**——UI 重演打字机效果时不需要重新请求模型。而 message 是组装完成的完整回复，是派生历史的真正来源。两个细节值得咀嚼：

- `usage` 和 message 放在一起：token 消耗账单跟着产出它的回复走，不存在单独的用量表——**数据跟事实同居，不另立账本**；
- `interrupted?: true` 标记被打断的前缀：回合中途取消时，已送达的文字仍以 message 事件落盘，这个标记让系统不必"从轮次边界反推哪里断的"。宁可多存一个布尔值，也不留需要推理的模糊地带。

**`tool/call`——忠实到"不解析"的程度。** 注意字段定义：`arguments` 是**原始 JSON 字符串，模型产出的样子就存的样子**。为什么不解析成对象再存？因为解析可能失败、可能有损——而日志的第一美德是忠实。解析是消费方的事，记录不是。

## 三、TurnEndReasonMap：为扩展预留的"活字典"

轮次怎么结束的？源码用一个映射接口而不是联合类型：

```ts
/** 为什么一个 turn 结束了。合并可扩展的和类型。 */
export interface TurnEndReasonMap {
  completed: { kind: 'completed' }
  aborted:   { kind: 'aborted'; reason: TurnEndCancelCause }  // user/parent/hook/disposed
  blocked:   { kind: 'blocked' }
  error:     { kind: 'error'; error: LlmFailure }
  'max-tokens': { kind: 'max-tokens' }
  interrupted:  { kind: 'interrupted' }   // 崩溃恢复时由持久层补写
}
export type TurnEndReason = TurnEndReasonMap[keyof TurnEndReasonMap]
```

为什么不直接写 `type TurnEndReason = A | B | C`？因为插件要能**添加新的结束原因**。TypeScript 的声明合并允许任何包 later 声明 `interface TurnEndReasonMap { myReason: ... }`，新变体自动并入联合类型——这就是注释里 "merge-extensible"（合并可扩展）的含义。还记得第 03 讲说的"一切皆插件"吗？连"轮次为什么结束"这个枚举都是开放的。

> 💡 **知识拓展：可辨识联合（discriminated union）**
> 注意每个变体都有一个字面量 `kind` 字段。这让 switch 判断变得既安全又智能：
> ```ts
> switch (reason.kind) {
>   case 'completed': ...   // 这里 TS 自动收窄 reason 为 completed 变体
>   case 'error': reason.error  // ✅ 只有 error 变体才有 error 字段
> }
> ```
> 这是 TS 处理"多种情况"的标准姿势，比 if-else 链 + 类型断言优雅得多。SessionEvent 本身也是同样的结构（`type` 字段做判别），第 08 讲的投影函数就靠它逐个收窄。

还有一个容易被忽略的事件值得点名：`interrupted` 这个结束原因**永远不会由循环自己发出**，它是持久化后端在崩溃恢复时"替死者补写的死亡证明"——崩溃前那些事件完好保留，只是缺一个 turn/end，重载时由后端补上。系统对自己崩溃方式的想象，都写进了类型定义里。

## 🔍 被否决的方案：不存 chunk 只存完整消息？

Agent Note《assembled-assistant-messages-only》（状态：rejected）曾正式提案停止持久化 assistant/chunk——理由听起来很充分：派生历史只用 assistant/message，chunk 让 JSONL 日志被微小增量淹没、快照场景被迫“对分片事件分组来模拟模型”。否決理由一针见血：高保真回放、失败流的部分输出、快照确定性都依赖 chunk，“只有具备无信息损失的回放替代方案后，才能删除分片”。你在本章看到的“一条回复记两遍”，是信息保真与存储体积博奕后的胜者——而且赢的理由写得明明白白。

## 试一试

打开 `packages/core/session/src/types.ts`，找到 `TodoItem` 接口。它故意没有 id 和 priority 字段——读读上面的注释，用一句话回答：为什么每次写入都要全量替换整个清单，而不是增量更新单条？（答案就在注释里，这也是在练"读官方注释"的肌肉。）

## 下一讲预告

词汇表齐了，但"词"要变成"宪法"才能治理系统。下一讲我们看这套仅追加日志的铁律：格式版本如何演进、`ignorable` 标记背后的失败哲学，以及那句刻在代码里的原则——宁可拒绝重建，也绝不静默丢失。
