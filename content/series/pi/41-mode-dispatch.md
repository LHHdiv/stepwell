---
title: 第41讲·模式分派：从 Args 到三种姿态
summary: 解析出 Args 后，coding-agent 据 AppMode 把同一个 AgentSession 导向 interactive / print / rpc。本讲看这条分派链路。
objectives:
  - 说出 AppMode 决定什么、在哪里被读取
  - 解释三种模式如何共享同一个 AgentSession（呼应第 23/39 讲）
  - 把模式分派和第 25 讲信任边界（client/server）连起来看 rpc
tags: [pi, 模式分派, AppMode, 总装]
keyPoints:
  - "AppMode 类型（project-trust.ts:12 一带）是模式总开关，由解析出的 Args 决定"
  - "main.ts 在 parseArgs（:609）后据 AppMode 分派：实例化对应 mode 模块（interactive/print/rpc）"
  - "三种模式共享同一个 AgentSession（第 39 讲）：差异只在'输入从哪来、输出到哪去'（第 23 讲）"
  - "rpc 模式把 AgentSession 暴露为可被外部调用的服务，天然衔接第 25-28 讲的 client/server 信任边界"
  - "分派是'总装'最后一环：CLI(38)→配置(39)→模式(本讲)→真正 run"
---

前面几讲分别看了：CLI 把意图翻成 `Args`（38）、`AgentSession` 把内核包成可运行对象（39）、扩展决定产品形态（40）。这一讲看总装的最后一环——**模式分派**：同一个 `AgentSession`，怎么被导向 interactive / print / rpc 三种姿态。

## 一、先结论：AppMode 是分派的总开关

模式的总开关是 `AppMode` 类型，定义在 `packages/coding-agent/src/core/project-trust.ts:12` 一带。它和第 21 讲提过的 `project_trust` 事件同源文件——不奇怪，因为"以什么姿态运行"和"是否信任此项目"都是启动期的关键决策，归在一起管理。

`coding-agent` 的启动流程（在 `main.ts`）大致是：

```
parseArgs(args)            // :609 解析出 Args（含模式/扩展/工具等）
   ↓
据 Args 决定 AppMode       // 读 project-trust.ts:12 的 AppMode
   ↓
实例化对应 mode 模块        // interactive / print / rpc
   ↓
创建 AgentSession（第 39 讲）并交给该 mode 驱动
   ↓
mode.run()                 // 进入第 23 讲描述的对应循环
```

## 二、为什么三种模式共享一个 AgentSession

第 23 讲说过：三种模式的**唯一差异**是"输入从哪来、输出到哪去"，内核不变。第 39 讲补了一句：`AgentSession` 是那个"可被驱动"的统一对象。于是分派时，pi 做的是：

1. 先按 `Args` 创建一个配好的 `AgentSession`（能力集已由第 40 讲旋钮定好）；
2. 再按 `AppMode` 选一个"驱动器"包住它：
   - interactive 驱动器：`while(true){ getInput; session.prompt }`（interactive-mode.ts:1094）；
   - print 驱动器：`session.prompt(input)` 一次就退出（print-mode.ts:33）；
   - rpc 驱动器：把 `session.prompt` 暴露给远程调用。

**会话对象只建一次，驱动器可换**——这正是"关注点分离"：内核/配置与"运行姿态"解耦，分派只是"选驱动器"。

## 三、rpc 模式与信任边界的呼应

特别值得点出 rpc 模式：它把 `AgentSession` 当服务暴露，上层（IDE、编排脚本）通过第 27–28 讲的 client/server 协议远程调它。

这和第 25 讲的"信任边界"完美咬合：rpc 模式下，`coding-agent` 本地进程既跑 agent 又持 client，远程那个 `pi-server` 持密钥。于是"可被机器调用的智能体"同时也是"密钥隔离的安全形态"。模式分派不只是 UX 选择，有时也是**部署形态的选择**。

## 四、分派是总装的收口

把"产品总装"四讲串起来：

- 第 38 讲 CLI：把用户意图 → `Args`；
- 第 39 讲 `AgentSession`：把内核 + 工具 + 扩展 + 持久化 → 可运行对象；
- 第 40 讲可塑性：用旋钮把对象调成"特定产品"；
- **第 41 讲分派**：把 `Args` + 对象 → 具体运行姿态 → `run()`。

到这一步，`coding-agent` 才真正"活"起来——前面所有零件（agent 运行时、tui、client、扩展、评测、持久化、遥测）被这一条链路串成用户敲 `pi` 就能跑的产品。

## 五、试一试

1. 在 `main.ts` 里搜 `AppMode` 的分派点（if/switch），看它是按 `args.mode` 还是按"有无某个 flag"决定 interactive / print / rpc。
2. 打开 `modes/rpc/`，确认它是否真的持有一个 `AgentSession` 并把它包成服务（印证"共享一个会话"）。
3. 思考：如果 interactive 和 rpc 同时想驱动同一个 `AgentSession`，分派逻辑该不该允许？从"会话状态所有权"角度给判断（提示：回到第 36 讲写入权威）。

## 下一讲预告

`coding-agent` 有 CLI 这副"面孔"，但产品还想要"库"这副面孔——嵌进你自己的程序里。下一讲看 SDK 逐层工厂：如何不靠命令行、用代码把 pi 组装进宿主应用。
