---
title: "38 · footer.ts — 底栏：cwd、token、上下文"
summary: "不订 session 事件。InteractiveMode 在几乎每个事件里 footer.invalidate()，但本类的 invalidate 是空的——git 分支改由 FooterDataProvider 缓存，token 每"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/footer.ts`  
谁创建：InteractiveMode 构造；每次 render 由 tui 调 `render(width)`。

## 订阅什么

不订 session 事件。InteractiveMode 在几乎每个事件里 `footer.invalidate()`，但本类的 `invalidate` 是空的——git 分支改由 `FooterDataProvider` 缓存，token 每次 `render` 从 `session.sessionManager.getEntries()` **现场累加**。换肤/改宽时自然重算。

Provider 的 `onBranchChange` 让 InteractiveMode `requestRender`。

## 画什么

一行（窄屏可能折）：`~/proj (main) • sessionName` + `↑in ↓out Rcache Wcache CH% $cost` + 模型名 + thinking + `ctx 12.3% (auto)`。上下文未知（刚压缩完）显示 `?`。订阅制 provider（kimi-coding 或 `isUsingSubscription`）在价格后标 `(sub)`。扩展 `setStatus` 的短文本接在后面。实验特性开启时可能多一段标记。

`formatTokens`：<1k 原样，之后 `1.2k` / `12k` / `1.2M`。cwd 在 `$HOME` 下换成 `~`。

## 失败与边界

- 累加的是**全部 entries**（含压缩前），不是当前上下文窗口。上下文百分比另走 `session.getContextUsage()`。
- 控制字符从 extension status 里剥掉，防止底栏被 `\n` 撑破。

## 下一课

[39-status-indicator.ts.md](/series/pi-source/coding-agent/533-status-indicator-ts/)
