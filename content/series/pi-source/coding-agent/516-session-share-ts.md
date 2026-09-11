---
title: "31 · session-share.ts — /share 上传当前分支"
summary: "看分享不是「把 jsonl 原样 POST」，而是先导出带展示元数据的副本，再交给 Radius。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/session-share.ts`  
被谁调用：`InteractiveMode` 处理 `/share`。

## 本课目标

看分享不是「把 jsonl 原样 POST」，而是先导出带展示元数据的副本，再交给 Radius。

## `exportSessionForShare`

`exportSessionToJsonl` 回调里插一条 `customType: "pi.share"` 的 custom entry，data 里带当时的 `systemPrompt` 和工具 JSON schema。观看页没有运行时 Agent，必须把提示和工具定义冻进去。

## `shareSession`

1. 用 `getAuthCredential(runtime.getAuth("radius"))` 取 token。没有则提示去 `/login radius`。
2. 编辑器槽换成 `BorderedLoader("Uploading…")`，可取消。
3. 临时文件写出导出结果，上传到 `getShareViewerUrl()` / Radius gateway。
4. 成功在 chat 里打可点的 hyperlink；失败 `showError`。
5. 无论成败把 editor 装回去。

不订 Agent 事件。画的是 loader + 最终一条状态文本。

## 失败与边界

- 分享的是**当前 leaf 分支**，不是磁盘上整棵树。
- 上传过程可 abort；临时文件要清。

## 下一课

组件目录：[32-components.index.ts.md](/series/pi-source/coding-agent/518-components-index-ts/)
