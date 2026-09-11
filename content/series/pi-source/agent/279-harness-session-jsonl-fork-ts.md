---
title: "38 · jsonl/fork.ts — 流式分叉：先建索引再拷选中的行"
summary: "大 JSONL 不能 createForkSnapshot 那样把所有 message payload 装进 Map。分两遍：第一遍只记 entry 父子、当前 scalar 的 seq、list 存活区间；第二遍再流式投影写出 des"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/jsonl/fork.ts`  
被谁调用：`JsonlSessionRepo.fork`。

## 本课目标

大 JSONL 不能 `createForkSnapshot` 那样把所有 message payload 装进 Map。分两遍：第一遍只记 entry 父子、当前 scalar 的 seq、list 存活区间；第二遍再流式投影写出 dest。

## 边界

`JsonlForkInput`：`open` 带 `nextSeq`（停在这个 seq 之前，且 **禁止一笔事务跨边界**）；`closed` 扫到撕行；`legacy-v3` 用已经规范化的内存结构，避免 `writes()` 重建 compaction tail。

## `JsonlForkIndex`

applyEntry / applyWrites 维护：entryParents、copied 集合（select 之后）、currentScalarSeqs、firstSurvivingListSeq、branchTips、lane 清单。`isSurvivingListElement` 用 seq ≥ 上次整表 delete 之后。

`selectJsonlFork` 调 `selectBranchFork`，用 index 的 getParent，不加载 message。

## `runJsonlFork`

1. indexForkInput  
2. v3 的 branch fork 要把请求的 entryId **翻译**成规范化 id  
3. streamForkWrites（v3 可提前滤；v4 仍吐全部 captured writes）  
4. `projectJsonlForkWrite`：entry 按 copied；usage 丢；value/list 走 fork-policy 且 list 元素要 surviving  
5. `publishJsonl` 写出，header.nextSeq 保留源高水位  

源文件两遍只读。注释：两遍之间源必须仍是 append-only；新 append 被 nextSeq 边界排除。

## 失败与边界

事务跨 `stopBeforeSeq` → throw。fork 不打开 dest Session，repo 随后 `JsonlStorage.open`。不拷 usage：新会话账单从零计，v3 导入那条 adjustment 也不会去。

## 下一课

[39 · legacy-v3.ts](/series/pi-source/agent/280-harness-session-jsonl-legacy-v3-ts/)：coding-agent 旧会话如何变成树。
