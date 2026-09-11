---
title: "08 · agent-session-services.ts — 按工作目录准备零件"
summary: "看懂「服务」和「会话」为什么拆开。换 cwd 时服务必须重建（项目级 settings.json、.pi/、Skill 都变了），但拆的方式要让 main 仍能在 new AgentSession 之前决定模型、工具白名单。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/agent-session-services.ts`  
被谁调用：`main.ts` 的 `createRuntime` 闭包；`createAgentSessionFromServices` 再把零件交给 sdk。

## 本课目标

看懂「服务」和「会话」为什么拆开。换 cwd 时服务必须重建（项目级 `settings.json`、`.pi/`、Skill 都变了），但拆的方式要让 `main` 仍能在 new `AgentSession` **之前**决定模型、工具白名单。

## 在系统中的位置

```text
createRuntime({ cwd, agentDir, sessionManager })
  services = await createAgentSessionServices({ cwd, agentDir, settingsManager, ... })
  // 此时还没有 AgentSession
  // 可以用 services.modelRuntime 解析 --model、--models
  created = await createAgentSessionFromServices({ services, sessionManager, model, tools, ... })
```

文件头注释原意：这些服务随 **有效 session cwd** 重建。CLI 给的资源路径必须先变成绝对路径，否则换 cwd 后相对路径会被解释到错误的地方。`main` 里 `resolveCliPaths` 就是为这个。

## `createAgentSessionServices`

逐步：

### 1. 路径

```ts
const cwd = resolvePath(options.cwd);
const agentDir = options.agentDir ? resolvePath(options.agentDir) : getAgentDir();
```

`cwd` 是会话的工作目录，可能不是 `process.cwd()`（`--session` 打开了别的项目）。`agentDir` 仍是 `~/.pi/agent`，全局认证不跟项目走。

### 2. ModelRuntime

```ts
const modelRuntime = options.modelRuntime ?? (await ModelRuntime.create({
	authPath: join(agentDir, "auth.json"),
	modelsPath: join(agentDir, "models.json"),
	signal: options.modelRuntimeSignal,
}));
```

`main` 每次 createRuntime 都会 new 一个（不传入已有 runtime），15 秒超时。`auth.json` / `models.json` 在全局目录。ModelRuntime 的内部（厂家列表、OAuth）是 `core/model-runtime.ts`，本课当「能 stream、能查模型、能 registerProvider 的对象」。

### 3. SettingsManager + ResourceLoader

```ts
const settingsManager = options.settingsManager ?? SettingsManager.create(cwd, agentDir);
const resourceLoader = new DefaultResourceLoader({ ..., cwd, agentDir, settingsManager });
await resourceLoader.reload(options.resourceLoaderReloadOptions);
```

`main` **会**传入已经按 `projectTrusted` 建好的 SettingsManager，所以这里通常不走默认分支。信任决定了项目级扩展/hooks 能不能加载。

`reload` 扫描：全局 + 项目的 Skill、Extension、提示模板、主题、`AGENTS.md` 一类上下文文件。`resourceLoaderReloadOptions.resolveProjectTrust` 在「目录里有需要信任的资源、且尚未决定」时，加载器会回调 `main` 去弹信任 UI。弹完把结果写入 `projectTrustByCwd`，避免换来换去重复问。

### 4. 扩展登记的厂家

```ts
for (const { name, config, extensionPath } of extensionsResult.runtime.pendingProviderRegistrations) {
	try { modelRuntime.registerProvider(name, config); }
	catch { diagnostics.push({ type: "error", ... }); }
}
```

扩展可以声明「我是一个新 Provider」。必须在 `reload` 之后、`refresh` 之前登记，否则模型表里没有这家。失败变成 diagnostics，不抛死整个启动——但 `main` 看到 error 仍会 `exit(1)`。原生厂家（`registerNativeProvider`）同样处理。

登记完清空 pending 数组，防止同一 loader 被 reload 时登记两次。

### 5. `modelRuntime.refresh({ allowNetwork: false })`

启动阶段**不准为了刷新模型目录去联网**。用本地缓存/内置表。RPC 模式在 `main` 后半才后台 `refresh`。交互模式进 TUI 后再刷。这是启动延迟和离线友好的取舍。

### 6. 扩展 CLI 旗标

`applyExtensionFlagValues`：`parseArgs` 不认识的长选项进了 `unknownFlags`。现在扩展已经加载，对照 `extension.flags`：

- 登记为 boolean：出现即 `true`（`--foo` 不需要值）
- 登记为 string：必须是字符串，否则 error「requires a value」
- 完全没登记：error「Unknown option --x」

内核故意把「未知长选项」延迟到这里判定，才能让扩展拥有自己的 CLI。短选项没有这个通道（见 args 课）。

### 返回值

```ts
{ cwd, agentDir, modelRuntime, settingsManager, resourceLoader, diagnostics }
```

没有 `session`，没有 `Agent`。

## `createAgentSessionFromServices`

薄封装，把 services 的字段平铺进 `createAgentSession({...})`。存在的唯一理由：让调用方在两个函数之间插入「解析模型、思考等级、工具」的代码。`main` 的 `buildSessionOptions` 就插在这里。

## 失败与边界

diagnostics 是数组，本函数很少 throw。扩展厂家登记失败、未知旗标，都是 error 诊断。`main` 合并后决定是否 `exit(1)`。SDK 直接调 `createAgentSession` 时可以绕过本文件，自己准备 loader。

## 下一课

零件齐了，焊接发生在 [09-sdk.ts.md](/series/pi-source/coding-agent/475-sdk-ts/)。
