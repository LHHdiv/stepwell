---
title: 第22讲·没过关就不能假装学会
summary: 精通路径挂在聊天循环上：模型决定怎么教，引擎决定能不能翻下一页。
objectives:
  - 知道 mastery_path 复用聊天循环并挂上精通工具
  - 能区分记忆/程序的分数门槛与概念/设计的质性过关
  - 明白 next_objective 由是否掌握推出来，不是手动拨关卡
tags: [deeptutor, 精通, 掌握式学习]
keyPoints:
  - 每轮先问 mastery_status
  - 定量约 0.9，定性靠 mastery_assess
  - 间隔复习到期会插队
---

有的辅导软件爱说「真棒，我们进入下一章」——其实学生只是点过「下一题」。DeepTutor 的 **mastery_path（精通路径）** 把校规写死：**没过关，就不能装会。** 模型可以温柔、可以打比方，但翻页的钥匙不在修辞里。

## 导师是聊天循环，门卫是引擎

能力在 `deeptutor/capabilities/mastery/capability.py`：打上 `mastery_mode`，解析路径 id，然后还是跑 `AgenticChatPipeline`。剧本在 `deeptutor/capabilities/mastery/prompts/zh/system.md`；专用工具在 `deeptutor/capabilities/mastery/tools.py`：

- **mastery_status**：每轮先问「现在该攻哪一知识点、有没有待批改、有没有到期复习」；
- **mastery_build**：还没有地图时，按材料搭模块与知识点；
- **mastery_quiz / mastery_grade**：登记题目、用 **ask_user** 出成可点卡片、收回作答再批改；
- **mastery_assess**：概念 / 设计类请学生用自己的话解释，导师判断是否真懂。

算术与门闩在 `deeptutor/learning/`，尤其是 `policy.py`：**is_mastered（是否掌握）** 是硬函数。MEMORY / PROCEDURE（记忆、程序）看近年正确率，门槛大约 **0.9**；CONCEPT / DESIGN（概念、设计）看是否留下过质性通过。**next_objective（下一个目标）** 由「哪些已经掌握」算出来——同一关不过，下一次还是它；已经证明会的可以跳过（先测后教），因为门禁读的是证据，不是关卡计数器。

> 小结：怎么教在模型，过没过关在引擎；两者故意拆开。

## 地图、复习与「先探再教」

状态里还会出现建议动作：`probe`（先探查会不会）、`practice`（继续练）、`assess`（请解释）、`review`（间隔复习到期）、`complete`（全过关）。到期复习可以插队——学会不是一次考试，而是过一阵还记得。

产品叙事常提 Alpha School 那句「大约九成把握再前进」：定量门槛对齐这个直觉。选择题目还要求选项写全正文，不能只丢 A/B/C/D 空标签，以免卡片和批改对不上号。态度可以温暖，门槛不能松成「差不多就行」。

> 小结：精通路径把「学会」定义成可检查的状态，而不是进度条动画。

## 试一试

打开 `learning/policy.py`，找到定量门槛和质性类型集合。用自己的话解释：为什么「导数定义」更适合 assess，「两位数乘法步骤」更适合 quiz + grade。再读 `mastery/prompts/zh/system.md` 开头几段，看它是否命令「每轮先调用 mastery_status」。

## 下一讲预告

下一讲离开单堂课的门槛，看老师书桌抽屉里的长期笔记：痕迹、摘要、档案，为什么要分三层。
