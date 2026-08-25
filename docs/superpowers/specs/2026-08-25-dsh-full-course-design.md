# 设计规格：《DeepSeek Harness 全仓源码精读》系列重写

日期：2026-08-25 · 状态：已获用户批准

## 目标

以 `~/Project/deepseek-harness` 官方仓库（docs/*.zh.md + 源码）为唯一事实来源，
推倒重写 `content/series/deepseek-harness/` 下旧 28 讲，产出九卷 39 讲完整学习文档。

## 用户确认的决策

1. **推倒重写**：旧内容过于简单、前后逻辑不连贯；
2. **篇幅**：3500~5500 字/讲，质量与深度优先；
3. **覆盖**：全仓库大而全（含 MCP/LSP/ACP/web/subagent/hooks/skill 等全部子系统）；
4. 面向 0 基础用户；源码级重度学习；知识点做好知识拓展。

## 九卷结构（39 讲）

| 卷 | 章节 | 主题 |
|---|---|---|
| 一·启程 | 00-04 | 导读 / 全景地图 / turn 生命线 / Cordis 入门 / 动手跑起来 |
| 二·地基 | 10-16 | Branded ID / SessionEventMap / 仅追加日志哲学 / deriveMessages / session-query / 持久化与 fork / scope |
| 三·心脏 | 20-25 | Agent 接口 / 主循环骨架 / 工具派发与中断 / system-prompt / compaction 与 spill / inbox |
| 四·手脚 | 30-34 | 工具注册表 / 内置工具巡礼 / 执行流水线 / sandbox 与审批 / 执行世界(shell·terminal·fs) |
| 五·对话艺术 | 40-43 | LlmAdapter seam / llm-deepseek SSE / 重试错误 token-meter / credentials 身份 |
| 六·生态协议 | 50-54 | MCP / LSP / ACP / web 家族 / subagent 家族 |
| 七·高阶能力 | 60-64 | hooks / plan·todo·goal / jobs·schedule·workflow / skill / settings·preset |
| 八·产品形态 | 70-73 | profile·bundle·patch 装配 / client TUI 与 API Gateway / web 前端 / sdk |
| 九·毕业 | 80-82 | 测试策略与防御性模式 / 开发工作区 / 毕业设计 |

## 单讲规格

- frontmatter：title「第NN讲·…」/ summary≤50字 / objectives 2~4 条动词开头 / keyPoints 3~6 条 / tags 2~5 个
- 结构：类比开篇(≤100字) → 心智模型 → 源码精读(代码块带语言标注+中文注释+逐段解释) → 知识拓展框 → 试一试 → 要点回顾 → 下一讲预告
- 文风：说人话、多类比但回到严谨、中英文间空格、专有名词首现附英文、不编造（不确定就写明查证方向）
- 衔接：每讲开头一句承上、结尾预告下一讲；跨卷有总复习呼应

## 质量关卡

- [ ] 每卷写完 `npm run build` 通过
- [ ] `_meta.md` phases 与实际章节一一对应
- [ ] 全部完成后用审校标准过一遍前后连贯性

## 执行方式

本会话内逐卷直接撰写（子代理因 OpenRouter 额度不可用），每卷一构建。
