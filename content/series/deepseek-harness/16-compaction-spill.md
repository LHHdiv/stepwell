---
title: 第16讲·compaction 与 spill：给对话减肥的两把刀
summary: 拆解压缩能力家族与外溢存储：token 压力、摘要替换如何借道 surface replace、spill 的三件套分工。
objectives:
  - 区分 compaction（历史压缩）与 spill（单条外溢）的适用场景
  - 描述压缩结果如何通过 surface replace 进入模型视野而不破坏日志
  - 说出 spill 家族三个包各自的 seam 角色
tags: [deepseek-harness, compaction, spill]
keyPoints:
  - 压缩家族四包：seam 定义（ctx.compaction）、basic 提供 token 压力与摘要、pruner 无模型修剪、command 用户命令
  - 压缩 = 用带 replace 入场券的新节点顶掉旧表层区间——日志原文分毫不动
  - spill 把过大的工具结果存到外部，模型只拿到定位信息 + 取回指引
  - max-tokens 触顶的粘性结局在压缩场景同样生效
---

对话越滚越长，token 窗口总会见底。dsh 的应对是一对分工明确的机制：**compaction（压缩）**处理"整个历史太长"——把旧对话折叠成摘要；**spill（外溢）**处理"单条事实太大"——比如一个工具吐出了十万字的结果。本讲拆这两把刀。

## 一、compaction 家族：四个包一台戏

`packages/compaction/` 下的 README 开宗明义这是一个**能力家族**，四个包正好演示了第 03 讲"三角色"的完整编队：

| 包 | 职责 | 角色 |
|---|---|---|
| `compaction/` | 压缩 seam 与事件词汇（`ctx.compaction`） | Service Definition |
| `compaction-basic/` | token 压力测量与摘要后端 | Service Provider |
| `compaction-tool-result-pruner/` | 不用模型的工具结果修剪 | 可选配套 Consumer |
| `command-compact/` | 用户的 /compact 命令 | Consumer |

先看**压力从哪来**：每次请求前系统知道当前派生历史的 token 数（第 23 讲会讲的 token-meter 在计量）和模型的 context window（第 14 讲见过的 request/context 字段里就有它）。当占比越过阈值，压缩策略启动。

再看**两种减肥手段**的差异：

- **pruner（修剪）不花钱**：工具结果常常占据历史的大头——一次 `cat 大文件` 的输出可能几万 token，但它的信息价值随时间衰减极快。pruner 直接把旧的 tool/result 内容替换成占位符（"结果已修剪"），零模型调用；
- **summary(摘要) 要花钱**：调用一次模型，把一段旧对话浓缩成摘要文本。质量高，但本身消耗 token 和时间。

两者共用同一条落账通道。

## 二、replace 会师：压缩如何改写"模型视野"

这里就是第 08 讲埋的最大伏笔的兑现时刻。回忆 surface 的两种入场券：

```ts
export type SurfaceOp =
  | 'append'
  | { op: 'replace'; start: number; end: number }   // ← 压缩用的就是它
```

压缩完成后，新事件带着 replace 入场券入场，声明"我顶掉 [start, end] 区间的旧节点"，并用 sourceEventSeqs 列全被顶掉者的 seq。效果链条是：

```text
原始日志:  [u1 a1 t1 u2 a2 ... u20 a20]     ← 一条不少，永远
表层视图:  [摘要节点 (顶掉了 u1..a18)] [u19] [a19] ...
deriveMessages(): 摘要 + 最近几轮           ← 模型看到的
人类 transcript: 全部 append 型原始事件      ← 你看到的（isAppendSurfaceEvent 过滤）
```

三行各不相同，却全部来自同一份仅追加日志。**压缩没有删除任何东西——它只是更新了解读**。这就是为什么 dsh 敢把压缩做得很激进：最坏情况也只是"模型忘了"，而不是"记录没了"。而且第 08 讲还留了一手细节：压缩事件必须遵守开闭配对的检查（`compaction/start … compaction/end`），重放时遇到未配对的开标记就知道这次生命周期非正常终止。

> 💡 **知识拓展：上下文管理的业界光谱**
> 一端是 Claude Code 式的 auto-compact：接近窗口上限自动触发摘要；另一端是"无限上下文"路线（检索增强、向量记忆）。dsh 选了中间的务实路线：摘要负责宏观记忆、pruner 负责清理高体积低价值内容、spill 负责超大单条、而最近几轮永远原样保留。没有一种技术通吃——分层组合才是工程答案。

## 三、spill：单条事实的外溢

现在看第二把刀。场景：模型执行了一个命令，输出五万字。整段塞进历史？一步就吃掉窗口的零头；截断？可能丢掉关键信息。spill 的方案是把**全文存到外部，历史里只留定位信息**：

```text
tool/result 实际入账的内容:
  ┌────────────────────────────────────────┐
  │ 输出过大，已存储至 spill://session-7/x9f │  ← 定位信息
  │ （前 N 行预览…）                        │  ← 预览片段
  │ 取回指引：使用 read_spill 工具按需读取    │  ← 给模型的自助通道
  └────────────────────────────────────────┘
```

spill 家族同样是标准三件套：

- **`spill/`（Service Definition）**：定义 `SpillStore` 服务（`ctx.spillStore`）——持久化过大文本、返回面向模型的定位信息与取回指引，注释强调"它不规定如何实现"；
- **`spill-local/`（Provider）**：官方实现，存在宿主文件系统的私有会话级文件里；
- **`spill-policy/`(Consumer)**：挂在工具结果流水线上的策略——判断多大算"过大"、执行外溢动作。

README 特别点出这个拆分的意图："未来的远程或虚拟后端（例如 spill:// URI、数据库键）可以实现此 Service Definition，无需修改策略插件"。又是接缝的力量：换存储实现，上下游无感。

注意 spill 与 pruner 的微妙差别：pruner 处理的是**历史里的旧结果**（时间维度的清理），spill 处理的是**刚产生的超大新结果**（空间维度的分流）。一个管存量，一个管增量。

## 四、谁在什么时候触发？

两条路径：**自动**——token 压力策略在请求前检查，超阈值即触发压缩（运行在 runMaintenance 相位，第 12 讲提过的"家务活不走 turn"）；**手动**——用户敲 /compact 命令（command-compact 注册到 ctx.commands，这类命令不需要模型轮次即可分派）。

还有一个呼应细节：如果一轮因输出触顶以 max-tokens 结束，这个结局是粘性的（第 13 讲）——即使后续步骤正常完成也不许改写。压缩策略读日志时因此能准确识别"哪几轮是被截断的"，避免把残缺回复当成完整事实去摘要。**每个设计都在为别的设计的正确性打工**——这是读懂大型代码库后最愉悦的时刻。

## 试一试

打开 `packages/spill/spill/README.zh.md` 的服务 API 表格，找出 SpillStore 返回的定位信息里除了 URI 还包含什么。再想一个问题：如果模型拒绝使用取回工具、坚持要你"直接贴出全文"，你会怎么设计指引文案来引导它？

## 下一讲预告

压缩和注入都依赖同一个基础设施：收件箱。下一讲拆卷三最后一块——Inbox 类：next-turn 与 next-step 双队列、splice 的持久投影、唤醒闩锁的收敛逻辑。看完它，515 行主循环的所有配角就都认识了。
