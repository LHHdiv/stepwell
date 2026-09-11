---
title: "12 · bun-oauth.ts — 独立二进制里的静态 OAuth"
summary: "理解为什么 Node 用动态 import 加载 OAuth，而 Bun 编译产物必须反过来：把实现静态 import 再注册进 load.ts 的 loader 表。"
tags: [pi, ai]
---
源码：`packages/ai/src/bun-oauth.ts`  
入口：`@earendil-works/pi-ai/bun-oauth`。  
被谁调用：coding-agent 的 Bun 编译入口，在启动时 `registerBunOAuthFlows()`。

## 本课目标

理解为什么 Node 用动态 import 加载 OAuth，而 Bun 编译产物必须反过来：把实现静态 import 再注册进 `load.ts` 的 loader 表。

## 在系统中的位置

```text
普通 Node
  loadAnthropicOAuth() → import("./anthropic.ts")   // bundler 看不穿变量 specifier

Bun compile
  registerBunOAuthFlows()
    registerBundledOAuthFlowLoaders({
      anthropic: () => anthropicOAuth,   // 已经静态 import
      ...
      radius: createRadiusOAuth,
    })
  之后 loadAnthropicOAuth() 走 bundledLoaders，不再 dynamic import
```

Bun compile 跟不了 `importOAuthModule(specifier)` 这种变量路径（和 Bedrock lazy 同一招）。不注册的话，独立二进制里 `/login anthropic` 会在运行时找不到模块。

## `registerBunOAuthFlows`

静态 import 七家：anthropic、openai-codex、github-copilot、openrouter、kimi-coding、xai、radius。然后交给 `registerBundledOAuthFlowLoaders`。

radius 是工厂 `createRadiusOAuth`，因为 gateway URL 是运行时配置；其他是单例 `OAuthAuth` 对象。

本函数可重复调用，后写覆盖 `bundledLoaders`（见 load.ts）。产品只在启动调一次。

## 失败与边界

不调用本函数时，Bun 二进制走动态 import 分支，编译进产物的模块图里没有那些 OAuth 文件 → 运行时 import 失败。Node 测试不要调它，否则会把 Node-only 的 http 服务器代码提前加载进本该懒加载的图。

## 下一课

同一问题的 Bedrock 版本：[13-bedrock-provider.ts.md](/series/pi-source/ai/074-bedrock-provider-ts/)。
