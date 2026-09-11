---
title: "81 · utils/adaptive-publisher.ts — 只发最新状态，中间突变丢掉"
summary: "idle 后第一次 dirty 立刻 flush。每次成功 publish 购买延迟：max(minIntervalMs=100, encodedBytes / targetBytesPerSecond)，默认 100KiB/s。只有一"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/utils/adaptive-publisher.ts`  
被谁调用：`OutputCapture`。shell 输出可能每毫秒一块，不能每块都 commit/SSE。

## 策略

idle 后第一次 dirty **立刻** flush。每次成功 publish 购买延迟：`max(minIntervalMs=100, encodedBytes / targetBytesPerSecond)`，默认 100KiB/s。只有一个 trailing timer，保证最终会发。

`update(previous, current)` 返回 undefined 表示无 delta，仍推进 published 指针。先改内部基线再 `publish`——注释：消费者可能 apply 后 throw 或重入，若基线还是旧的会把同一 delta 发两遍。

`dispose` 清 timer。flush(force) 忽略窗口。

## 失败与边界

timer 回调里 flush throw → `onError`，不 dispose。没有队列：窗口内 100 次 markDirty 只留下最后 snapshot。这是进度信道，不是完整日志（完整日志在 spill 文件）。

## 下一课

[82 · output-capture.ts](/series/pi-source/agent/323-harness-utils-output-capture-ts/)。
