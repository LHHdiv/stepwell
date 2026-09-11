---
title: "05 · vitest-evals/artifacts.ts — 会话 JSONL 与源码附件"
summary: "vitest 3 的 artifact registry 用 symbol key 做模块扩充。本文件声明两种类型：@earendil-works/pi-evals:session 和 :source。读完应能指出 runId 如何变成"
tags: [pi, evals]
---
源码：`packages/evals/src/vitest-evals/artifacts.ts`  
核心导出：`PI_SESSION_SNAPSHOT_ARTIFACT`、`recordEvalSessionArtifact`、`recordEvalSourceArtifact`、`persistEvalArtifactReferences`  
被谁调用：setup afterEach；`extensions.eval.ts` 记录生成的 `hello.ts`；reporter 把附件写到磁盘。

## 本课目标

vitest 3 的 artifact registry 用 symbol key 做模块扩充。本文件声明两种类型：`@earendil-works/pi-evals:session` 和 `:source`。读完应能指出 runId 如何变成目录名（sha256），以及为什么 attachment.name 必须等于 `basename(name)`。

## 常量

`PI_SESSION_SNAPSHOT_ARTIFACT = "piSessionJsonl"`：harness `setArtifact` 的键，和 reporter 从 `run.artifacts` 过滤时要跳过的键（连同 `runId`）。真正进 `runs.jsonl` 的是落盘后的相对路径，不是整份 JSONL 内联——文件可能很大。

## `recordEvalSessionArtifact`

从 `run.artifacts.runId` 和 `piSessionJsonl` 取值。缺 session 则 return（跑到一半失败、还没写出文件）。类型不对 TypeError。然后 `recordArtifact(task, { type, runId, attachments: [{ name: "session.jsonl", contentType: "application/jsonl", body, bodyEncoding: "utf-8" }] })`。

## `recordEvalSourceArtifact`

给扩展评测：`hello.ts` 的正文。调用方（eval 测试体）在 `run()` 返回后、断言前 await。runId 仍必须是 harness 写下的 session id。

## `persistEvalArtifactReferences`

reporter 在每条测试结束时调用。按 `artifact.runId === 这次 runId` 过滤，避免 task 上沾到别的 run。目录：

```text
$PI_EVAL_ARTIFACT_DIR/sessions/<sha256(runId)>/session.jsonl
$PI_EVAL_ARTIFACT_DIR/sources/<sha256(runId)>/hello.ts
```

`basename(name) !== name` 则拒绝：禁止 `../` 逃出 artifact 根。mode 目录 0700、文件 0600。返回 `{ name, path: relative(artifactDirectory) }` 给 jsonl 索引。

## 失败与边界

- runId 用 session id（UUIDv7 一类），hash 后当目录是为了文件名安全，不是保密。
- 同一 run 多次 persist 会覆盖同名文件。afterEach 一次 + reporter 一次读的是 vitest 已登记的 attachments，写盘幂等内容相同。
- `declare module "vitest"` 扩充只在编译本包时可见。

## 下一课

比较实验如何展开成 vitest 行：[06-vitest-evals.harness-table.ts.md](/series/pi-source/evals/731-vitest-evals-harness-table-ts/)。
