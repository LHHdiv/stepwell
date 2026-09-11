---
title: "46 · auth/resolve.ts — 一次请求如何拿到 `ModelAuth`"
summary: "背下优先级：显式 apiKey 覆盖 → 存储凭证（oauth 可能 refresh）→ 环境/ADC 等 ambient。存储了 oauth 就绝不再静默掉到 env key。OAuth 刷新有 5 分钟余量和 store 锁。"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/resolve.ts`  
被谁调用：`Models.getAuth` / `ImagesModels.getAuth` / `Models.applyAuth`。这是鉴权执行链的中心。

## 本课目标

背下优先级：**显式 apiKey 覆盖 → 存储凭证（oauth 可能 refresh）→ 环境/ADC 等 ambient**。存储了 oauth 就绝不再静默掉到 env key。OAuth 刷新有 5 分钟余量和 store 锁。

## 在系统中的位置

```text
applyAuth
  getAuth(model, { apiKey, env, signal })
    resolveProviderAuth(provider, credentials, authContext, overrides)
```

## `ModelsError`

`code`: `model_source` | `model_validation` | `provider` | `stream` | `auth` | `oauth`。message 会把 `cause` 拼进去（调用方往往只显示 `error.message`）。

## `resolveProviderAuth` 步骤

1. `overrides.env` 存在则 overlay AuthContext：先查 overlay，再底层。
2. **`overrides.apiKey` 且厂家有 apiKey auth**：当存储 key 用，走 `resolveApiKey`。用于请求级临时 key。不看 store。
3. `credentials.read`。有 oauth 且厂家支持 oauth → `resolveStoredOAuth`。有 api_key 且厂家支持 apiKey → resolve（env overlay merge 进 credential.env）。类型和厂家能力不匹配 → `undefined`（例如只剩 oauth 实现却存了 api_key）。
4. 无存储：厂家 `apiKey.resolve({ credential: undefined })` 读 ambient。纯 oauth 厂家无存储 → undefined。

## `resolveStoredOAuth`

`minOAuthValidityMs` 默认 5 分钟。`expiresSoon = now + min >= credential.expires`。

过期（或即将过期）：

```ts
credentials.modify(providerId, async (current) => {
  if (current 不是 oauth) return undefined;      // 登出了
  if (!expiresSoon(current)) return undefined;  // 别人刚刷过
  return oauth.refresh(current, AbortSignal.any([signal, timeout 15s]));
});
```

refresh throw → `ModelsError("oauth")`，**modify 不写**，旧凭证还在。15s 超时防止 refresh 卡死锁。

显式要求了 `minOAuthValidityMs` 且 refresh 后仍 expiresSoon → throw（导出 bearer 给外部工具时不能给马上过期的 token）。默认 5 分钟窗口只触发 refresh，不在 refresh 后再卡一次。

最后 `oauth.toAuth(credential)`，失败也是 `"oauth"`。source 固定 `"OAuth"`。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 未配置 | undefined，applyAuth 变成 “Provider is not configured” |
| refresh invalid_grant | oauth error，用户需重新 login |
| store.read 失败 | ModelsError auth |
| 存了 oauth 但厂家只有 apiKey | undefined，不会用那把 access 当 api key |
| 并发两个请求即将过期 | 第二个 modify 看到已刷新，return undefined，用新 current |

## 下一课

OAuth 实现如何按需加载：[47-auth-oauth-load.ts.md](/series/pi-source/ai/108-auth-oauth-load-ts/)。
