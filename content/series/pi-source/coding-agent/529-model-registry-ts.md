---
title: "37 · model-registry.ts — 扩展眼里的模型表"
summary: "内核用 ModelRuntime（async、snapshot）。扩展文档和旧 API 是同步 getAll() / find()。本类把 runtime 包一层，并处理「厂家未配置认证但 models.json 仍给了 header」"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/model-registry.ts`  
被谁调用：`ExtensionRunner` 构造时 `new ModelRegistry(modelRuntime)`，塞进 `ExtensionContext`。

## 本课目标

内核用 `ModelRuntime`（async、snapshot）。扩展文档和旧 API 是同步 `getAll()` / `find()`。本类把 runtime 包一层，并处理「厂家未配置认证但 models.json 仍给了 header」的兼容。

## 方法对照

| Registry | Runtime |
|---|---|
| `refresh` | `refresh` |
| `getAll` | `getModels()` 拷贝 |
| `getAvailable` | `getAvailableSnapshot()`（不触发网络） |
| `find(provider, id)` | `getModel` |
| `hasConfiguredAuth` | `hasConfiguredAuth` |
| `getApiKeyAndHeaders` | `getAuth`；失败时若 compatibility 只要 header 不要 key，仍 `ok: true` |
| `registerProvider` / `unregisterProvider` | runtime 同名 |

`ResolvedRequestAuth` 是 `{ ok: true, apiKey?, headers?, baseUrl?, env? } | { ok: false, error }`，避免扩展直接碰 `AuthResult`。

## 失败与边界

`getAvailable` 是快照，扩展不要以为调用它会刷新 OAuth。`registerProvider` 在 `bindCore` 之后立刻生效（runner 已把 pending 冲掉）。`clearApiKeyCache` 从 provider-composer 再导出，给扩展在改环境变量后清 `!command` 缓存。

## 下一课

[38-model-config.ts.md](/series/pi-source/coding-agent/531-model-config-ts/)：只读的 models.json。
