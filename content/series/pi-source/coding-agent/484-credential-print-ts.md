---
title: "15 · credential-print.ts — 打印一把能用的 key"
summary: "指出：打印走 ModelRuntime.getAuth()，所以会刷新「不到五分钟过期」的 OAuth，并写回 auth.json。这是故意的：脚本拿出去的 token 应当还能用一会儿。Bearer 默认还要求至少 30 分钟剩余（-"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/credential-print.ts`  
被谁调用：`main.ts` 的 `print-api-key` / `print-bearer-token`。

## 本课目标

指出：打印走 `ModelRuntime.getAuth()`，所以会刷新「不到五分钟过期」的 OAuth，并写回 `auth.json`。这是故意的：脚本拿出去的 token 应当还能用一会儿。Bearer 默认还要求至少 30 分钟剩余（`--min-expiry` 可改）。

## 在系统中的位置

```text
main.ts
  resolveCredentialForPrint(args, modelRuntime, kind, minExpiryMs)
    validateAuthCommandArgs
    listCredentials → 哪些 provider 有存盘凭证
    选中恰好一家
    getAuth → getAuthCredential
    console.log(value)
```

成功只打印凭证本身，方便 `$(pi auth print-api-key ...)`。错误走 `AuthCommandError`。

## 如何选出 provider

### 给了 `--provider`

`getProvider` 找不到 → 未知厂家。若同时给 `--model`，必须在这家下 `resolveCliModel` 成功。

### 只给 `--model`

遍历**已有凭证**的厂家，用 `resolveCliModel({ cliProvider: 这家, cliModel })`。带 warning「Using custom model id」的不算（那是硬造的 id，不是目录里的模型）。0 家 → 模型不存在；多于 1 家 → 必须再加 `--provider`。

## 类型过滤

`kind === "api_key"` 跳过 `type === "oauth"` 的厂家。  
`kind === "bearer_token"` 只接受 oauth。

过滤完：

- 恰好 1 个值：返回
- 0 个：按「OAuth 当 API key 打」/「非 OAuth 当 bearer 打」给更准的错
- 多个：列出 id，要求 `--provider`

Bearer 调用 `getAuth` 时传 `minOAuthValidityMs`（默认 30 分钟）。API key 路径不传这个。

## 失败与边界

`getAuth` 会 refresh + persist。本命令有副作用，不是只读。`signal` 可取消等待。自定义模型 id 被排除，避免「随便写个名字碰巧匹配多家」。

## 下一课

[16-list-models.ts.md](/series/pi-source/coding-agent/486-list-models-ts/)：`pi --list-models` 把可用模型打成表。
