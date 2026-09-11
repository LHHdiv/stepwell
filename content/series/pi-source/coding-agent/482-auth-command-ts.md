---
title: "14 · auth-command.ts — auth 子命令的 argv 语法"
summary: "看懂为什么 auth 不走 parseArgs 的主循环当普通位置参数。pi auth print-api-key --provider anthropic 必须先被认成子命令，再把剩余旗标交给原来的 Args。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/auth-command.ts`  
被谁调用：`main.ts` 在 `parseArgs` 之后识别 `auth`；`auth-check` / `credential-print` 复用校验。

## 本课目标

看懂为什么 auth 不走 `parseArgs` 的主循环当普通位置参数。`pi auth print-api-key --provider anthropic` 必须先被认成子命令，再把剩余旗标交给原来的 `Args`。

## 在系统中的位置

```text
main.ts argv
  parseAuthCommand(rawArgs)
    undefined → 不是 auth，继续主路径
    AuthCommand → parseArgs(command.args)
                  validateAuthCommandArgs
                  check / print-api-key / print-bearer-token
```

`isAuthCommandHelp`：`pi auth`、`pi auth help`、带 `--help`/`-h` 打专用帮助，不进 ModelRuntime。

## `parseAuthCommand`

`args[0] !== "auth"` 返回 `undefined`。`args[1]` 必须是：

- `check`
- `print-api-key` → kind `api_key`
- `print-bearer-token` → kind `bearer_token`

其它 → throw `AuthCommandError`。

从 index 2 扫旗标：

| 旗标 | 允许的 kind | 作用 |
|---|---|---|
| `--json` `--credentials` `--no-refresh` | 仅 check | JSON 输出、打印凭证、禁止刷新 |
| `--min-expiry 30m` | 仅 bearer_token | 最短剩余有效期；单位 ms/s/m/h |

不认识的 token 推进 `commandArgs`，稍后由 `parseArgs` 当 `--provider` / `--model` 解析。

`--min-expiry` 正则：`^(\d+)(ms|s|m|h)$`。缺值或格式错 throw。

## `validateAuthCommandArgs`

在 `parseArgs(command.args)` 之后：

- `unknownFlags` 非空：未知长选项，报「Auth commands only accept --provider and --model」一类
- 禁止 `--api-key`、位置消息、`@file`
- check / 打印都要求至少 `--provider` 或 `--model`

## `getAuthCredential`

从 `AuthResult` 抽可打印字符串：优先 `auth.apiKey`，否则找 `Authorization: Bearer …`。OAuth 打印的是 access token，不是 refresh token。

## 失败与边界

`AuthCommandError` 是空子类，main 靠 `instanceof` 把它打到 stderr 并 `exit(1)`，不走会话诊断通道。帮助文本写死命令名 `pi`，fork 若改了 `APP_NAME`，usage 字符串里的 `pi` 仍可能对不齐——`getAuthCommandUsage` 用的是 `APP_NAME`，`printAuthCommandHelp` 写死 `pi`。

## 下一课

[15-credential-print.ts.md](/series/pi-source/coding-agent/484-credential-print-ts/)：把校验过的 provider 变成 stdout 上的一串 key。
