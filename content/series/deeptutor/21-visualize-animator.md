---
title: 第21讲·画出来、动起来
summary: 可视化先选画种，再生成、再审查；选中 Manim 就转入动画流水线。
objectives:
  - 知道 visualize 会先分析再分支
  - 能举出 SVG、图表、Mermaid、HTML 与 Manim 几类画种
  - 明白 math_animator 是动画专项，也可被可视化路由进去
tags: [deeptutor, 可视化, Manim]
keyPoints:
  - AnalysisAgent 决定 render_type
  - 文本画种走生成→审查；Manim 走多阶段渲染
  - 前端靠 render_type 选对播放器
---

有的概念用嘴讲三遍，不如在黑板上画一条正弦。有的还得让图动起来，学生才看见「相位」两个字不是抽象标签。DeepTutor 的 **visualize（可视化）** 课就是教具柜里的画板与放映机。

## 先问：这堂课该画成什么

能力在 `deeptutor/agents/visualize/capability.py`，流水线在同目录的 `pipeline.py`。第一阶段 **analyzing（分析）** 由 AnalysisAgent 看你的请求（也可参考你指定的 `render_mode`），选出一种 **render_type（渲染类型）**：

- **svg / chartjs / mermaid / html**：偏「生成一段可展示的文本或网页代码」；
- **manim_video / manim_image**：偏「请 Manim 真正去渲染动画或分镜图」。

分析结果会带着简短说明推到进度里。信封上的 `render_type` 是给前端的分诊单：同一间诊室，心电图机和放映机不能搞混。

> 小结：可视化课的第一句不是动笔，是分诊——画静态、画交互，还是上动画车间。

## 两条车间

**文本画种**大致走：generating（生成）→ reviewing（审查）。生成得不像话，还有修复路径；实在不行会落到保底 HTML，总比空白转圈强。像美术课：先交作业，老师批改，不行再改一稿。

**Manim 画种**在分析之后整段移交动画车间，阶段名换成 concept_analysis、concept_design、code_generation、code_retry、summary、render_output 这一串——先把概念设计清楚，再写动画代码，跑挂了有限次重试，最后交出片子或分镜。独立能力 **math_animator** 登记在 `builtin_capabilities.py`，专门做数学动画；可视化在选中 Manim 时会走进同一类工序。额外依赖在安装说明里的 `math-animator` 可选包。

这门课的 `tools_used` 在清单上常常是空的：它主要靠多阶段智能体协作出图，而不是在聊天循环里按 `rag`。需要材料时，你仍可在产品别的入口先准备好上下文；这里的重点是「选对画种 + 生成 + 验收」。

> 小结：静态/交互走三板斧，动画走设计与渲染长队；分诊单决定进哪条车间。

## 试一试

打开 `visualize/capability.py` 里的阶段列表，把名字分成「文本画种」和「Manim」两堆。再用自己的话各举一例请求：「画一张函数图像」「用动画演示勾股定理」——它们更可能进哪条车间？若环境允许，可试 `deeptutor run visualize "……"` 观察先出现的是不是「检测到的渲染类型」。

## 下一讲预告

下一讲回到「会不会」这件事：精通路径怎样用硬门槛，拦住「假装学会了就翻下一页」。
