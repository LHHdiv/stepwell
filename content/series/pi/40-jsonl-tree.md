---
title: 第40讲·JSONL 会话与会话树
summary: 精读 session-manager.ts（1715 行）：会话文件格式、parentId 链、分支树与迁移机制。
objectives:
  - 掌握 pi 会话 JSONL 的完整格式（header + entry）
  - 理解 parentId 链如何构成"就地分支"的树
  - 了解版本迁移（v3）机制
tags: [pi, session, 会话树]
keyPoints:
  - 文件路径按项目路径编码；第一行是 SessionHeader
  - 每条 entry 带 id/parentId/timestamp，parentId 链构成树
  - entry 类型含 message/compaction/model_change/branch_summary/custom 等
---

卷五：会话的持久化。核心文件 `core/session-manager.ts`（1715 行），配套文档 `docs/session-format.md`（官方格式规范，必读）。

## 文件布局：一个项目一个目录

```
~/.pi/agent/sessions/--Users-lijunkai-Project-pi--/<timestamp>_<uuid>.jsonl
```

路径编码逻辑（session-manager.ts 第 474-481 行）：把绝对路径的斜杠替换成连字符，前后加 `--`。简单粗暴但有效——**会话跟着项目走**。

## 文件格式：header + entries

第一行是会话头：

```ts
export interface SessionHeader {
  type: "session";
  version?: number;      // 当前 CURRENT_SESSION_VERSION = 3
  id: string;
  timestamp: string;
  cwd: string;
  parentSession?: string; // fork 来的会话记录亲爹
}
```

其后每条 entry 都带 `id/parentId/timestamp` 三件套（SessionEntryBase）。entry 的类型联合非常丰富：`message`（对话消息）、`compaction`（压缩记录，含 summary/firstKeptEntryId/tokensBefore）、`model_change`（中途换模型）、`thinking_level_change`、`branch_summary`（分支摘要）、`custom`（扩展自定义）、`label`（给分支起名）……

**注意这个设计的开放性**：`custom` 类型 + 声明合并式的类型系统，让扩展可以往会话里写自己的条目而不破坏格式——和 dsh 的 SessionEventMap 声明合并（第 12 讲）是同一个思想。

## 会话树：parentId 的魔法

普通聊天记录是线性的。pi 的会话是**树**：每条 entry 通过 `parentId` 指向它的前驱。你在某条消息上 `/fork`，新分支的 entry 指向同一个父节点——**不新建文件、不复制历史，树就地在文件里生长**。

`SessionTreeNode { entry, children, label? }`（第 159 行）是内存中的树节点，`/tree` 命令渲染它、导航它。切换分支 = 把"当前指针"移到另一条链上，下次 derive 上下文时只沿当前链回溯。

对照 dsh：dsh 的日志是严格线性追加（第 12 讲），分支靠子智能体的独立 session；pi 选择在单文件里存树。**两种持久化哲学**：线性日志简单可靠，会话树灵活强大——你做个人智能体时值得亲自权衡一次。

## 版本迁移

格式会进化（现在是 v3）。`migrateSessionEntries`（第 294 行）负责把旧版本文件升级到当前版——**读时迁移**，老文件不用批量重写。这是持久化格式演化的标准姿势。

## 试一试

跑几轮对话，中途用 `/fork` 分一枝，再各说一句话。打开 JSONL 数一数：两条分支的 entry 的 parentId 是否指向同一个节点？`/tree` 里看到的结构和文件里的链是不是一回事？

## 下一讲预告
compaction 三件套：自动压缩的触发算法、摘要生成、以及"跨压缩的文件操作追踪"这个精妙细节。
