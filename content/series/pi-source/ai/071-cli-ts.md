---
title: "10 · cli.ts — `pi-ai login` 小工具"
summary: "看一个最小 OAuth 宿主：readline 实现 AuthInteraction，凭证写进当前目录 auth.json。用来理解 login 回调长什么样，不是产品路径。"
tags: [pi, ai]
---
源码：`packages/ai/src/cli.ts`  
bin：`package.json` 的 `"pi-ai": "dist/cli.js"`。  
被谁调用：`npx @earendil-works/pi-ai login anthropic`。coding-agent 的 `/login` **不**用本文件，它走 TUI + `Models.login`。

## 本课目标

看一个最小 OAuth 宿主：readline 实现 `AuthInteraction`，凭证写进当前目录 `auth.json`。用来理解 login 回调长什么样，不是产品路径。

## 在系统中的位置

```text
pi-ai login [provider]
  builtinProviders().filter(有 oauth)
  provider.auth.oauth.login({ prompt, notify, signal })
    浏览器 URL / device code / 选登录方式
  写入 ./auth.json  { [providerId]: OAuthCredential }
```

## 命令

无参 / `help`：打印 usage 和厂家列表。  
`list`：id + name。  
`login [provider]`：没给厂家就编号选择。未知厂家 throw，main catch 后 exit 1。

厂家列表来自 `builtinProviders()`，只要 `auth.oauth` 非空。纯 API key 厂家（groq、deepseek）不出现——本 CLI 不提示粘贴 key。

## `AuthInteraction` 适配

`prompt`：`select` 印编号；其他类型当一行文本（secret 也明文，这是玩具 CLI）。

`notify`：

| event | 打印 |
|---|---|
| `auth_url` | 「Open this URL」+ 可选 instructions |
| `device_code` | verification URI + user code |
| `info` / `progress` | message |

没有 `onManualCodeInput` 这种扩展旧回调——用的是新 `AuthInteraction`（[42 课](/series/pi-source/ai/103-auth-types-ts/)）。

## `auth.json`

`loadAuth` 读失败当 `{}`。`saveAuth` 整文件覆盖，pretty-print。路径写死当前工作目录的 `auth.json`，不是 `~/.pi/agent/auth.json`。这是给库作者试 OAuth 的，和产品凭证**不是**同一份。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 未知命令 | throw → stderr + exit 1 |
| login 中途 Ctrl+C | signal 是新 AbortController，**没有**绑到 process 信号，cancel 不一定干净 |
| oauth.login throw | 同上，凭证不写 |
| 选择越界 | `Invalid selection` / `Unknown provider` |

## 下一课

给扩展看的 OAuth 类型入口：[11-oauth.ts.md](/series/pi-source/ai/072-oauth-ts/)。
