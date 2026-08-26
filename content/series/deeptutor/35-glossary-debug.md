---
title: 第35讲·名词表和常见「课上出状况」
summary: 用人话收齐关键名词；转圈、编教材、换口音、空白屏四类状况对到源码文件。
objectives:
  - 能不看英文缩写说出十余个核心零件在干什么
  - 遇到四类常见故障知道先打开哪些文件
  - 把排错顺序建成「先身份与通路，再教法与剪辑」
tags: [deeptutor, 名词表, 排错]
keyPoints:
  - 名词先记职责，再记路径
  - 转圈查 WS / 回合 / 循环预算；空白查剪辑与思考标签
  - 编教材查书与检索；换口音查语言指令与人格
---

学期末两件事：把口头禅收成一张小抄；再把最常见的课堂事故贴上「去哪个教室修」。下列路径均相对 DeepTutor 仓库根目录。

## 名词用人话

| 人话 | 常见英文 | 可以先打开 |
| --- | --- | --- |
| 这一轮课需要的全部资料袋 | UnifiedContext | `deeptutor/core/context.py` |
| 课堂直播间 | StreamBus / StreamEvent | `deeptutor/core/stream_bus.py`，`core/stream.py` |
| 教务调度：选哪门课 | ChatOrchestrator | `deeptutor/runtime/orchestrator.py` |
| 稳定门面 / 书包 | DeepTutorApp / TurnRequest | `deeptutor/app/facade.py` |
| 网页对讲机 | unified WebSocket | `deeptutor/api/routers/unified_ws.py`，`web/lib/unified-ws.ts` |
| 大模型翻译台 | LLM factory / provider | `deeptutor/services/llm/factory.py`，`provider_factory.py` |
| 一颗遥控器按键 | Tool / BaseTool | `deeptutor/core/tool_protocol.py` |
| 按键总台账 | ToolRegistry | `deeptutor/runtime/registry/tool_registry.py` |
| 一门完整课型 | BaseCapability | `deeptutor/core/capability_protocol.py` |
| 挂在聊天袖口的教法 | LoopCapability | `deeptutor/capabilities/protocol.py` |
| 日常辅导刹车 | 还按不按工具 | `deeptutor/agents/chat/agent_loop.py` |
| 出题类刹车灯 | LabelProtocol | `deeptutor/core/agentic/loop.py` |
| 跑代码的工具房 | Sandbox | `deeptutor/services/sandbox/service.py` |
| 按需翻的专题卡 | Skill | `deeptutor/services/skill/service.py` |
| 外校仪器插座 | MCP | `deeptutor/services/mcp/manager.py` |
| IM 教室门卫 | Partner | `deeptutor/partners/`，`services/partners/` |
| 口音预设 | Persona | `deeptutor/services/persona/service.py` |
| 活书总编排 | BookEngine | `deeptutor/book/engine.py` |
| 掌握账本 | LearningService | `deeptutor/learning/service.py` |
| 改稿助手 | Co-writer / EditAgent | `deeptutor/co_writer/edit_agent.py` |
| 谁的课桌 | CurrentUser / paths | `deeptutor/multi_user/context.py`，`paths.py` |
| 气泡剪辑师 | stream.ts 等 | `web/lib/stream.ts`，`web/context/UnifiedChatContext.tsx` |

忘了细节时，用「它对学生意味着什么」反查上表，再进文件读注释——比死记行号牢。

> 小结：名词是教室门牌，不是拼写比赛。

## 课上出状况：四类对到文件

### 1. 一直转圈

**学生感受**：发送后菊花转个不停，或终端刷工具刷到天黑。

**先查通路**：后端是否起来；浏览器是否连上 `/api/v1/ws`（`unified_ws.py`，`web/lib/unified-ws.ts`）。回合是否卡在 `turn_runtime`（`deeptutor/services/session/turn_runtime.py`）的执行表里；有没有 `cancel_turn`。

**再查教法**：聊天是否工具失败后反复重试（`agents/chat/agent_loop.py`）；出题/研究是否迟迟不亮交卷灯（`core/agentic/loop.py` 的迭代预算）。日志目录经 `deeptutor/logging/` 与 path service 解析——先看日志再猜。

### 2. 编教材

**学生感受**：明明没给资料，却写得像引了某本权威课本；或活书内容与上传资料无关。

**先查检索**：本轮是否挂了知识库；`rag` 是否被调用；空检索时模型有没有老实承认（`tools/builtin/__init__.py` 里 RAGTool，`services/rag/`）。技能卡若要求「无 OCR 勿瞎编」（如 pdf 技能），模型仍可能偷懒——靠提示与结果检查。

**再查书引擎**：提案与资料探索是否走过（`book/engine.py`，`book/agents/`）。生成书是长流程，确认阶段与用户确认点，避免把「构想」当成「已引用的事实」。

### 3. 口音中途改变

**学生感受**：明明选了中文，半路英中混杂；或老师腔突然变同伴腔。

**语言**：面向读者的硬性语言指令集中在 `deeptutor/services/prompt/language.py`（`language_directive` / `append_language_directive`）。提示词文件的语言回退在 `services/prompt/manager.py`——文件回退到英文时，仍应靠 directive 锁读者语言。查这一轮 `TurnRequest` / WS 载荷里的 `language` 有没有丢。

**人格**：Persona 是整段注入、每轮一个（`services/persona/service.py`）。中途变腔可能是人格没带上、被技能/家规覆盖，或模型忽略了系统块——打开实际拼好的系统提示（日志 / 调试）比只看设置页开关有用。

### 4. 屏幕空白

**学生感受**：过程转过，气泡却空；或只有「思考」没有讲解。

**先查剪辑**：`web/lib/stream.ts` 是否把正文当成旁白剔除；`UnifiedChatContext` 是否还在等事件。`hasVisibleMarkdownContent`（`web/lib/markdown-display.ts`）也可能判定无可视内容。

**再查模型输出**：是否整段关在思考标签里（聊天循环对空白正文有催促逻辑，见 agent loop 一带）；WS 是否 `send` 失败被标成 closed（`unified_ws.py` 的 `safe_send`）。CLI 若有字而网页空白，更像前端剪辑或订阅问题，而不是模型哑巴。

> 小结：转圈查路与预算；编书查检索与书阶段；换腔查语言与人格；空白屏查剪辑与思考区。

## 试一试

从本讲名词表挑出三个你最容易混的词，合上笔记用人话各说一句。然后任选一种「课上出状况」，在仓库里真正打开表中列出的两个文件，用搜索跳到相关符号。不必修好 bug——能指到门牌，排错就已经开始了。

## 下一讲预告

本系列正文到此收束。若要继续，回到仓库 `AGENTS.md` 当地图，选一颗小按钮或一种小教法，用第三十四讲的验收句在自己的问题上再走一轮。
