---
title: 第44讲·附录一：命令速查与数字基准
summary: 全系列出现过的命令一张表、仓库关键数字一份清单——每个数字都附验证命令。
objectives:
  - 按任务场景快速找到该用的命令
  - 用附带的验证命令亲手复核每个关键数字
  - 建立"数字必须可复现"的阅读习惯
tags: [deepseek-harness, 附录, 速查]
keyPoints:
  - 本讲所有数字均来自本系列写作时的实际仓库检出，每条附验证命令
  - 数字会随版本演进变化，复核时以你本机输出为准
  - 会话日志、dump-config、测试套件是三大信息源
---

橙皮书式的工具页。本讲把全系列散落的命令收拢成一张速查表，再把文中出现的关键数字做成可复核的基准清单——**每个数字都告诉你怎么验证**，这是我们对"不编造事实"承诺的兑现方式。

## 一、命令速查：按场景索引

**安装与启动：**

```sh
npx @deepseek-ai/dsh web              # npm 直达，浏览器打开 127.0.0.1:3080
pnpm install && pnpm run build        # 源码路径：构建
pnpm dsh web                          # 源码路径：启动
dsh --no-open web                     # 只起服务不开浏览器
dsh --profile headless < 任务         # 无界面一次性运行
```

**观测与调试：**

```sh
dsh --profile web --dump-config       # 打印本次启动的完整插件配置树
dsh --profile headless --dump-config | grep -i tools   # 只看工具挂载
```

**开发与质量：**

```sh
pnpm run test             # 单元测试（vitest）
pnpm run test:coverage    # 覆盖率门禁（按文件 100%）
pnpm run test:e2e         # 真实 API e2e（需密钥，缺失自动跳过）
pnpm run test:snapshot    # 快照测试
pnpm dsh --help           # 子命令帮助由应用自己持有
```

## 二、数字基准表

以下数字采集自本系列写作时的一次仓库检出。验证命令都在仓库根目录执行：

| 数字 | 含义 | 验证命令 |
|---|---|---|
| 50+ | packages/ 下的包目录数 | `ls packages \| wc -l` |
| 13 | SessionEventMap 事件种类 | 数 `core/session/src/types.ts` 中接口成员 |
| 515 | agent-loop 主循环 agent.ts 行数 | `wc -l packages/core/agent-loop/src/agent.ts` |
| 440 | session 类型定义 types.ts 行数 | `wc -l packages/core/session/src/types.ts` |
| 1157 | session 包主文件 index.ts 行数 | `wc -l packages/core/session/src/index.ts` |
| 1484 | .agents/notes 下 Agent Note 总数 | `find .agents/notes -name "*.md" \| wc -l` |
| 11 | 被否决的简化/特性提案（zh） | `find .agents/notes/rejected -name "*.zh.md" \| wc -l` |
| 10 | 事故复盘文档数 | `ls docs/postmortem/*.md \| wc -l` |
| 9 | docs/cookbook 实操指南数 | `ls docs/cookbook/*.zh.md \| wc -l` |
| 3 | 出厂 profile 形态相关组合包（base/web-app/headless） | `ls packages/bundle/` |

> 💡 为什么坚持"数字带命令"？因为技术文章最常见腐烂就是过期数字——它们曾经真实，然后悄悄失效，读者却无从分辨。给每个数字配一条验证命令，等于把"信我"升级成"验我"。这也是橙皮书"每个数字带命令和快照时间"做法的可迁移价值。

## 三、本系列的源码锚点总表

复习用。四十四讲的全部核心文件，按卷排列：

- **卷二**：`core/session/src/types.ts` · `surface.ts` · `index.ts(deriveMessages/fork)` · `util/brand` · `session-query/*` · `storage/storage/src/backend.ts` · `core/scope/src/index.ts`
- **卷三**：`core/agent/src/runtime-types.ts(Agent接口)` · `inbox.ts` · `core/agent-loop/src/agent.ts` · `tool-calls.ts` · `invariant.ts` · `core/system-prompt/src/index.ts`
- **卷四**：`core/tools/src/index.ts(ToolDefinition)` · `docs/tool-catalog` · `docs/tool-execution-pipeline` · `packages/sandbox/sandbox/README+src`
- **卷五**：`llm/llm/src/{types,content,message}.ts` · `llm-deepseek/src/sse.ts` · `llm-retry/README` · `token-meter/README` · `credentials/credentials/README`
- **卷六至卷八**：`mcp-client/lsp/acp/web/subagent 各 README.zh.md` · `hooks 三包` · `plan/todo/goal/jobs/schedule/workflow 各 README` · `skill 四包` · `settings/preset` · `boot/cmdline+app-boot` · `api/gateway` · `client/ui-theme/locale` · `sdk/protocol+server`

## 试一试

挑表里任意三个数字跑一遍验证命令。如果某个数字对不上——恭喜，你刚刚见证了版本演进，去 git log 里找找它是什么时候变的。
