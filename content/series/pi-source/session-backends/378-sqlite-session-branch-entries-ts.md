---
title: "11 · session/branch-entries.ts — 分支成员投影"
summary: "harness 的会话是 entry 树（parentid），用户看到的是 分支（从某 tip 沿父链走）。每次沿父链 walk 太慢，所以维护："
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/session/branch-entries.ts`  
核心导出：`appendEntryToBranchIndex`、`scanBranchEntries`、`scanBranchEntryStructures`  
被谁调用：每次 insert entry；Storage `scanBranch*`；fork 重放 entries 时同样 append。

## 本课目标

harness 的会话是 **entry 树**（parent_id），用户看到的是 **分支**（从某 tip 沿父链走）。每次沿父链 walk 太慢，所以维护：

- 若新 entry 的 parent **正好是某分支的 tip** → 延长该分支
- 若 parent 在中间（从某历史节点分叉）→ 新建 branch_id=entry.id 的分歧段，必要时只拷贝压缩点之后的成员
- parent 为 null → 新根分支，branch_id=entry.id

读完应能讲 `base_branch_id` / `base_seq` 如何避免把整条历史拷进每个分叉。

## `appendEntryToBranchIndex`

```ts
if (entry.parentId === null) createRootBranchForEntry;
else if (readBranchTipForParent(parentId)) appendEntryToExistingBranch;
else createDivergentBranchForEntry;
```

`readBranchTipForParent` 靠 `ix_bm_tip`：`branch_meta.tip_entry_id = parentId`。延长时 UPDATE tip，`changes !== 1` throw。

## 分歧与压缩

`createDivergentBranchForEntry`：

1. `readBranchSegmentsNewestFirst(parentId)`：从 parent 所在成员行出发，沿 `base_branch_id` 走到根，得到一段段 `{ branchId, lowerSeq, upperSeq }`。`lowerSeq` 是该段 `base_seq`（或 0）。成员查询还要求 `entry_seq > base_seq` 且 `<= tip_seq`，避免把「只属于更早前缀、被 base 表示的行」算进当前段。
2. `readNewestCompactionBoundary`：从新到旧找 type=compaction 的最大 seq。压缩点以前的历史由 summary 代替，分叉不必拷贝。
3. INSERT `branch_meta`：`base_branch_id/base_seq` = 压缩点（没有则为 null，表示本段自备从根到 parent 的前缀）。
4. `copyBranchEntriesAfterSeqThroughParent`：把压缩点之后到 parent 的成员 INSERT 进新 branch_id。
5. 插入新 entry 自己。

注释：`A null base means this segment stores its own root-through-parent prefix.`

## 扫描

`scanBranchEntries(query)`：`query.start` 是起始 **entry id**（通常是 tip）。`order` oldestFirst 则把段数组反过来。每段：

- `stopAtType` / `stopAtId` → 该段内 MIN 或 MAX 满足条件的 seq，作为 stopSeq，扫完这段就 break
- type / customType / cursor.seq 过滤
- JOIN entries 取 payload 或只要结构列
- limit 跨段递减

`readBranchMembership` 找不到 start → `Branch cache missing entry`。索引与权威 entries 必须同事务更新，正常路径不会发生；损坏的库会在这里炸。

## 失败与边界

- 这是私有投影，「没有等价物在其它 backend」——SQL 注释原话。Memory backend 大概每次 walk 树。conformance 比的是 scan 结果不是索引形状。
- compaction 类型名写死 `"compaction"`。core 改名要一起改。
- copy 用 INSERT SELECT，同事务可见刚写的段。
- `scanBranchEntryStructures` 与 entries 同谓词，少读 payload，给 UI 画树用。

## 下一课

把表操作实现成 `Storage`：[12-sqlite.storage.ts.md](/series/pi-source/session-backends/379-sqlite-storage-ts/)。
