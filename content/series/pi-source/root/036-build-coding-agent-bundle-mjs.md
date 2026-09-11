---
title: "32 · build-coding-agent-bundle.mjs — 把 CLI 打成可发布的 ESM bundle"
summary: "弄清三件事：入口是 已经 tsc 过的 dist/.js 不是 src；哪些包必须 external；动态 import 的 OAuth/Bedrock/worker 为什么要第二次 build。失败时用户拿到的 bin.pi 要么缺文"
tags: [pi, root]
---
源码：`scripts/build-coding-agent-bundle.mjs`  
被谁调用：`packages/coding-agent` 的 `npm run build`：`build:unbundled && node ../../scripts/build-coding-agent-bundle.mjs`。因此根 `npm run build` 的最后一跳会跑到这里。`profile-coding-agent-node.mjs --bundle` 也会先触发 coding-agent 的 `build`。

## 本课目标

弄清三件事：入口是 **已经 tsc 过的 dist/*.js** 不是 src；哪些包必须 external；动态 import 的 OAuth/Bedrock/worker 为什么要第二次 build。失败时用户拿到的 `bin.pi` 要么缺文件，要么启动时还去解析一堆 workspace 路径。

## 在仓库中的位置

```text
packages/coding-agent npm run build
  tsc → dist/cli.js dist/index.js dist/rpc-entry.js ...
  本脚本
    esbuild 主包: cli, index, rpc-entry → dist/bundle/（可 split chunks）
    esbuild 懒加载: anthropic/oauth、bedrock-converse-stream、
                    各家 oauth、image-resize-worker
    chmod 755 cli.js rpc-entry.js
    校验没有意外 external
```

`package.json` 的 `bin.pi` 指向 `dist/bundle/cli.js`。`auto-pi.sh` 也 exec 这一份。

## 文件做什么

### 共同选项

- `platform: node`，`format: esm`，`target: node22.19`（对齐 engines）
- `define: { PI_BUNDLED_NODE: "true" }`：源码里用这个开关区分「我在 bundle 里」，例如别去读 tsconfig paths
- `tsconfigRaw: { compilerOptions: {} }`：**关掉 monorepo path alias**。发布 bundle 必须按真实 package exports 解析，和用户安装后一致
- banner 注入 `createRequire`，让 ESM bundle 里仍能 `require()` 到延迟加载的 CJS（jiti）
- `minifySyntax` + `minifyWhitespace`，不要 mangle 标识符到不可调试
- `legalComments: none`，减小体积

### 两个 plugin

`lazy-jiti-transform`：把 `jiti/static` 换成「第一次 createJiti 才 require("jiti")」。Bun 那边用 static 是为了把 Babel transform 编进独立二进制；Node 包要避免启动就加载 Babel。

`https-proxy-agent-named-export`：动态 import `https-proxy-agent` 时包一层 named export，修默认导出互操作。只对 `kind === "dynamic-import"` 动手，避免误伤静态图。

### external 白名单

始终 external：`@earendil-works/chord`（及其子路径）、`@silvia-odwyer/photon-node`（wasm，不能打进 js）。另外允许作为 external 出现在 metafile 里的：`jiti`、`bufferutil`、`utf-8-validate`、`kerberos`、`supports-color`——都是可选加速/提示，缺了有 JS 回退或错误提示。

`validateExternalImports`：主包+懒加载两次 metafile 里，凡 `imported.external` 且不是 builtin、不在白名单 → throw。防止有人 import 了 `lodash` 却没打进 bundle 也没声明依赖。

### 两次 build 的原因

主包 `splitting: true`，entryNames 是 cli/index/rpc-entry。动态 `import(variable)` 和 `new URL(worker)` esbuild 跟不过去。脚本先在主 metafile 里 **定位** `bedrock-converse-stream.lazy.js` 和 oauth `load.js` 被分到了哪个输出目录，再把真正的实现和 worker **发射到同一目录**，运行时相对路径才能对上。若 Bedrock 和 OAuth loader 被分到不同目录，直接 throw。image-resize 同理，必须和 worker 同目录。

缺输入文件（还没 unbundled build）→ throw 相对仓库根的路径，提示先编 workspace。

最后打印 `dist/bundle` 的文件数和 MiB。这是体积回归的人眼基线，没有自动预算（和 entry-graphs 不同）。

## 关键逻辑

失败会怎样：

- 忘了先 tsc：缺 `dist/cli.js`，本脚本拒绝覆盖出一个半残 bundle
- 新加了一个必须运行时存在的 npm 依赖却把它 external 了：启动报 cannot find package。白名单故意短
- 新加 OAuth 厂家忘了放进第二次 entryPoints：运行时 `import("./foo.js")` 404。登录子命令到那一家才爆，check 不一定能抓到——需要 coding-agent 自己的测试或手动登录
- `chmod 755` 失败（Windows）：可能 throw。Windows 用户多用 `node dist/bundle/cli.js` 或 bat shim
- PI_BUNDLED_NODE 未定义到源码：开发 tsx 路径和 npm 路径行为分叉，难查

## 和启动链的关系

**用户和 auto-pi 的启动链第一份 JS。** `pi-test.sh` 不走它。对照：

| | 开发 | 发布 |
|---|---|---|
| 入口 | experimental/cli.ts via tsx | dist/bundle/cli.js |
| 解析 | tsconfig paths → src | 单文件/chunk，chord/photon external |
| 扩展加载 | jiti 延迟 | 同左，靠 lazy plugin |

## 下一课

把 lockfile 裁成 CLI 自带的 shrinkwrap：[33-generate-coding-agent-shrinkwrap.mjs.md](/series/pi-source/root/037-generate-coding-agent-shrinkwrap-mjs/)。
