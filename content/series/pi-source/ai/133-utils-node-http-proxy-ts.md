---
title: "72 · utils/node-http-proxy.ts — `HTTPS_PROXY` / `NO_PROXY`"
summary: "实现一套常见的 protocolproxy / allproxy / noproxy 语义（大小写都认，env overlay 优先）。NOPROXY= 不代理。后缀匹配、端口可选。IPv6 方括号。"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/node-http-proxy.ts`  
被谁调用：Bedrock `NodeHttpHandler`、Codex 的 fetch/WS。OpenAI/Anthropic SDK 自己读环境变量，不经过这里。

## `resolveHttpProxyUrlForTarget(target, env?)`

实现一套常见的 `protocol_proxy` / `all_proxy` / `no_proxy` 语义（大小写都认，env overlay 优先）。`NO_PROXY=*` 不代理。后缀匹配、端口可选。IPv6 方括号。

返回 `URL`，协议必须是 `http:` 或 `https:`。SOCKS/PAC throw `UNSUPPORTED_PROXY_PROTOCOL_MESSAGE`。无效 URL throw 带原字符串。

无代理返回 undefined，调用方走直连。

## 失败与边界

`https_proxy` 指向 http 代理（常见）：协议是 `http:`，合法，CONNECT 由 HttpsProxyAgent 做。目标 URL parse 失败：当无代理（空字符串那条路径）。不要把代理密码 log 出来——本文件也不 log。

## 下一课

读环境变量的统一入口：[73-utils-provider-env.ts.md](/series/pi-source/ai/134-utils-provider-env-ts/)。
