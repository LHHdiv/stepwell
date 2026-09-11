---
title: "33 · generate-coding-agent-shrinkwrap.mjs — 给 CLI 钉死传递依赖"
summary: "理解为什么不能把根 package-lock.json 原样塞进 CLI 包：根 lock 含整个 monorepo 的 dev 依赖、workspace link:。本脚本从根 lock BFS 出 coding-agent 运行时闭"
tags: [pi, root]
---
源码：`scripts/generate-coding-agent-shrinkwrap.mjs`  
被谁调用：`npm run shrinkwrap:coding-agent`（写文件）；`npm run check:shrinkwrap`（`--check`）；`release.mjs` 在 generate:models 之后重生。产物：`packages/coding-agent/npm-shrinkwrap.json`，随 CLI 包发布。

## 本课目标

理解为什么不能把根 `package-lock.json` 原样塞进 CLI 包：根 lock 含整个 monorepo 的 dev 依赖、workspace `link:`。本脚本从根 lock **BFS 出 coding-agent 运行时闭包**，把内部包改写成 registry tarball URL，删掉 dev/link 元数据，并强制：有 lifecycle 脚本的包必须在白名单里。

## 在仓库中的位置

```text
根 package-lock.json (lockfileVersion 3)
  generateShrinkwrap()
    队列起点: coding-agent/package.json 的 dependencies+optional
    内部包: 用该包 package.json + registryTarballUrl(name, version)
    外部包: 按 Node 解析规则在 lock 的 packages 图上找
    validateShrinkwrap()
  写或对比 packages/coding-agent/npm-shrinkwrap.json
```

npm 在安装带 shrinkwrap 的包时，优先用这份钉传递依赖。用户 `npm i -g @earendil-works/pi-coding-agent` 不会漂到「当天新发布的子依赖」。

## 文件做什么

### 内部 vs 外部

内部：`@earendil-works/pi-*` 和 chord。它们在根 lock 里是 workspace 路径，没有 registry integrity。shrinkwrap 里写成 `resolved: https://registry.npmjs.org/<name>/-/<tarball>-<ver>.tgz`，版本取自该包 package.json（锁步后应等于 CLI 版本）。发版顺序必须先让这些内部包已经（或即将）以同一版本出现在 registry——`publish.mjs` 按名单逐个 publish，`publish-release-announcement.mjs` 会等到都可下载。

### 解析外部依赖

从 `fromLockPath` 向上走 `node_modules/<name>`，模仿 Node 模块查找。多匹配且无法唯一决定则 throw。这保证 shrinkwrap 里的嵌套路径和实际 hoisting 一致。

### 白名单 `allowedInstallScriptPackages`

当前三条：

- `@google/genai@2.21.0` — preinstall 是 no-op
- `esbuild@0.28.2` — postinstall 选平台二进制
- `protobufjs@7.6.6` — postinstall 只警告版本 scheme

新包带 `hasInstallScript` 且不在表里 → validate 失败。表里的 id 若图中不再出现 → 也失败（逼你删过期白名单，避免「以为还在审」）。用户安装仍常用 `--ignore-scripts`，白名单是对「有人没加这个 flag」的纵深防御。

### `--check`

生成到内存，和磁盘字节级对比（含缩进和 key 排序）。`sortedObject` / `fieldOrder` 让生成稳定，避免无意义 diff。过期则提示 `npm run shrinkwrap:coding-agent`。

其它校验：禁止 `link` 条目、禁止 `file:`/`workspace:` resolved、每个依赖名都要在图里、至少有一个 `os`/`cpu`/`libc` 的平台可选包（证明 optional 原生依赖没被裁掉）。

## 关键逻辑

失败会怎样：

- 根 lock 改了但忘了重生 shrinkwrap → `check` 红，发不了版。这是故意的，不能让 CLI 带着旧图走
- 白名单漏了新 lifecycle → check 红，强迫人去读那个包的 install 脚本
- 内部包 resolved URL 指向尚未发布的版本：shrinkwrap 文件本身仍合法，用户在内部包 publish 完成前安装会 404。所以发版顺序和 announcement 等待很重要
- `lockfileVersion !== 3` → 直接 throw，不兼容 npm 旧 lock 格式

## 和启动链的关系

用户 `npm install` 时生效，在 `pi` 进程启动之前。源码开发不读 shrinkwrap（workspace 协议优先）。

## 下一课

安装器自己的 lock 根：[34-generate-coding-agent-install-lock.mjs.md](/series/pi-source/root/038-generate-coding-agent-install-lock-mjs/)。
