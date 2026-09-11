---
title: "14 · session-resources.ts — 会话级资源回收钩子"
summary: "看清这是一个进程级的 cleanup 集合，不是会话对象上的方法。Codex 的 WS 连接按 sessionId 缓存在模块级 Map 里，必须有人在会话结束时通知它关掉。"
tags: [pi, ai]
---
源码：`packages/ai/src/session-resources.ts`  
被谁调用：`openai-codex-responses.ts` 注册 WebSocket 缓存清理；coding-agent 在会话切走 / 进程退出时调 `cleanupSessionResources(sessionId)`。

## 本课目标

看清这是一个**进程级**的 cleanup 集合，不是会话对象上的方法。Codex 的 WS 连接按 sessionId 缓存在模块级 Map 里，必须有人在会话结束时通知它关掉。

## 在系统中的位置

```text
openai-codex-responses 模块加载
  registerSessionResourceCleanup(closeOpenAICodexWebSocketSessions)

AgentSession 结束 / 换会话
  cleanupSessionResources(sessionId?)
    每个 cleanup(sessionId)
```

`sessionId` 有值：只关这一会话的连接。省略：关全部（进程退出）。

## API

`registerSessionResourceCleanup(cleanup)` 返回 unregister 函数。`Set` 去重按引用，同一函数注册两次仍是一次。

`cleanupSessionResources` 把每个 cleanup 的 throw 收进数组，全部跑完若有失败，抛 `AggregateError`。一个 Codex 清理失败不应跳过别人。

## 失败与边界

| 情况 | 行为 |
|---|---|
| cleanup throw | 记下来，继续；最后 AggregateError |
| 未注册任何 cleanup | no-op |
| 传入未知 sessionId | 各 cleanup 自己决定（Codex 是 Map.delete 不存在的 key，无事发生） |
| 测试重复 import | 模块级 Set 共享；测试应 unregister 或接受泄漏 |

这不是通用 DI。再加一种需要会话结束释放的传输（第二个 WS 厂家），也往这个 Set 注册即可，不必改 Agent。

## 下一课

扩展仍在用的旧 OAuth 回调类型：[15-compat-extension-oauth-types.ts.md](/series/pi-source/ai/076-compat-extension-oauth-types-ts/)。
