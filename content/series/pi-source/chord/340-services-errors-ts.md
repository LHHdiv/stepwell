---
title: "07 · services/errors.ts — 过线错误码"
summary: "八个码能对上「谁的错、能不能重试」。知道栈和任意字段不过线——适配器只应送 code + 消毒过的 message。"
tags: [pi, chord]
---
源码：`packages/chord/src/services/errors.ts`  
被谁调用：provider / consumer 抛 `RemoteServiceError`；根导出给 Pi 适配器映射到协议信封。

## 本课目标

八个码能对上「谁的错、能不能重试」。知道栈和任意字段不过线——适配器只应送 `code` + 消毒过的 `message`。

## 在系统中的位置

```text
provider.invoke / consumer.use
  throw new RemoteServiceError(code, message)
    适配器序列化 { code, message }
    对端 new RemoteServiceError 或等价
```

本地图错误（缺 provider、环、setup 异步）是普通 `Error` / `TypeError` / `AggregateError`，**不**走这张表。那是 host 组装失败，还没到远程边界。

## `REMOTE_SERVICE_ERROR_CODES`

```ts
"service_not_allowed"       // local 服务被远程用，或不在 allowlist
"service_not_found"         // 目录里没有，或 singleton 还没 provide
"service_mode_mismatch"     // singleton/keyed 用反，或重复 provide
"service_member_not_found"  // 方法/状态名不存在
"service_member_mismatch"   // 当方法用了状态，或替换改了 member 形状
"service_instance_not_found"// keyed key 不存在
"service_stale_instance"    // generation 对不上，或 binding 已关
"service_invalid_value"     // 缺 trailing Context 等值错误
```

`isRemoteServiceErrorCode`：字符串且在表内。适配器收未知 code 不要当 Chord 服务错误。

## `RemoteServiceError`

`name = "RemoteServiceError"`，只多一个 `code` 字段。没有 cause、没有 data。provider 里未预料的异常应变成消毒过的 internal 错误——**当前实现还把许多内部 Error 原样抛**（例如 snapshot 形状不对）。PLANNING 的「默认 sanitised internal」尚未全部落地。过线时适配器仍应剥栈。

## 失败与边界

- 取消不是这张表的码。取消走 AbortSignal / 适配器自己的 cancel 帧。
- `service_stale_instance` 在 consumer 里既用于 generation 错，也用于「observation 已 close 还在调」。调用方应换新 facade，不要重试旧的。
- 不要把应用业务错误塞进这些码。应用有自己的 taxonomy，经方法返回值或应用级 code 走。

## 下一课

[08-services.state-internals.ts.md](/series/pi-source/chord/341-services-state-internals-ts/)：provider 如何认出对象上的 replicated state。
