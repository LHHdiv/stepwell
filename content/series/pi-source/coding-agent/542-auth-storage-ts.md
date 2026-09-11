---
title: "44 · auth-storage.ts — auth.json"
summary: "实现 pi-ai 的 CredentialStore：read/list/modify/delete。写文件 mode 0o600，父目录 0o700（仅创建时）。OAuth refresh 走 modify 的比较并交换，带文件锁。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/auth-storage.ts`（约 500 行）  
被谁调用：`ModelRuntime.create` 默认凭证后端；`FileModelsStore` 复用 `FileAuthStorageBackend`。

## 本课目标

实现 `pi-ai` 的 `CredentialStore`：read/list/modify/delete。写文件 mode `0o600`，父目录 `0o700`（仅创建时）。OAuth refresh 走 `modify` 的比较并交换，带文件锁。

## 后端

`FileAuthStorageBackend.withLock` / `withLockAsync`：proper-lockfile。同步路径 ELOCKED 忙等；异步指数退避，stale 30s。锁内读全文 → 回调 → 可选写回。

`AuthStorage` 在后端之上：parse JSON 为 `Record<providerId, Credential>`。进程内共享 readState + revision（mtime），多读者合并 reload。`apiKey` 若是 `!cmd` / `$ENV`，read 时 `resolveConfigValue` 展开。

`modify(providerId, fn)`：锁内把 current credential 交给 fn，fn 返回新值或 undefined（删除）。用于 refresh token 轮换。

## 失败与边界

坏 JSON throw。mode 只在创建时设，不 chmod 管理员已收紧的文件。共享 readState 跨多个 AuthStorage 实例（同一 path）。`signal` 取消等待锁。不要在这里找「登录 UI」——那是 interactive `/login` + pi-ai oauth。

## 下一课

[45-auth-guidance.ts.md](/series/pi-source/coding-agent/544-auth-guidance-ts/)：没模型时给人看的那几句。
