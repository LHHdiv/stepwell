---
title: 第45讲·毕业设计：把九卷串成一件作品
summary: 读完九卷，该动手了。本讲给一个把全系列串起来的毕业项目——做一个"会查文档的扩展"，并附上命令速查与术语对照两篇附录。
objectives:
  - 说出一个能串起 19-42 讲知识的毕业项目长什么样
  - 指出项目里每个环节对应本系列的哪一讲
  - 会用两篇附录（命令速查 / 术语对照）做速记与跨项目对照
tags: [pi, 毕业设计, 实战, 附录]
keyPoints:
  - "毕业项目：写一个'文档查询扩展'——registerTool 查本地文档、registerCommand 触发、registerShortcut 绑定快捷键（第 19/21 讲）"
  - "项目跑通链：自定义工具 → AgentSession(39) → interactive 模式(23) → 差分 TUI 实时显示(29-32)"
  - "质量兜底：用 vitest-evals(33) 写一条轨迹用例，证明扩展没搞坏基线；用 AGENTS.md 纪律(43) 提交"
  - "附录 A 命令速查：CLI flag、ExtensionAPI 方法、关键 file:line 一页速记"
  - "附录 B 术语对照：pi 与 dsh 的概念映射（ExtensionAPI↔Cordis、lane↔step、server/client↔权限系统）"
---

九卷读到这里，你已经拆过 pi 的每一个零件：运行时、工具、扩展、信任边界、UI、持久化、评测、总装。但"读懂"和"会造"之间，差一个**亲手做的项目**。这一讲给你毕业设计，并把全系列收束成一件可运行的作品。

## 一、毕业项目：一个"会查文档"的扩展

目标：做一个 pi 扩展，让 agent 能**查你项目的本地文档**来回答架构问题。

它需要用到本系列的几乎每一卷：

| 项目环节 | 用到的讲次 | 干什么 |
|---|---|---|
| 定义工具 `lookupDoc` | 第 19 讲 `defineTool` | 工具读本地 `docs/` 并召回相关段落 |
| `pi.registerTool` + `registerCommand("/doc")` + `registerShortcut` | 第 21 讲 `ExtensionAPI` | 把能力注入产品 |
| 扩展文件放 `cwd/.pi/extensions/` | 第 22 讲 `loader` | 免编译被 jiti 加载 |
| 在 interactive 模式里用 | 第 23 讲模式 | 人机对话中调它 |
| 工具结果经 TUI 实时显示 | 第 29–32 讲差分渲染 | 边查边看 |
| 工具执行走 `executeToolCalls` | 第 14–15 讲 | 模型点名 → 执行 → 回灌 |
| 不把密钥带进来 | 第 25–28 讲信任边界 | 扩展只干活，key 在 server |
| 用 `vitest-evals` 写一条轨迹 | 第 33 讲 | 证明扩展没搞坏基线 |
| 提交时守 AGENTS.md 纪律 | 第 43 讲 | 显式暂存、不手改生成码 |

一个项目，把 19–43 讲串成闭环。做完它，你对 pi 的理解就从"读者"变成"作者"。

## 二、最小可跑版（第一天就能完成）

不必一步到位。第一天先交"能跑的最小版"：

```ts
// cwd/.pi/extensions/doc-lookup.ts
export default (pi) => {
  pi.registerTool(defineTool({
    name: "lookup_doc",
    description: "在本地 docs/ 里检索与问题相关的段落",
    parameters: t.Object({ query: t.String() }),
    async execute(_id, { query }) {
      // 简单 grep 式召回，返回前 N 段
      return { content: searchDocs(query) };
    },
  }));
};
```

跑起 pi，问"我们的工具系统怎么注册？"——agent 应该会调 `lookup_doc`。**看到它调通的那一刻，第 19/21/23/29 讲就全活了**。

## 三、进阶：把它做"对"

第二天起加硬核：

- 加 `registerCommand("/doc <问题>")` 让人类主动触发（第 21 讲）；
- 加 `registerShortcut` 绑个快捷键（第 31 讲键位）；
- 用 `vitest-evals` 写一条"问架构问题 → agent 调用 lookup_doc → 回答含文档片段"的轨迹用例（第 33 讲），锁住行为；
- 用 `AI_TELEMETRY_SCHEMA` 看这次工具调用花了多少时间（第 37 讲）；
- 提交时只 `git add` 你的扩展文件，绝不 `git add -A`（第 43 讲）。

## 四、两篇附录：把知识落成肌肉记忆

光做项目还不够，临场要能"想起来"。两篇附录帮你速记：

- **附录 A · 命令速查**（`46-appendix-commands.md`）：CLI flag、`ExtensionAPI` 方法清单、关键 `file:line` 一页纸。下次忘了"扩展怎么注册工具"，翻它。
- **附录 B · 术语对照**（`47-appendix-glossary.md`）：pi 与 dsh 的概念映射——`ExtensionAPI`↔Cordis、`lane`↔step、`server/client`↔权限系统、`SessionRepo`↔会话存储。读 dsh（本站姊妹篇）时对照着看，两个 harness 的取舍立刻清晰。

> **毕业赠言**：源码精读的意义，不在"背下每个函数"，而在"建立起一张可导航的地图"——下次你改 pi、或设计自己的 harness，知道"该去哪、该看谁、该避什么坑"。这张地图，九卷 + 两附录已经替你画好。去造点东西吧。

## 五、试一试

1. 今天就把"最小可跑版"的 `lookup_doc` 写出来、放 `cwd/.pi/extensions/`、跑通一次调用。
2. 给这个工具写一条 `vitest-evals` 轨迹用例（参考第 33 讲 `createPiCodingAgentHarness`），让"agent 调用了 lookup_doc"成为可断言的测试。
3. 翻附录 B，挑一个 pi 与 dsh 的概念对子，试着用你自己的话解释"两者为何不同"——能讲清，就算真毕业了。

## 全系列完

九卷 46 讲 + 两附录，从世界观到毕业设计，pi 的骨架已被你拆开又拼回。回去读 `packages/` 里的真实代码时，愿你像逛自己熟识的城市。
