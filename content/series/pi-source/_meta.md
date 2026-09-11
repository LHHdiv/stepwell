---
title: "Pi 源码逐文件解析"
en: "PI SOURCE WALKTHROUGH"
sub: "对 pi 仓库每一个源码文件的逐篇拆解：从 ai 抽象层一路读到 coding-agent 产品总装，共 737 讲。"
intro: >
  与《Pi Agent Harness 源码精读》的「讲课」路线互补，这一套是「逐文件」路线：pi 仓库里每一个真正参与构建的源码文件，
  都有一篇对应的解析——它在哪、被谁调用、解决什么问题、关键函数怎么走。按包编排成十三卷：
  学前准备（TypeScript 读法、术语表、断点调试）、仓库根（构建与发布脚本）、pi-ai（LLM 抽象层与 40+ 厂商适配）、
  pi-agent-core（Agent 循环、harness 可恢复会话）、chord、protocol（CBOR 线协议）、session-backends（SQLite 持久化）、
  client / server（信任边界与进程分离）、telemetry（埋点契约）、tui（手写差分渲染）、coding-agent（259 篇，产品总装）、
  evals（轨迹评测）。适合当作常备的源码字典：读到哪个文件卡住，就翻哪一篇。
category: source
level: deep
hue: "#1E4A6B"
hue2: "#7FA8C8"
status: ongoing
order: 4
phases:
  - name: "卷零 · 学前准备：怎么读这套文档（0-3）"
    slugPrefix: "0-3"
  - name: "卷一 · 仓库根：构建、发布与工程配置（4-59）"
    slugPrefix: "4-59"
  - name: "卷二 · pi-ai：LLM 抽象层与 40+ 厂商适配（60-240）"
    slugPrefix: "60-240"
  - name: "卷三 · pi-agent-core：Agent 循环与可恢复会话（241-332）"
    slugPrefix: "241-332"
  - name: "卷四 · chord：轮式服务与状态打包（333-357）"
    slugPrefix: "333-357"
  - name: "卷五 · protocol：CBOR 线协议与分帧（358-366）"
    slugPrefix: "358-366"
  - name: "卷六 · session-backends：SQLite 会话仓库（367-388）"
    slugPrefix: "367-388"
  - name: "卷七 · client：瘦控制器与连接（389-397）"
    slugPrefix: "389-397"
  - name: "卷八 · server：受信任大脑与会话管理（398-414）"
    slugPrefix: "398-414"
  - name: "卷九 · telemetry：遥测契约与埋点（415-421）"
    slugPrefix: "415-421"
  - name: "卷十 · tui：终端 UI 与差分渲染（422-465）"
    slugPrefix: "422-465"
  - name: "卷十一 · coding-agent：产品总装（466-724）"
    slugPrefix: "466-724"
  - name: "卷十二 · evals：轨迹评测与回归（725-736）"
    slugPrefix: "725-736"
---

这一套文档的组织方式和《Pi Agent Harness 源码精读》不同。那套是 46 讲课程，按「世界观 → 地基 → 心脏 → 手脚」的线索把仓库讲一遍；这一套是**逐文件字典**——你打开 `packages/` 下任何一个文件，都能在这里找到对应的那一篇。

每篇的结构基本一致：先一句话说明这个文件干什么、被谁调用，再讲它解决问题的具体机制，必要时贴上关键代码段与源码行号。包内顺序不是按字母，而是按调用关系与依赖层次。

十三卷的划分对应 pi 的依赖分层：`ai` 是最底层（不带任何 Agent 概念，只管和模型说话），`agent` 是循环内核，`coding-agent` 在最上层把一切焊成产品；`protocol` / `client` / `server` 是信任边界那一刀，`tui` 与 `session-backends` 分别是脸面和记忆。

读法建议：第一次跟路径时，按卷次从学前准备一路往下读；之后当作字典用——在源码里遇到不认识的模块，直接搜文件名跳到对应篇目。
