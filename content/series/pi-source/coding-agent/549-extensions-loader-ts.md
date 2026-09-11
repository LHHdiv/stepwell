---
title: "47 · extensions/loader.ts — 发现并执行扩展模块"
summary: "扩展跑在同一进程。用 jiti 即时编译 TS。打包成二进制时，把 pi-ai / pi-tui / typebox 等做成 virtualModules，避免用户扩展 resolve 到另一份拷贝（两份 AgentTool 类型会断）"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/extensions/loader.ts`（约 800 行）  
被谁调用：`DefaultResourceLoader` 的 `loadExtensionsCached`；SDK `discoverAndLoadExtensions`。

## 本课目标

扩展跑在**同一进程**。用 jiti 即时编译 TS。打包成二进制时，把 `pi-ai` / `pi-tui` / `typebox` 等做成 virtualModules，避免用户扩展 resolve 到另一份拷贝（两份 AgentTool 类型会断）。

## 发现 `discoverExtensionsInDir`

只一层：

1. `*.ts` / `*.js` 文件
2. 子目录 `index.ts` / `index.js`
3. 子目录 `package.json` 的 `pi.extensions[]`（`readPiManifest`）

`discoverAndLoadExtensions` 扫 `agentDir/extensions`、`cwd/.pi/extensions`、再加配置路径。

## 加载

`createExtensionRuntime()` 空 runtime。对每个路径 jiti import，取 `default` 工厂，`loadExtensionFromFactory`：调用工厂，收集它往 runtime 上登记的东西，包成 `Extension`（path、resolvedPath、handlers）。

`loadExtensionsCached`：cwd 变了或 `clearExtensionCache` 才重新 import。`/reload` 会清缓存。

工厂 throw → `errors` 一条，其它扩展继续。

## 别名

源码运行：jiti alias 指到 workspace 的 `packages/*/dist`。  
Bun/Node 二进制：`VIRTUAL_MODULES` 静态 import 的那份。旧 scope `@mariozechner/pi-*` 同样指向新包，兼容没改 import 的扩展。

## 失败与边界

扩展 `import "fs"` 用的是宿主 Node。恶意项目扩展能做进程能做的任何事——这就是 project trust 存在的原因。循环依赖：loader 不从 `core/index.ts` 再导出，避免和 `index.ts` 拉扩展类型成环。SEA/Bun 判断决定走 alias 还是 virtualModules。

## 下一课

[48-extensions-runner.ts.md](/series/pi-source/coding-agent/551-extensions-runner-ts/)：会话活着时如何 emit 事件、包工具。
