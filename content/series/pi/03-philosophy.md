---
title: 第03讲·设计哲学：自扩展智能体
summary: 拆解 ExtensionAPI 开放的八类能力与 jiti 动态加载机制，讲清 pi"装不同扩展就变成不同产品"的哲学与信任取舍。
objectives:
  - 列出 ExtensionAPI 开放的八类可注入能力
  - 说清扩展从 cwd/.pi/extensions 被 jiti 发现的加载链路
  - 解释 pi 为何敢于"无内置权限"而把信任交给进程分离
tags: [pi, 扩展系统, 设计哲学]
keyPoints:
  - ExtensionAPI（extensions/types.ts:1198）开放事件订阅、工具、命令、快捷键、CLI flag、provider、markdown、UI 八类能力
  - "扩展以工厂函数 (pi: ExtensionAPI) => void 注册（types.ts:1519），从 cwd/.pi/extensions 与 agentDir 经 jiti 动态加载（loader.ts:689/:436）"
  - 连内置能力都走扩展范式：examples 里有 custom-provider-anthropic / gitlab-duo / gondolin 沙箱 / sandbox 真实样例
  - 无内置权限系统：信任靠 client/server 进程分离 + 容器化兜底，扩展可把工具路由进微 VM（Gondolin）
---

上一讲走完生命线，你看到 `AgentSession.prompt()` 一路唤醒 `Agent`、跑 `runLoop`、派发工具。但有一个角色一直没登场，却是 pi 区别于 dsh 的灵魂——**扩展（extension）**。这一讲我们进设计哲学：pi 不是"一个能跑的编码智能体"，而是"一个能**长出新器官**的编码智能体框架"。

## 一、ExtensionAPI：pi 把"产品形态"也做成插件

在 `packages/coding-agent/src/core/extensions/types.ts:1198`，`ExtensionAPI` 这个接口定义了扩展能注入的**八类能力**：

1. **事件订阅**（30+ 种事件，如 `message_start`、`tool_call`）：扩展能在 agent 生命周期的任意节点插入逻辑；
2. **LLM 工具** `registerTool`：给智能体增加新本领（如"查数据库""发 Slack"）；
3. **斜杠命令** `registerCommand`：给用户增加新指令（如 `/deploy`）；
4. **键盘快捷键** `registerShortcut`：改终端交互；
5. **CLI flag** `registerFlag`：扩展自己的启动参数（未知 `--flag` 被收进 `unknownFlags: Map`，见 `cli/args.ts:204`）；
6. **provider 注册** `registerProvider`：接入新模型供应商；
7. **markdown 转换器**：改消息渲染；
8. **UI 组件**：往屏幕注入新面板。

对比 dsh：dsh 的 Cordis 插件主要替换"运行时零件"（工具、钩子、能力）；pi 的 `ExtensionAPI` 连**命令、快捷键、provider、UI 组件**都能注入。换句话说，dsh 让你"换引擎零件"，pi 让你"重组整车"。这就是为什么 README 自称 "self extensible coding agent" 而非单纯的 "coding agent"。

## 二、扩展长什么样、从哪来

一个扩展就是个工厂函数（`types.ts:1519`）：

```ts
type ExtensionFactory = (pi: ExtensionAPI) => void
// 例：pi.registerTool({...}); pi.registerCommand({...}); pi.on('message_start', ...)
```

加载链路在 `packages/coding-agent/src/core/extensions/loader.ts`：

- `discoverAndLoadExtensions()`（`loader.ts:689`）从两个目录发现扩展：`cwd/.pi/extensions`（当前项目的扩展）和 `agentDir/extensions`（用户级扩展）；
- `loadExtensionModule`（`loader.ts:436`）用 **jiti** 动态加载 TS/JS 源码——意味着扩展**不需要预编译**，改了直接生效；
- 工厂函数被调用，拿到 `ExtensionAPI` 后注册自己的能力；`runner.ts` 再把这些能力分发到对应事件/命令/快捷键上，共享一个 `ExtensionRuntime`（含 `flagValues`、provider 注册队列，见 `types.ts:1600-1693`）。

这套机制有两个工程亮点：**① 零编译热加载**（jiti），**② 作用域分层**（项目级 vs 用户级扩展共存）。它把"定制 pi"的门槛从"改核心源码"降到"丢一个文件夹进 `.pi/extensions`"。

> **知识拓展：为什么连"内置能力"也走扩展范式？**
> 看 `packages/coding-agent/src/extensions/index.ts:4`，pi 自带的内置扩展**只有 `llama.cpp` 一个**。这不是偷懒，而是哲学示范：第一方能力也通过同一个 `ExtensionAPI` 接入，和第三方扩展平起平坐。你在 `packages/coding-agent/examples/extensions/` 下能看到一长串真实样例：`custom-provider-anthropic`（换模型供应商）、`custom-provider-gitlab-duo`（换供应商）、`sandbox`（工具沙箱）、`gondolin`（把工具路由进微 VM 做隔离）。**这些是活证据**——pi 把"支持新供应商""做沙箱隔离"都当成"写一个扩展"，而不是"改核心"。生态的可生长性，由此而来。

## 三、没有内置权限系统：信任交给进程分离

第 00 讲提过一句要害：pi **没有**内置权限系统（README:40）。这看似危险，其实是深思熟虑的取舍，和第 25 讲的 client/server 分离互为表里。

逻辑是这样的：

- 如果权限系统写在核心里，它就只能按核心作者设想的方式工作，用户想要细粒度策略反倒受限；
- pi 的选择是——**核心不做权限，把"信任边界"外推到进程边界和扩展**。你在本地直接跑 `coding-agent` 时，它确实以你的权限运行（和你自己敲命令没区别）；但你也可以：
  - 走 `client`/`server` 分离，让**持 Key 的大脑跑在受信任的服务器**，本地 UI 只是无秘客户端（第 25–27 讲）；
  - 用 `gondolin` 扩展把内置工具和 `!` 命令**路由进一个本地 Linux 微 VM**，实现文件系统/网络隔离；
  - 或直接用 README 列的 Plain Docker / OpenShell 把整个进程装进沙箱。

也就是说，pi 把"权限"从"内置功能"重新定义为"**部署形态**"——你用哪种进程拓扑、哪种扩展，就得到哪种信任等级。这比"核心写死一套权限"更灵活，但也要求使用者**自己承担隔离责任**（第 00 讲提醒过：动手跑前请在受信任目录测试）。

## 四、持久会话：ExtensionAPI 之外的另一条主线

哲学上还有第二根主轴——**会话是可持久、可恢复的**。这由 `packages/agent/src/harness/` 承担：

- `AgentHarness`（`harness/agent-harness.ts:305`）是一个"常驻的、跨进程存活"的会话宿主，不同于一次性 `Agent`；
- `SessionState`（`harness/session/state.ts:50`）记录会话状态；
- `reducer.ts:506` 的 `reduceLaneState` 用 reducer 模式把并发的"泳道（lane）"状态归约成一致快照。

"lane"这个词值得记：pi 允许一个会话里有多条并发工作泳道（类比多标签页），reducer 负责把它们合并成对外一致的 `SessionSnapshot`（协议层 DTO，第 10 讲）。**可扩展（ExtensionAPI）+ 可持久（harness/lane）** 合起来，才是 pi 想成为的"终身伙伴型智能体"——既能长新本领，又不丢历史。

## 试一试

在你的 pi 副本里做两件探查，把"哲学"变成"眼见为实"：

1. 打开 `packages/coding-agent/src/core/extensions/types.ts`，跳到 `ExtensionAPI` 定义（约 `:1198`），数一数它暴露的方法里，名字以 `register` 开头的有几个——这就是"扩展能注入什么"的清单；
2. 打开 `packages/coding-agent/examples/extensions/`，列出子目录名，挑一个（如 `gondolin` 或 `custom-provider-anthropic`）读它的入口文件，看它用了 `pi.registerXxx` 里的哪几个——验证"真实扩展确实只靠 ExtensionAPI 就能改写产品形态"。

## 下一讲预告

哲学铺垫够了，下一讲我们真刀真枪**动手跑起来**：装依赖、构建、设 API Key、启动交互式 pi，并观察它启动时打印的包信息与 TUI 行为——把前四讲的方法论、地图、生命线、哲学，在终端里对齐成一次真实体验。
