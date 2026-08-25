---
title: 第38讲·client 与 API Gateway：浏览器与宿主的双城记
summary: 拆解 client 包族的浏览器侧架构与 api-gateway 的 Typert RPC：同一份描述符契约的两端。
objectives:
  - 描述 client 包族"shell 启动、宿主通信、UI 服务、功能插件"的分层
  - 解释 Typert RPC 的 InvocationDescriptor 契约如何保证类型安全
  - 区分 Host 与 Client 两侧 Cordis 环境各自的职责
tags: [deepseek-harness, client, rpc]
keyPoints:
  - client 是 web GUI 的浏览器侧；宿主半侧是独立的 host 包
  - api-gateway 提供 ctx.typertGateway（Host 端）与 ctx.remote（Client 端）
  - 两端使用同一份生成的 InvocationDescriptor，参数完全匹配才放行
  - 业务方法用 @Remote/@RemoteScope 标记，结果同样过校验
---

智能体引擎跑起来了，用户在哪看见它？dsh 的答案是双城记：**浏览器里的 GUI（client 包族）**和**宿主进程里的服务（host 包）**，中间由 **API Gateway** 的 RPC 通道相连。本讲拆这三者。

## 一、client 包族：浏览器侧也是插件化的

packages/client/README 的定位：

> dsh web GUI 的**浏览器侧**：shell 启动、浏览器与宿主通信、共享 UI 服务和功能插件。

注意最后两个字——连前端都是插件化的！从第 35 讲 ui-theme 和 locale 两个例子你已经见过：主题是一个 client 插件、多语言是另一个。这意味着第三方可以给 dsh 的界面写功能插件（注册新的 Chat 节点、新的设置卡片——第 03 讲归属表里"添加 Web Client Chat 节点→注册 ConversationNodeDefinition + keyed renderer"说的就是这条路）。

包族内部按职责细分：connection(与宿主的通信)、runtime（启动时序）、modules（功能插件集）、ui-* 系列（theme/layout/slots 等 UI 服务）。除测试运行时外全是产品包——前端不是"一堆组件"，而是一个有架构的子系统。

## 二、api-gateway：类型安全的远程调用

现在看双城之间的桥。`packages/api/gateway/` 的 README 信息密度极高，拆开读：

> 为 Host 与 Client 两侧的 Cordis 环境 provide Typert RPC endpoint。Host 入口提供 `ctx.typertGateway`，客户端侧提供 `ctx.remote`；两者使用**同一份生成的 InvocationDescriptor 约定**，并将业务选择交给 API Remotes，将传输、请求关联、信任和响应封装交给 Connection。

四个关键词：

**Typert RPC**——Typert 是 dsh 自家的类型化远程调用体系（typert 家族还承担着第 12 讲见过的 typert lookups 身份解析）。它要解决的问题是：浏览器的 JS 怎么安全地调用宿主进程里的 TypeScript 服务？

**InvocationDescriptor（生成的调用描述符）**——两端共享的机器生成契约，枚举"哪些方法可被远程调用、参数形状是什么"。因为它是从源码生成的，接口改了描述符跟着变，两端不同步会在构建期暴露而不是运行期。

**业务与传输分离**——"业务选择交给 API Remotes，传输、请求关联、信任和响应封装交给 Connection"。一个远程调用的关注点被劈成两半：调谁（业务路由）归 Remotes 层，怎么可靠地调过去（传输、关联 id、信任校验、响应打包）归 Connection 层。

**双向校验**——看 Host 端 invoke() 的五步流水："解析当前的描述符和 Cordis 服务，**校验具名参数是否完全匹配**，解析已注册的对象或 Context 身份标识，调用公开的业务方法，**并校验其结果**"。进来的参数要验、出去的结果也要验——RPC 边界上不信任任何一方。业务方法用 @Remote 或 @RemoteScope 装饰器标记（基类不便时可改用 bindTypertRemote() 函数式逃生门）——声明式为主、命令式兜底，API 设计的成熟手笔。

## 三、Host 与 Client：两个 Cordis 环境

最反直觉但最重要的架构事实：**浏览器和宿主各自跑着一棵 Cordis 插件树**。宿主那棵你已经在前面七卷里全认识了（sessions/tools/llm……）；浏览器这棵则由 client 包族构成（ThemeRuntime、LocaleRuntime、各功能插件）。两棵树通过 gateway 的 RPC 通道对话——client 插件调用 ctx.remote 拿数据，host 插件通过事件推送通知界面更新（第 06 讲那些 log-only 事件的"可安全用于浏览器"子路径导出就是为此准备的）。

为什么前端也要插件树？因为这样**扩展模型在两侧对称**：给后端加能力=挂插件，给前端加面板也=挂插件，一套心智模型贯穿全栈。你在第 28 讲学的 scope、第 03 讲学的 inject/apply，在前端代码里原样成立。

## 四、回环与远程的分权

第 35 讲 ui-theme 那段长注释里藏着一个重要的安全分权："settings API 仅限回环请求，因此**远程浏览器**的选择仅保留在进程内。"翻译：本机打开的页面有特权（能读写你的 settings），通过 SSH 转发来的远程页面只有非特权待遇（偏好只存在内存里）。同一个界面，两种信任级别，按网络位置自动判定。Web 安全的经典课题（不要把特权 API 暴露给不可信来源），在这里落成了具体的机制。

> 💡 **知识拓展：为什么不用现成 RPC（gRPC/tRPC）？**
> 常见疑问。答案藏在约束里：两端都是 TypeScript 但分处进程与浏览器、需要和 Cordis 服务身份系统集成（invoke 要解析 Context 身份标识）、契约要和配置目录一样自动生成保持同步。gRPC 的 proto 工作流对这个纯 TS monorepo 过重，tRPC 缺少身份解析的钩子。自建 Typert 不是 NIH 情结，而是把"身份+生成契约+双向校验"三个自有需求焊在一起的合理代价。评估轮子要不要自己造，先列出你独有的需求清单。

## 试一试

打开 packages/client/ 目录浏览子包名清单，挑一个 ui-* 开头的包读它的 README 前 10 行，判断它是"共享 UI 服务"还是"功能插件"。这个分类练习做完，你对前端包族的版图就心里有数了。

## 下一讲预告

client 的架构骨架见过，下一讲深入它的血肉：web 前端的 ThemeRuntime 与 LocaleRuntime 如何做到"绝不接触 DOM"、slots 席位系统的类型化设计、以及那段教科书级的主题初始化防闪烁方案。
