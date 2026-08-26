---
title: 第27讲·client：瘦控制器
summary: PiClient 是本地 agent 里"会干活却没钥匙"的那一半——它只负责连接、收发协议消息、把事件喂给上层，模型调用全交给 server。
objectives:
  - 说出 PiClient 的职责边界：它做什么、不做什么
  - 解释为什么 client 是"瘦"的，以及"瘦"换来了什么
  - 把 client 与第 25-26 讲的 server 拼成完整信任边界
tags: [pi, client, 信任边界, 瘦客户端]
keyPoints:
  - "PiClient 负责连接 server、发送 ClientMessage、接收并解析 ServerMessage 流，本身不持有 API key"
  - "client 用可插拔传输连 server（如 client/src/unix.ts:12 的 Unix socket 工厂），传输对上层透明"
  - "'瘦'的含义：它不做模型推理、不管理密钥，只转发对话协议与流式事件——重活在 server/pi-ai"
  - "client 把收到的事件（AssistantMessageEvent 等）喂给本地 TUI 与 agent 运行时，是'本地大脑'与'远端大脑'的桥"
  - "client 与 server 之间只过第 9-10 讲的 framed CBOR，内容里不含密钥（第 25 讲动机一落地）"
---

第 26 讲看了受信任的大脑 `PiServer`。这一讲看它的另一半——本地那个"会干活却没钥匙"的 `PiClient`。它是 pi 信任边界里"不可信侧"的对外接口。

## 一、先结论：client 是个"接线员"

`PiClient` 存在的目的只有三个：

1. **连上** server（通过某种传输）；
2. **发出**本地 agent 的意图（用户输入、工具结果等），封装成第 10 讲的 `ClientMessage`；
3. **收下** server 回传的 `ServerMessage` 流，把其中的事件（如 `AssistantMessageEvent`）转交给本地的 TUI 与 agent 运行时。

它**不**做的事同样关键：不调 LLM、不持有 key、不决定"该问哪个模型"——那些都在 server 侧。

## 二、可插拔传输：连接这件事被抽象了

client 怎么连 server？看 `packages/client/src/unix.ts:12`：

```ts
/** Creates fresh Unix-domain socket transports for PiClient connection attempts in Node-compatible runtimes. */
export function createUnixSocketTransport(options: { path: string; ... }) {
	return (handlers) => connectUnixSocket(options.path, maxPendingBytes, handlers);  // :23
}
```

`createUnixSocketTransport` 返回一个"连接工厂"——你给它一个 socket 路径，它就造出一个能连上 server 的传输。注意返回类型是 `(handlers) => ...`：client 只关心"我有一组回调（收到数据怎么办、断开怎么办）"，**不关心底下是 unix socket 还是别的**。

> **知识拓展**：这种"传输即工厂函数"的抽象，让 client 的测试也能用内存传输（不需要真起一个 server 进程）。可插拔传输 = 可测性 + 可部署性，一举两得。

## 三、为什么"瘦"是优点

把 client 设计得"瘦"，换来三件事：

- **攻击面小**：client 代码不碰密钥、不碰模型逻辑，即使被恶意输入冲击，最坏也只是"转发了坏请求"，密钥不会从它这里漏。
- **易替换/易嵌入**：因为 client 只做转发，你可以把它塞进 IDE 插件、CI 脚本、或任何宿主程序，而不必担心它偷偷读了什么环境变量。
- **关注点干净**：本地 agent（能跑命令、读文件）和远端鉴权（server）彻底分层。第 25 讲说的"风险隔离"正是靠这层"瘦"实现的。

换句话说，**client 是本地"手"与远端"脑"之间的神经**——它传递信号，但不做思考，也不掌管家门钥匙。

## 四、client 在整条链路的位置

把前几讲串起来，一次"用户提问"的旅程是：

```
终端输入 → InteractiveMode(第23讲) → AgentSession(第39讲)
         → 本地 agent 产出"要问 LLM 的消息"
         → PiClient 封装成 ClientMessage(第10讲)
         → framed CBOR(第9讲) 过 unix socket(本讲)
         → PiServer.accept(第26讲) → pi-ai 用 key 问 LLM
         → 流式回复沿原路返回 → TUI 增量渲染(第29-32讲)
```

client 站在第 4、5 步的转折点上。它左边是"本地会干活的 agent"，右边是"远端持钥匙的 server"，自己是那条**不含密钥的桥梁**。

## 五、试一试

1. 在 `client/src/unix.ts:32` 的 `connectUnixSocket` 里看 `createConnection(path)`（`:32`），确认它用的是 Node 的 `net` 模块——这正是 Unix domain socket 的底层。
2. 回想第 10 讲 `ClientHello`：client 连上后的第一个动作是不是发握手？在 `client` 包里搜 `ClientHello`，看它何时被构造发出。
3. 思考：如果 client 和 server 在同一进程（不拆分），第 25 讲的"风险隔离"动机还成立吗？什么场景才必须拆分？

## 下一讲预告

client 用 `unix.ts` 这个工厂连 server，而"Unix socket"本身就是一种可插拔传输。下一讲专门看传输层：为什么 pi 选 Unix domain socket 做默认本地传输，以及它和 stdio、网络传输的差异。
