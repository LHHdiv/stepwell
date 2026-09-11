---
title: "40 · session/testing — 后端无关的符合性与夹具"
summary: "目录：packages/agent/src/harness/session/testing/ 包出口：@earendil-works/pi-agent-core/harness/session/testing 被谁调用：packages"
tags: [pi, agent]
---
目录：`packages/agent/src/harness/session/testing/`  
包出口：`@earendil-works/pi-agent-core/harness/session/testing`  
被谁调用：`packages/agent/test/harness/memory-conformance.test.ts`、`jsonl-*-conformance.test.ts`、benchmark。

## 本课目标

一份测试套跑 Memory 和 JSONL（以及未来 SQLite）：工厂给一个新的 Storage/Repo，`createStorageConformance` / `createSessionRepoConformance` 返回 `ConformanceCase[]`，测试框架只负责 `it(name, () => case.run())`。精读公共基类 `StorageDecorator`、`GatingStorage`、`InstrumentedStorage`。其余文件列职责。

这不是产品路径。现行 CLI 不用这些类。

## 文件职责

| 文件 | 职责 |
|---|---|
| `index.ts` | 再导出夹具、符合性工厂、benchmark 数据集 |
| `types.ts` | `StorageFixture`（`AsyncDisposable` + `storage`）、`ConformanceCase` |
| `storage-decorator.ts` | **基类**：把 Storage 全方法转发给 delegate |
| `instrumented-storage.ts` | 记录每次 commit 的 writes，断言写序 |
| `gating-storage.ts` | 把已 admit 的 commit 停住，模拟崩溃窗口 |
| `conformance/storage.ts` | Storage 合同：原子事务、回滚、list、scan、seq |
| `conformance/session-repo.ts` | Repo 生命周期、所有权、消息、fork 各切片 |
| `benchmark/datasets.ts` | 条目规模数据集 |
| `benchmark/storage.ts` | 给 Storage 灌数据、读写场景 |
| `benchmark/session-repo.ts` | catalog/fork 灌数与场景 |

## `StorageDecorator`（公共基类）

实现完整 `Storage`，每个方法一行转给 `protected delegate`。子类只 override 需要拦截的方法。不要复制粘贴 11 个查询方法。

规范：生产没有「写历史 API」；测试要断言写序，用装饰器包在 `commit()` 上，而不是改 Storage 协议。

## `InstrumentedStorage`

`commitAttempts: Write[][]`。override commit：push 一份 writes 引用，再 delegate。`getCommitAttempts()` 返回拷贝。`clearCommitAttempts` 清空。

用途：drive 测试断言「intent 事务里有 tool_args、没有 entry」这类顺序。注意记录的是 **调用 commit 时的 Write[]**，不是 apply 后的 CommittedWrite（没有 seq）。

## `GatingStorage`

模拟「commit 已调用、磁盘结果未可见」。

- 未 `arm()`：直接 delegate（夹具 setup 不受阻）
- `arm()` 后：每次 commit 把自己推进 `queue`，promise 挂在 `released` 上；`waitPending(n)` 等到至少 n 个停住
- `next(n)`：FIFO 放行 n 个，并 `await landing`（delegate.commit 结束）
- `discard()`：之后所有 commit throw `CommitDiscarded`，已停住的 drop

这对应规范里的崩溃窗口：intent 已 commit、effect 进行中、settlement 未写。测试可以 `arm` → 触发 drive → `waitPending` → kill 语义（discard）→ 再 open 看恢复。

`CommitDiscarded` 是 Error 子类，名字稳定，断言用。

## `types.ts`

`StorageFixture` 必须 `[Symbol.asyncDispose]`，符合性用例 `await using` 保证关文件。`ConformanceCase` 有 `group` + `name` + `run`，不依赖 vitest。

## `createStorageConformance(factory)`

返回只读 case 数组。开头几个（已读源码）：

- mixed writes 按写入序原子 commit，seqs 严格递增，stats 与 getStats 一致
- mixed 事务失败时 **三个 store 都回滚**（已有 entry/usage 不变，失败事务里的 setValue 看不见）
- 失败事务不得留下「写了一半又删掉」的中间值

后面还有 list append/delete、scan prefix、branch parent、重复 id、缺 parent 等。新后端：实现 factory 返回临时目录上的 JsonlStorage 或 MemoryStorage，跑同一批。

## `createSessionRepoConformance`

组合：

- **lifecycle**：create 无隐式 branch；重复 id reject；close 排空已 begin 的 mutation，排队中的 mutate 不得开始
- **ownership**：双开、打开着 delete 等
- **message**：append、pending assistant 拒绝
- **fork**：`createSessionRepoForkConformance` = behavior + coordination；另有 streaming / destination reservation / source snapshot 可单独跑（JSONL 流式 fork 比 Memory 多那些）

`prepareRepoCaseFactory`（文件前部）负责每个 case 新建 repo、跑完 close。

lifecycle 里「creates a session with no implicit branch」直接钉死：`branch("main") === undefined`，没有 laneState。这是和 coding-agent「一打开就有会话文件」不同的模型——harness 要 `lane("main")` 才创建 tip+config。

## benchmark 文件

`STORAGE_BENCHMARK_DATASETS`：不同 entry 数。`seedStorageBenchmark` 按数据集写事务。read/write scenarios 是「扫分支 / 追加 N 条」这类。session-repo 的 catalog 测 list 大量会话；fork 测拷一条长分支。跑：`npm run bench:session:timing`（包脚本）。

## 失败与边界

符合性失败 = 后端违反合同，不是 flaky。GatingStorage 若忘记 arm，测试会「直接成功」而没有停在窗口——这是夹具 bug。InstrumentedStorage 记录的是 admission 时的数组，planner 若之后改同一数组会污染记录（drive 代码用新对象，一般安全）。

## 下一课

Runtime：[41 · runtime/index.ts](/series/pi-source/agent/282-harness-runtime-index-ts/)。
