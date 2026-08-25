---
title: 第27讲·MCP 客户端：把全世界的工具接进来
summary: 拆解 mcp-client 桥接插件：服务器限定命名、stdio 传输、每服务器一实例的配置形态。
objectives:
  - 说清 MCP 协议解决什么问题、dsh 以什么姿态接入
  - 解释 mcp__<server>__<raw> 命名规则防冲突的原理
  - 掌握在 cordis.yml 里挂载一个 MCP 服务器的完整写法
tags: [deepseek-harness, mcp, 协议]
keyPoints:
  - MCP 是"工具界的 USB 标准"：任何工具提供方都能被任何智能体使用
  - dsh 作为客户端把外部服务器的工具注册进 ctx.tools——模型视角与原生工具无异
  - 命名空间化 mcp__github__create_issue 避免跨服务器撞名
  - 一个 MCP 服务器 = 一个插件实例，配置即拓扑
---

卷六开篇，视野从仓库内部转向外部世界。第一个协议是当下最火的 **MCP（Model Context Protocol，模型上下文协议）**——一句话定位：**工具界和资源界的 USB-C**。在它出现之前，每个 Agent 框架都要为每个工具提供方写专门的集成；有了它，工具开发方只需实现一次 MCP 服务器，就同时被所有支持该协议的智能体使用。dsh 的接入姿势是客户端：`packages/mcp/mcp-client`。

## 一、桥接的本质：翻译成原生工具

README 第一段给出了全部要点：

> 连接外部 Model Context Protocol 服务器，**把它们的工具注册到 ctx.tools**，使模型能够通过服务器限定名称将其作为原生工具使用。

注意这句的分量：外部工具不是以"特殊通道"的形式存在，而是**汇入统一的工具注册表**。于是第 18-20 讲的全部机制——schema 白名单、执行流水线、审批瀑布、沙箱策略——对外来工具**原样生效**。模型分不出 `mcp__github__create_issue` 和内置工具有什么身份差异，安全体系也不需要为它们开口子。

这就是接缝设计的复利：当初把 ctx.tools 设计成唯一入口时，谁也预料不到今天会涌进来成百上千个 MCP 工具——但接口足够抽象，新物种直接落座。

## 二、命名：服务器限定名

外部世界是野蛮生长的：两个服务器都提供叫 search 的工具怎么办？dsh 的答案是命名空间化：

```text
mcp__<serverName>__<rawName>
      │             │
      │             └── 服务器内部的原名
      └──────────────── 你在配置里给服务器起的名
```

比如配置里 serverName: github，那它的 create_issue 工具对模型就叫 `mcp__github__create_issue`。撞名在结构上不可能发生。这个前缀还自带语义：模型看到名字就知道"这是 GitHub 那个服务器的家伙"，选择准确率随之提升。

## 三、配置即拓扑

怎么告诉 dsh 要连哪些服务器？README 给出的形态是在 cordis.yml 里**每个服务器一个插件实例**：

```yaml
- id: mcp-github                      # 实例 id（patch 定位用）
  name: '@deepseek-ai/dsh-mcp-client' # 插件包名
  config:
    serverName: github                # 命名空间前缀
    transport: stdio                  # 传输方式
    command: npx                      # 启动命令……
    args: ['-y', '@modelcontextprotocol/server-github']
```

读这段配置能读出 MCP 的运行模型：**服务器就是一个本地进程**（transport: stdio 表示通过标准输入输出通信），npx 拉起官方的 GitHub MCP 服务器，dsh 与它对话获取工具清单、转发调用。要再加一个文件系统服务器？复制一段改改 id 和 command。**你的智能体能力版图，就是一张 YAML 清单**——这正是第 04 讲"装配四层叠加"里 patch 机制的日常应用场景。

> 💡 **知识拓展：MCP 的三种原语与传输**
> 除了 tools（工具），MCP 还定义了 resources（资源：可读取的数据源）和 prompts(提示词模板) 等原语；传输层除了本讲的 stdio，还有 Streamable HTTP（远程服务器）。dsh 的 mcp-client 聚焦最常用的 stdio+tools 组合——**先把最高频的路径打穿，其余按需扩展**，这也是工程节奏感的体现。

## 四、信任边界的一课

值得停下来想一层安全问题：接入 MCP 服务器意味着**把外来代码拉进你的机器跑**（stdio 服务器是本地进程），且它的工具会出现在模型的菜单里。提示词注入攻击的新面由此展开：恶意网页内容可能诱导模型调用某个 MCP 工具泄露数据。

dsh 的防线依然是分层老配方：外来工具走同一套执行流水线，pre-execute 瀑布、审批、沙箱一样不少；命名前缀让人类审计日志时一眼认出来源。但框架只能提供机制——**装哪个服务器、给它什么权限，决策权和使用责任在你**。这是所有开放生态的共同宿命：USB-C 不阻止你插来路不明的 U 盘。

## 试一试

打开 `packages/mcp/mcp-client/README.zh.md` 看完整的配置字段列表（认证、环境变量等）。然后设计题：如果两个 MCP 服务器都提供了质量不错的搜索工具，你希望模型如何选择？只靠 description 文案够吗？结合第 19 讲的五问框架给出你的工具箱编排方案。

## 下一讲预告

MCP 让智能体获得"万物的工具"，LSP 则让它获得"程序员的眼睛"。下一讲拆 lsp 能力家族：语言服务器协议是什么、通用 stdio 后端如何借道 ctx.fs 与 ctx.subprocess、以及跳转定义这类超能力的注入方式。
