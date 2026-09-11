---
title: "42 · auth/types.ts — 凭证与登录回调的合约"
summary: "能区分：存储形态（Credential）、请求形态（ModelAuth）、厂家能力（ProviderAuth = apiKey + oauth）、UI 回调（AuthInteraction）。OAuth 的 refresh 和 toAu"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/types.ts`  
被谁调用：整个 `auth/`、`models.ts`、厂家工厂的 `auth` 字段、coding-agent 的 AuthStorage。

## 本课目标

能区分：存储形态（`Credential`）、请求形态（`ModelAuth`）、厂家能力（`ProviderAuth` = apiKey + oauth）、UI 回调（`AuthInteraction`）。OAuth 的 `refresh` 和 `toAuth` 为什么拆开。

## 存储 vs 请求

`ApiKeyCredential`：`{ type: "api_key", key?, env? }`。`env` 是 Cloudflare account id 这类配置，不是 process.env 全体。

`OAuthCredential`：`type: "oauth"` + `refresh` / `access` / `expires` + 任意附加字段（Copilot 的 `enterpriseUrl`）。

`CredentialStore`：**每个厂家一把凭证**。唯一写路径是 `modify(id, async current => next)`。`undefined` 表示不改。`Models.getAuth` 的 token 刷新必须在 modify 里做，跨进程文件锁也由实现提供。`read` 缺条目返回 undefined；只有存储故障才 reject。

`ModelAuth`：真正上请求的 `apiKey?` / `headers?` / `baseUrl?`。不能用这三项表达的东西不是 auth（那是 provider config）。

## `ApiKeyAuth` / `OAuthAuth`

apiKey：`resolve({ ctx, credential, signal })` → `AuthResult | undefined`。可选 `login`（提示粘贴 key）、可选 `check`（不要执行会有副作用的 resolve，例如跑外部命令）。

oauth：

- `login(interaction)` → 新凭证
- `refresh(credential, signal)` → 新凭证（网络，throw）
- `toAuth(credential)` → `ModelAuth`（无网络，可 async 因为 lazy wrapper）

拆 refresh/toAuth：`Models` 才能「锁内 refresh 一次，锁外 toAuth 很多次」。`isSubscription` / `loginLabel` 给 UI。

## `AuthInteraction`

`prompt`：text / secret / select / manual_code。`notify`：info / auth_url / device_code / progress。`signal` 取消整个 login；单个 prompt 可另带 signal（callback 赢了就 abort 手动输入）。

这是内部厂家实现用的新合约。扩展仍可能用 15 课的 `OAuthLoginCallbacks`。

## `AuthContext`

`env(name)`、`fileExists(path)`（`~` 展开）。浏览器实现 env 返回 undefined、fileExists false。可注入假上下文做测试。

## 失败与边界

store 实现若在 `list` 时执行 API key 命令，会违反注释（status UI 不应触发副作用）。oauth.refresh 失败必须 throw，不要返回过期凭证。`ProviderAuth` 两个都缺是编程错误，`createProvider` 的调用方（composer）会拒。

## 下一课

默认 AuthContext：[43-auth-context.ts.md](/series/pi-source/ai/104-auth-context-ts/)。
