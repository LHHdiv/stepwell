---
title: 附录B·术语对照：pi 与 dsh 的概念映射
summary: 把 pi 的关键概念和本站姊妹篇《DeepSeek Harness 源码精读》(dsh) 对照起来，看清两个优秀 harness 在插件化、信任、可观测上的不同取舍。
objectives:
  - 用对照表快速建立 pi 与 dsh 的概念映射
  - 指出两者在"插件粒度""信任边界""可观测性"上的本质差异
tags: [pi, dsh, 术语对照, 附录]
keyPoints:
  - "插件化：pi 的 ExtensionAPI（types.ts:1198）对 dsh 的 Cordis——pi 粒度更细，连供应商/CLI 都可插拔"
  - "信任：pi 用 server/client 进程拆分（第 25 讲）对 dsh 的权限系统(approvals)——一个外推为部署，一个内置在进程内"
  - "运行单元：pi 的 lane（reducer.ts:506）对 dsh 的 step——都是'一次工具自省'，pi 额外支持并发泳道"
  - "持久化：pi 的 SessionRepo（types.ts:361）对 dsh 的会话存储——都抽象存储后端，pi 强调分支/快照 DTO"
  - "可观测：pi 的 AI_TELEMETRY_SCHEMA（telemetry.ts:42）对 dsh 的 span/event 体系——同属'遥测即契约'"
---

本附录把 pi 的概念和本站姊妹篇《DeepSeek Harness 源码精读》（dsh）对照，帮你**对照阅读、看清取舍**。两个项目答的是同一道题——"把大模型变成生产级智能体需要哪些零件"——但答案各有野心。

## 一、核心概念映射表

| 维度 | pi（本系列） | dsh（姊妹篇） | 差异本质 |
|---|---|---|---|
| 插件系统 | `ExtensionAPI`（types.ts:1198） | `Cordis` | pi 粒度更细：工具/命令/键位/CLI/供应商全可插拔；dsh 偏"能力可加" |
| 信任边界 | server/client 进程拆分（第 25–28 讲） | 权限系统 approvals | pi 把信任**外推为部署形态**；dsh 在进程内细粒度放行 |
| 运行单元 | `lane`（reducer.ts:506） | `step` | 都是"一次工具自省"；pi 额外支持**并发泳道** |
| 主循环 | `runLoop` 双层 while（agent-loop.ts:155） | turn/step 循环 | 同构：输入边界 vs 工具自省两层 |
| 工具注册 | `defineTool`（types.ts:509） | 工具定义机制 | 都用 schema 描述参数；pi 强调同名可覆盖 |
| 会话持久化 | `SessionRepo`（types.ts:361）+ 分支/快照 | 会话存储 | 都抽象后端；pi 强调 branch/snapshot DTO |
| 可观测性 | `AI_TELEMETRY_SCHEMA`（telemetry.ts:42） | span/event 体系 | 同属"遥测即契约"，非散 log |
| 评测 | `vitest-evals` 轨迹打分（第 33 讲） | 轨迹/评测体系 | 都评"过程"而非"单轮答案" |
| 终端 UI | 手写差分渲染（tui.ts:2） | TUI 体系 | pi 明确"零框架、差分写屏" |
| 模型抽象 | `Provider<TApi>`（models.ts:97） | 多供应商抽象 | 同构：统一供应商接入接缝 |

## 二、三个最值得品味的差异

**1. 插件粒度：可加 vs 可重塑**
dsh 的 Cordis 让"能力可加"——你挂插件扩展行为。pi 的 `ExtensionAPI` 让"产品形态可重塑"——装不同扩展，连支持的供应商、CLI 参数、快捷键都变。pi 走得更远，代价是行为更难预测，需用评测（33）与写入安全（36）兜底。

**2. 信任落点：内置 vs 外推**
dsh 在进程内用 approvals 细粒度决定"这次工具调用放行吗"。pi 不内置权限系统，而是把"谁能为模型鉴权"推到**独立 server 进程**（25–28 讲）。前者适合"同一进程内灵活放行"，后者适合"跨机器部署天然安全"——场景不同，无高下。

**3. 运行并发：step vs lane**
两者的 `step`/`lane` 都是"模型发一次工具调用→执行→回灌"的自省单元。但 pi 的 `lane` 显式支持**同一会话内并发多条工作线**，由 `reduceLaneState` 归并（18/35 讲）；dsh 更偏线性 turn/step。这反映 pi 对"并行智能体任务"的一等支持。

## 三、术语小词典（pi 侧）

- **harness**：驾驭大模型的整套装置（马具）。本系列主角。
- **ExtensionAPI**：扩展拿到的"能力面板"，产品形态开关。
- **lane**：会话内的并发工作线，归并成一致状态。
- **branch**：会话历史的平行分叉（来自 SessionManager.fork）。
- **snapshot**：某时刻会话全貌的可序列化定格（含所有 lane 的 item）。
- **TranscriptItem**：对话最小单元（一条消息/一次工具调用/一个事件）。
- **StreamFn / ExecutionEnv**：可插拔的"流式函数"与"执行环境"接缝（16–17 讲）。
- **write lease**：harness 对所属会话的"写入权威"（逻辑租约，36 讲）。
- **sensitive**：遥测字段的"敏感声明"标记，运行期是否脱敏由部署决定（37 讲）。

> 读完这张表，建议你回到 dsh 系列对应章节对照着读——两个优秀 harness 的不同野心，会在并排阅读时格外清晰。
