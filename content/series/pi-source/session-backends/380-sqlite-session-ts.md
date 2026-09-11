---
title: "13 · session.ts — `SqliteOpenSession` 生命周期包装"
summary: "真正的 Session 语义在 StorageBackedSession（agent-core）。本类做三件事：把 metadata/idGenerator 露出来；所有操作 admit 进集合；close 时等集合空再 session"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/session.ts`  
核心导出：`SqliteOpenSession`  
被谁调用：只有 Repo。对外类型是 `Session<SqliteSessionMetadata>`。

## 本课目标

真正的 Session 语义在 `StorageBackedSession`（agent-core）。本类做三件事：把 metadata/idGenerator 露出来；**所有操作 admit 进集合**；close 时等集合空再 `session.close`，finally `onClose`（关 db、从 repo map 删除）。

对照 server 的 attachment.operations。没有这层，Repo close 会在还有 mutate 时拆掉 DatabaseSync，Node 会扔。

## `admit`

```ts
if (this.state !== "open") return Promise.reject(this.closedError);
result = operation();  // 同步 throw 也变成 rejected Promise
this.admitted.add(result);
result.finally delete;
return result;
```

`beginMutation` 更细：先占一个 `finished` Promise 在 admitted 里，再 await 底层 begin。若期间已经不 open，end 掉 mutation 再 throw closed。返回的 wrapper 在 `end` 的 finally 才释放 finished。这样「mutation 活着但中间的 commit Promise 已 settle」仍算占用。

`mutate` 在回调开头再查 state，关停过程中不进入用户函数。

`wrapBranch`：所有 Branch 方法也走 admit，避免拿着 branch 引用在 close 后还 appendMessage。

## `close`

去重 `closePromise`。state=closing（新 admit 拒绝）。`allSettled(admitted)` 再 `this.session.close`（会 `storage.close` 等 commit 队列）。finally `state=closed; onClose()`。onClose throw 会让 close Promise reject，Repo 仍从 map 删——看 Repo 的 try/finally。

`closedError` 是同一个 Error 实例反复 reject。比较 message 可以，不要靠 identity 当「第几次 close」。

## 失败与边界

- 不覆盖 StorageBackedSession 的并发 mutation 规则。core 的 beginMutation 已经是互斥屏障。
- `getEntry` / `findEntries` / `setName` 等所有 Session 方法都列出转发。漏转会在 conformance 暴露。
- 本类不知道 sqlite 文件。路径在 metadata.path。

## 下一课

目录与文件布局：[14-sqlite.repo.ts.md](/series/pi-source/session-backends/381-sqlite-repo-ts/)。
