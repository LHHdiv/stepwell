---
title: "13 · bedrock-provider.ts — 把 Bedrock 实现焊给 lazy 包装"
summary: "对照 api/bedrock-converse-stream.lazy.ts：变量 specifier 动态 import 是为了让浏览器 bundler 不要跟上 AWS SDK。Bun compile 同样跟不上，所以把已经静态 i"
tags: [pi, ai]
---
源码：`packages/ai/src/bedrock-provider.ts`（6 行）  
入口：`@earendil-works/pi-ai/bedrock-provider`。  
被谁调用：Bun 编译入口 `setBedrockProviderModule(bedrockProviderModule)`。

## 本课目标

对照 `api/bedrock-converse-stream.lazy.ts`：变量 specifier 动态 import 是为了让浏览器 bundler 不要跟上 AWS SDK。Bun compile 同样跟不上，所以把已经静态 import 的 `{ stream, streamSimple }` 交回去。

## 在系统中的位置

```text
bedrock-converse-stream.lazy.ts
  bedrockConverseStreamApi()
    lazyApi(async () => bedrockModuleOverride ?? importNodeOnlyApi("./bedrock-converse-stream.ts"))

Bun 启动
  import { stream, streamSimple } from "./api/bedrock-converse-stream.ts"  // 静态
  setBedrockProviderModule({ stream, streamSimple })
```

本文件只是那份 `{ stream, streamSimple }` 的具名导出，方便编译入口一行 import。

## 失败与边界

没调用 `setBedrockProviderModule` 时，lazy 走动态 import。Node 正常；Bun 独立二进制会在第一次用 Bedrock 模型时找不到模块。覆盖之后所有 `bedrockConverseStreamApi()` 共享同一份实现（模块级变量）。

## 下一课

会话结束时收掉 WebSocket：[14-session-resources.ts.md](/series/pi-source/ai/075-session-resources-ts/)。
