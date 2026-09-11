---
title: "13 · auth-check.ts — `pi auth check` 的判定表"
summary: "能对照源码说出三种 status 各自对应哪条失败路径。这不是登录，只是读凭证状态。刷新 OAuth 发生在 ModelRuntime.checkAuth / getAuth 里，本文件只编排。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/auth-check.ts`  
被谁调用：`main.ts` 处理 `auth check` 子命令；测试直接调。

## 本课目标

能对照源码说出三种 status 各自对应哪条失败路径。这不是登录，只是读凭证状态。刷新 OAuth 发生在 `ModelRuntime.checkAuth` / `getAuth` 里，本文件只编排。

## 在系统中的位置

```text
main.ts
  parseAuthCommand → kind === "check"
  createAuthCheckModelRuntime(credentials)
  checkProviderAuth(args, runtime, { refresh: !noRefresh })
  可选 getProviderCredential → 打印 token
  exit 0 / 1
```

Auth 子命令**不**走 `createAgentSession`。用独立的 ModelRuntime，且 `allowModelNetwork: false`、`refreshOnCreate: false`，避免 check 去刷模型目录。

## `checkProviderAuth`

1. `validateAuthCommandArgs`：必须有 `--provider` 或 `--model`。
2. 若给了 `--model`，`resolveCliModel` 推出真正的 provider。解析失败 throw `AuthCommandError`。
3. `modelRuntime.getError()` 有值 → `invalid` / `invalid_state`（models.json 坏了）。
4. `getProvider(provider)` 没有 → `not_ready` / `provider_not_found`。
5. `checkAuth(provider)`：
   - 没有配置 → `not_ready` / `credentials_not_configured`
   - `refresh: true` 时再 `getAuth`（会刷新快过期的 OAuth）；刷新后仍没有 → 同样 `not_ready`
   - 成功 → `ready`，带 `authType: "api_key" | "oauth"`
6. `checkAuth` throw → `invalid`（网络/存储异常不当成「没配」）。

## `getProviderCredential`

给 `--credentials` 用。OAuth 且 `refresh: false` 时直接读 store 里的 `access`，不走刷新。否则 `getAuth` + `getAuthCredential`（API key 或 Authorization Bearer）。

## `createAuthCheckModelRuntime`

`InMemoryCodingAgentModelsStore`：check 不写 `models-store.json`。凭证仍走调用方传入的 `CredentialStore`（通常是 `auth.json`）。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 未知 provider | not_ready，不是 throw |
| 没配凭证 | not_ready |
| models.json 坏 / checkAuth 抛错 | invalid |
| 模型名解析失败 | throw AuthCommandError，main 打印 usage |

`ready` 不等于「这个 token 现在能打通厂家」。只表示本地配置存在、刷新路径没把凭证弄丢。

## 下一课

[14-auth-command.ts.md](/series/pi-source/coding-agent/482-auth-command-ts/)：三个 auth 子命令如何从 argv 拆出来。
