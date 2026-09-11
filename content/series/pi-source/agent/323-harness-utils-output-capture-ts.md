---
title: "82 · utils/output-capture.ts — 源侧有界视图 + 增量更新"
summary: "维护解码后的滚动窗口：maxBytes/maxLines、retain head|tail。push 接受 string/Uint8Array（stream decode）。非法控制字符 sanitize 掉。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/utils/output-capture.ts`  
被谁调用：`NodeExecutionEnv.exec`；`applyShellOutputUpdate` 给 bash 工具。

## `OutputCapture`

维护解码后的滚动窗口：maxBytes/maxLines、retain head|tail。`push` 接受 string/Uint8Array（stream decode）。非法控制字符 `sanitize` 掉。

超限后仍计数 totalBytes/totalLines（截断元数据要「一共多少」），窗口本身是 truncateHead/Tail 的结果。`setSpillPath` 在 spill 文件创建后写入 metadata。

每次变更 `publisher.markDirty()`。snapshot → `updateFrom` 计算 replace/append/slide/metadata。slide：tail 窗口丢掉前缀若干字符再接新文本，省带宽。

`dispose` 停 publisher。`truncated` getter 看总量是否超限。

## `applyShellOutputUpdate`

bash 工具侧把增量合成 `ShellOutputView`。replace 整份覆盖；append 拼 text；slide 按 drop 切前缀；metadata 只改 truncation/spill。

## 失败与边界

maxBytes/maxLines 构造期必须正有限。onUpdate throw 经 publisher onError 传到 env 的 failCallback → 杀进程。

## 下一课

[83 · shell-output.ts](/series/pi-source/agent/324-harness-utils-shell-output-ts/)，本包精读最后一课。
