---
title: "85 · bun/runtime-setup.ts — Bun 特有的 provider 注册"
summary: "Node 入口的 OAuth 走默认实现；Bun 编译体要 registerBunOAuthFlows（ai 包提供）才能在无 Node 某些 crypto/http 细节时完成浏览器登录。Bedrock 的 AWS SDK 路径同样按"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/bun/runtime-setup.ts`

```ts
process.title = APP_NAME;
process.emitWarning = () => {};
registerBunOAuthFlows();
setBedrockProviderModule(bedrockProviderModule);
```

Node 入口的 OAuth 走默认实现；Bun 编译体要 `registerBunOAuthFlows`（ai 包提供）才能在无 Node 某些 crypto/http 细节时完成浏览器登录。Bedrock 的 AWS SDK 路径同样按运行时注入，避免 Node 包被 bun compile 错误打进产物。

吞 warning：编译二进制的 stdout 也可能被脚本解析。

## 下一课

utils 从路径开始：[86-utils.paths.ts.md](/series/pi-source/coding-agent/627-utils-paths-ts/)
