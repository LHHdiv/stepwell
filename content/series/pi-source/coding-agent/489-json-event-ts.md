---
title: "17 · json-event.ts — 线上事件去掉累积快照"
summary: "理解 AgentSessionEvent 和 stdout JSON 不是同一个形状。流式 messageupdate 在内存里带着完整 partial 助手消息；管道对端不需要、也撑不住这份累积副本。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/json-event.ts`  
被谁调用：`print-mode.ts`（`--mode json`）、`rpc-mode.ts`（每条 session 事件）、`rpc-client.ts` 的监听类型。

## 本课目标

理解 `AgentSessionEvent` 和 stdout JSON 不是同一个形状。流式 `message_update` 在内存里带着完整 `partial` 助手消息；管道对端不需要、也撑不住这份累积副本。

## 在系统中的位置

```text
session.subscribe(event)
  toJsonEvent(event)
    json 模式 / RPC：JSON.stringify 后 writeRawStdout
```

## `JsonAgentSessionEvent`

除 `message_update` 外，和 `AgentSessionEvent` 同构。`message_update` 被换成：

```ts
{
  type: "message_update",
  usage: Usage,                    // 尺寸恒定
  assistantMessageEvent: ...       // 去掉 partial；toolcall_start 额外带 id/toolName
}
```

注释写得很清楚：`message_start` 给初值，delta 往上加，`message_end` 给最终权威消息。线上不需要每次 update 再附一份完整 assistant。

## `toJsonEvent`

1. 非 `message_update`：原样返回。
2. `message_update` 但 `message.role !== "assistant"`：抛错。产品层不允许这种事件。
3. `assistantMessageEvent.type === "toolcall_start"`：从 `partial.content[contentIndex]` 取出 toolCall，校验 `type === "toolCall"`，剥掉 `partial`，补上 `id`、`toolName`。调用方必须知道「哪个工具开始了」，但又不能把整个 partial 消息推出去。
4. 其它带 `partial` 的 delta：解构删掉 `partial` 再返回。

## 失败与边界

- 抛错会发生在订阅回调里。json/RPC 皮应把它当成协议 bug（contentIndex 对不上），而不是用户输入错误。
- `usage` 仍在每次 update 上。它是几个数字，恒定大小，给进度条用。
- 交互模式**不**走本文件。TUI 需要 `partial` 才能把流式 Markdown 画出来。

## 下一课

[18-rpc-types.ts.md](/series/pi-source/coding-agent/491-rpc-types-ts/) — stdin 命令和 stdout 响应的类型合同。
