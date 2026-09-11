---
title: "39 · jsonl/legacy-v3.ts — coding-agent v3 行 → v4 事务"
summary: "v3 是 一条 JSON 一行一种事件（message、compaction、modelchange…），tip 靠 parentId 链，没有 pi.op.。导入时要合成：entry 树、lane config/state、label"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/jsonl/legacy-v3.ts`  
被谁调用：JsonlStorage.open 认到 v3 头；fork 的 legacy 输入。

## 本课目标

v3 是 **一条 JSON 一行一种事件**（message、compaction、model_change…），tip 靠 parentId 链，没有 pi.op.*。导入时要合成：entry 树、lane config/state、labels、session name、usage 合计。

规范 Appendix B 是兼容说明。实现类 `LegacyV3Source`。

## 行类型（节选）

message / custom / custom_message / branch_summary / compaction / model_change / thinking_level_change / active_tools_change / session_info / label，以及其它被跳过或映射的。

compaction 的 `firstKeptEntryId` 要变成 v4 的 `retainedTail`：从该 id 走到当前 tip 的消息。所以 `writes()` 可能重读消息——fork 才强调「index 阶段不要调用 writes()」。

id：v3 已有 id 尽量保留；冲突或非法时分配新 uuidv7，`translateForkEntryId` 给 fork 请求用。

timestamp 从 ISO 字符串转 ms。seq 按规范化顺序从 1 递增。

## 合成 values

扫完后：

- `branchTip("main")`（v3 只有一条主链，导入成 main）
- `laneConfig` / `laneState` idle，模型取最后一次 model_change
- sessionName、entryLabel
- `importedUsage` 累加各条助手 usage，升级到 v4 时写成 adjustment 行

## 失败与边界

只读导入：第一次 harness commit 才 rewrite 成 v4。在此之前 `kind: "v3"` 的 getStats 要把 importedUsage 算进去。坏行：read 时 throw，会话打不开——没有「跳过坏行继续」的产品承诺。

## 下一课

[40 · session/testing](/series/pi-source/agent/281-harness-session-testing-ts/) 合写测试夹具。然后进入 runtime。
