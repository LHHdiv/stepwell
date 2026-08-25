---
title: 第42讲·开发工作区：从读源码到改源码
summary: 搭建插件开发工作区：目录布局、demo 组合包与叶节点的关系、cookbook 路线图与调试回路。
objectives:
  - 建立标准工作区布局并区分"组合包"与"叶节点"
  - 找到对应你扩展目标的 cookbook 路线
  - 打通"改代码→重启→验证"的最短回路
tags: [deepseek-harness, 开发环境, 实战]
keyPoints:
  - 工作区三件套：官方仓库（你的 fork）+ 自己的插件包目录 + 试验用沙箱
  - packages/examples 的 demo 是组合包，根目录 examples/ 是加载它们的叶节点——别混淆
  - docs/cookbook 九篇分步指南按扩展目标索引；extension-cookbook 是总纲
  - 调试三板斧：dump-config 看树、日志看事件、最小复现定位
---

毕业前最后一课准备。四十二讲下来你读了大量别人的代码，本讲把镜头转向你自己：搭一个顺手的工作区，让第一行自己的插件代码能跑起来。

## 一、工作区布局

推荐的三件套结构：

```text
~/dsh-workspace/
├── deepseek-harness/     # 官方仓库（建议 fork 成你自己的远程）
├── my-plugins/           # 你的插件包们
│   └── dsh-plugin-xxx/
└── sandbox/              # 试验场（让智能体在这里折腾，随便删）
```

接入方式二选一：**深度开发**就把你的包放进 monorepo 的 packages/ 下（共享构建链、改核心方便）；**独立演进**就保持独立目录、经配置树挂载（第 04 讲的 patch 机制）——个人智能体推荐后者：**你的插件和上游零耦合，dsh 升级随便跟**。

## 二、demo 与叶节点：一对容易混淆的目录

仓库里有两个 examples，职责截然不同。packages/examples/README 特意写了一段防混淆声明：

> 不要将此组与仓库根目录的 examples/ 混淆：该目录存放可运行的 cordis.yml **叶节点**；此组存放这些叶节点加载的**组合包**。

拆开说。packages/examples/ 里是三个预先组合的插件大礼包：agent-spine-demo（可复用的智能体主干）、acp-demo(加自动化入口)、jsonrpc-demo（外部 JSON-RPC 运行时）。它们是**演示/参考包**——`-demo` 后缀明示不属于产品 API。而根目录 examples/ 是一份份可直接运行的 cordis.yml 叶节点：内容往往只有几行——引用一个 demo 组合包、换上可替换的后端。

对你的意义：想快速起一个自定义运行时？抄一个叶节点 YAML、指向 agent-spine-demo 或自己的组合包即可，无需手工组装主干和运行入口。**从模仿 demo 开始，永远是最短的启动路径。**

## 三、cookbook：九篇指南的路标

docs/cookbook/ 是官方的实操手册群，按扩展目标索引：

```text
adding-a-package            # 加一个新包（包检查清单）
adding-a-tool               # 加一个工具（defineTool 全流程真源）
adding-an-llm-adapter       # 加一个模型适配器
adding-a-conversation-node  # 加一个 Web 界面聊天节点
adding-a-settings-card      # 加一张设置卡片
extension-cookbook          # 总纲：功能 → 能力 → 扩展点映射
```

总纲 extension-cookbook 的自我定位很诚实："代码片段省略了 import 和辅助实现，无法直接复制运行"——它们是参考模式，不是复制粘贴素材。配合前面课程的知识使用姿势：先在总纲里找到"我想做的事属于哪个扩展点"（那张表你已经见过三次），再进对应的分步指南。

## 四、调试回路：三板斧

插件开发的日常循环是"改代码 → 重启 → 验证"，三件武器让你在出错时快速定位：

**① dump-config 看树。** 插件没生效？第一步永远是 `dsh --profile web --dump-config | grep 你的id`——确认挂载是否成功。90% 的"我的插件不工作"死在这一步：id 打错、YAML 层级错、patch 没命中。

**② 日志看事件。** 会话日志是全知视角（第 07 讲）：hook 有没有被调用（hook/invoked 事件）、工具收到什么参数（tool/call 的原始 arguments）、重试发生了几次（llm/retry）……一切皆有留痕，grep 即真相。

**③ 最小复现。** 行为诡异时，把场景裁剪到最简：一个只有你插件的叶节点配置 + 一条固定提示词。如果最小复现还坏，问题在你的代码；如果好了，是与其他插件的相互作用——二分查找开始。

加上一条工程习惯：给你的注册都写上 HMR 安全测试（第 41 讲说过每个注册表都有这种测试范式）——dispose 干净了，热重载才不会积累幽灵。

> 💡 **知识拓展：fork 上游仓库的策略**
> 建议 fork 而不是裸 clone，因为你迟早会想给上游提 PR（修个文档错字也是贡献！）。分支纪律：upstream/main 跟踪官方，main 只做同步，所有自己的实验开 feature 分支。dsh 处于开发者预览期、破坏性变更频繁——保持与上游的可合并性，比任何本地魔改都重要。

## 试一试

完成一次端到端的最小验证：clone 并构建官方仓库 → 在根目录 examples/ 抄一个叶节点 YAML 改名 → 用它启动 headless 跑通一句话对话 → 改叶节点里的一处配置重启观察变化。走完这个循环，你就拥有了本系列全部知识的试验场。

## 下一讲预告

终章：毕业设计。综合四十二讲的所有知识，从需求到架构到实现，写出一个真正属于你的个人智能体插件包——并让它成为能陪你长期成长的终身项目。
