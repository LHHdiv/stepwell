---
title: "43 · auth/context.ts — 默认的 env / 文件探测"
summary: "看出浏览器安全：importNodeModule(\"node:fs/promises\") 用变量 specifier；process.env 经 globalThis.process 读取，浏览器没有就当空。"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/context.ts`  
被谁调用：`createModels()` 没传 `authContext` 时；`envApiKeyAuth.resolve` 读环境变量；Vertex ADC `fileExists`。

## 本课目标

看出浏览器安全：`importNodeModule("node:fs/promises")` 用变量 specifier；`process.env` 经 `globalThis.process` 读取，浏览器没有就当空。

## `defaultProviderAuthContext`

`env`：trim 后空字符串当 undefined。  
`fileExists`：`~` 换成 `os.homedir()`，`fs.access`，任何 throw（含模块不存在）返回 false。

不缓存 ADC 探测——和 `env-api-keys.ts` 那份启动竞态缓存是另一条路。auth 路径每次 resolve 都 access 文件，正确但略慢。

## 失败与边界

Vite 打包不会静态跟上 node:fs。沙箱里 Bun 空 `process.env` 时，本 context 可能读不到变量；`getProviderEnvValue` 另有 /proc 回退，但 **AuthContext.env 不用它**。厂家若只经 AuthContext 读 env，Bun sandbox 要靠 coding-agent 启动时 patch process.env，或注入自定义 context。

## 下一课

内存凭证库：[44-auth-credential-store.ts.md](/series/pi-source/ai/105-auth-credential-store-ts/)。
