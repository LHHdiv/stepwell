---
title: "47 · auth/oauth/load.ts — 动态 import 与 Bun 静态表"
summary: "importOAuthModule(specifier) 用变量路径，并且按 import.meta.url 是 .js 还是 .ts 改写后缀。bundler 无法静态跟踪到 node:http。Bun 编译则预先 registerB"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/oauth/load.ts`  
被谁调用：各厂家 `lazyOAuth({ load: loadAnthropicOAuth })`；`registerBunOAuthFlows`。

## 本课目标

`importOAuthModule(specifier)` 用变量路径，并且按 `import.meta.url` 是 `.js` 还是 `.ts` 改写后缀。bundler 无法静态跟踪到 `node:http`。Bun 编译则预先 `registerBundledOAuthFlowLoaders`。

## 加载函数

`loadAnthropicOAuth` 等七个：有 bundledLoaders 就走它，否则 `import("./anthropic.ts")` 取导出单例。`loadRadiusOAuth(options)` 调工厂，因为 gateway 运行时才知道。

`registerBundledOAuthFlowLoaders` 整表替换，不是 merge。

## 失败与边界

动态 import 失败：login 一开始就炸。Bun 忘了 register：同样炸，错误更像模块找不到。源码测试跑 ts、dist 跑 js，后缀改写错了会 404。

## 下一课

PKCE：[48-auth-oauth-pkce.ts.md](/series/pi-source/ai/109-auth-oauth-pkce-ts/)。
