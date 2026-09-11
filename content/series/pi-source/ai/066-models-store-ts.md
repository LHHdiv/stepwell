---
title: "05 · models-store.ts — 按厂家持久化的模型目录"
summary: "看清动态厂家（OpenRouter、GitHub Copilot）如何在离线时仍能列出上次拉到的模型：一份 ModelsStoreEntry 按 providerId 存，refresh 先 restore 再联网。"
tags: [pi, ai]
---
源码：`packages/ai/src/models-store.ts`  
被谁调用：`createModels({ modelsStore })`；`ModelsImpl.refresh` 的 `read` / `write` / `delete`。coding-agent 注入文件实现。默认是内存版。

## 本课目标

看清动态厂家（OpenRouter、GitHub Copilot）如何在离线时仍能列出上次拉到的模型：一份 `ModelsStoreEntry` 按 `providerId` 存，refresh 先 restore 再联网。

## 在系统中的位置

```text
Models.refresh(provider)
  modelsStore.read(providerId)     → stored
  provider.refreshModels({ stored, publish })
    publish({ persist: entry, update })
      modelsStore.write(providerId, entry)
      update()  // 同步改内存目录
```

静态厂家（Anthropic 官方目录）没有 `refreshModels`，不碰 store。

## `ModelsStoreEntry`

```ts
interface ModelsStoreEntry {
  models: readonly Model<Api>[];
  lastModified?: number;  // 远程 Last-Modified
  checkedAt?: number;     // 本地上次检查时间
  etag?: string;          // 原样保存，含引号，下次 If-None-Match
}
```

`etag` / `lastModified` 让厂家实现能发条件请求：没变就 304，不重写目录。本文件不解释 HTTP，只原样存。

## `ModelsStore` 接口

`read` 没有条目返回 `undefined`（不是 throw）。`write` 整份替换。`delete` 用于 `publish({ persist: null })`。都接收可选 `signal`。

错误语义：实现只在存储失败时 reject；`Models` 会包成 `ModelsError("auth")` 或让 refresh 记入 `errors` map。缺条目是正常的。

## `InMemoryModelsStore`

`Map<string, ModelsStoreEntry>`。`read`/`write` 都 `structuredClone`，避免调用方改到内部引用。`signal?.throwIfAborted()` 在动手前检查一次。

测试和没有磁盘的 embedding 用这个。进程一关目录就没了，所以 CLI 必须换文件 store。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 未知 providerId | `read` → undefined |
| write 时 abort | throwIfAborted，不写 |
| 调用方改了 read 返回的 models | 不影响 store（clone） |
| 并发 write | 本实现不串行；`ModelsImpl.publishProviderModels` 用 promise 链保证同一厂家串行 |

## 下一课

生成目录的类型魔术：[06-model-catalog.ts.md](/series/pi-source/ai/067-model-catalog-ts/)。
