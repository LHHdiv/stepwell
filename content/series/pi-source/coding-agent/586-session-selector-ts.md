---
title: "66 · session-selector.ts — /resume 会话列表"
summary: "无 session 事件。异步 SessionManager.list / listAll 带 onProgress，header 显示 loaded/total。键盘：搜索、切 current/all cwd、切排序、只看已命名、重命"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/session-selector.ts`（约 680 行）  
谁创建：`showSessionSelector`。

## 订阅什么

无 session 事件。异步 `SessionManager.list` / `listAll` 带 `onProgress`，header 显示 `loaded/total`。键盘：搜索、切 current/all cwd、切排序、只看已命名、重命名、删除（确认）、打开。删除用 `unlink`，重命名打开该 jsonl 的 SessionManager `appendSessionInfo`。

## 画什么

Header：scope、sort、name filter、加载进度、状态/错误、删除确认。搜索 Input。列表：相对时间（`3h`/`2d`）、名字或首条消息预览、可选完整 path、当前会话标记。cwd 把 `$HOME` 换成 `~`。

## 失败与边界

`listAll` 在自定义 session-dir 时只扫该目录，避免把别的项目会话混进来。删除当前正在用的文件由调用方决定是否 shutdown。加载是渐进的，搜索在已加载子集上跑。

## 下一课

[67-tree-selector.ts.md](/series/pi-source/coding-agent/589-tree-selector-ts/)
