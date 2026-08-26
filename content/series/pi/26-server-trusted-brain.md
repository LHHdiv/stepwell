---
title: 第26讲·server：受信任的大脑
summary: PiServer 自己不建 socket，而是持有一组 listeners 接收连接，再把模型调用代理给 pi-ai。本讲看它如何当"持钥匙的大脑"。
objectives:
  - 说出 PiServer 的核心字段与 accept 流程，理解它为何"传输无关"
  - 解释 server 如何在不持有业务代码的前提下，代理 LLM 调用
  - 把 server 的"持密钥"和第 25 讲三条动机连起来
tags: [pi, server, 信任边界, 代理]
keyPoints:
  - "PiServer（server.ts:42）持有 listeners 数组，自己不建传输，靠注入的 listener 接收连接"
  - "启动流程：listener.start((connection) => this.accept(connection))（server.ts:82/:97），每个连接交给 accept 处理"
  - "server 是'受信任大脑'：模型 API key 由它所在进程的环境提供，本地 agent 进程看不到（第 25 讲动机一落地）"
  - "server 把'问 LLM'这件事代理给 pi-ai——它不内置模型逻辑，只做转发与鉴权"
  - "传输可插拔：stdio / unix socket 都是 listener 的实现，server 对此无感知"
---

第 25 讲我们定下结论：pi 把"持钥匙的大脑"单拆成一个进程。这一讲看这个大脑——`PiServer`——到底长什么样，为什么它既能"持密钥"又"不臃肿"。

## 一、先结论：server 是"传输无关的代理"

`PiServer` 的代码很克制。看 `packages/server/src/server.ts:42`：

```ts
private readonly listeners: readonly PiServerListener[];
```

注意它**只有一个 `listeners` 字段**。这意味着：`PiServer` 自己不建 socket、不监听端口、不碰 stdin——它把"怎么连进来"完全交给外部注入的 `PiServerListener`。

启动逻辑在 `server.ts:82` 一带：

```ts
for (const listener of this.listeners) {
	await listener.start((connection) => this.accept(connection));  // :97
}
```

每个 listener 启动后，一旦有连接进来，就把 `connection` 交给 `this.accept` 处理。一句话：**server 负责"连上之后干什么"，listener 负责"怎么连上来"**。

> **知识拓展**：这种"核心逻辑 + 可插拔传输"的分离，和 Node 的 `http.Server` 很像——`http.Server` 也不自己监听，而是 `server.listen(handle)` 接收一个已存在的 socket/handle。pi 把这个模式用在了 agent 架构上。

## 二、为什么"传输无关"很重要

因为 server 的信任边界**不依赖传输方式**。无论连接来自：

- 本机的 stdio（父子进程管道），
- 本机的 Unix domain socket，
- 还是远端的某条加密通道（未来可加 websocket listener），

`PiServer` 的处理逻辑完全一样——它只认 `connection` 这个抽象。第 28 讲会专门看 `client/src/unix.ts` 这条具体传输；这里先记住：**传输是可替换的零件，server 内核不关心**。

这给第 25 讲"部署弹性"动机提供了骨架：你想把 server 放到远端？只要写一个对应的 listener（或复用现有），`PiServer` 一行不用改。

## 三、server 如何"持钥匙"

回到最关键的信任问题：`PiServer` 进程的环境变量里提供 API key。回顾第 02 讲提到的 `pi-ai` 包——它读环境变量（如 `ANTHROPIC_API_KEY`，见 `ai/src/env-api-keys.ts:31` 的 `ANTHROPIC_API_KEY_ENV`）来鉴权。

关键点：**key 的读取发生在 server 进程内，由 pi-ai 在代理模型调用时用**。本地 agent 进程既不持有 key，也不调用 pi-ai 的鉴权路径——它只把"请模型回答这段"的请求发给 server，server 用自己的 key 去问 LLM，再把回复流回来。

我们之前 grep 验证过：`packages/server/src` 里**搜不到 `API_KEY` 常量**——因为 key 不是硬编码在 server 源码里的，而是运行时从 server 进程的环境注入。这正是"密钥隔离"的干净实现：代码不泄露密钥，密钥只活在部署形态（环境变量）里。

## 四、server 是"代理"而非"大脑本体"

别被"大脑"这个词误导：`PiServer` 不自己实现 transformer、不缓存权重。它做的是**代理**——

1. 收到 agent 发来的"模型请求"（对话消息 + 工具定义）；
2. 用本进程的 key，调用 `pi-ai` 的 `Provider` 去问真实 LLM；
3. 把 LLM 的流式回复，按第 9–10 讲协议封装，流回 agent。

模型逻辑全在 `pi-ai`（第 5–8 讲）；server 只加了一层"鉴权 + 转发"。这种"薄代理"让 server 的代码面极小、易审计、难被滥用——正好满足第 25 讲"风险隔离"动机。

## 五、试一试

1. 读 `server.ts` 的 `accept` 方法（搜 `accept(`），看它拿到 `connection` 后第一件事是做什么（握手？读 ClientHello？），和第 10 讲 `ClientHello` 对上号。
2. 在 `packages/server/src/listener.ts` 里找 `PiServerListener` 接口定义，列出它要求实现哪几个方法（提示：至少 `start` / `close`）。
3. 思考：如果把 `pi-ai` 的 key 读取改成"从配置文件读"而非"从环境变量读"，第 25 讲的哪条动机会被削弱？为什么环境变量比配置文件更安全？

## 下一讲预告

server 是受信任大脑，那另一边——本地那个"会干活但没钥匙"的 `PiClient`——长什么样？下一讲看瘦客户端如何用可插拔传输连上 server，以及它为什么"瘦"。
