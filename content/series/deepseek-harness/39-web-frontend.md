---
title: 第39讲·web 前端深潜：ThemeRuntime 与不碰 DOM 的纪律
summary: 精读 ui-theme 与 locale 两个运行时：token 化主题、防闪烁引导、回环特权与类型化翻译。
objectives:
  - 解释"服务绝不接触 DOM"的分层理由
  - 复述主题初始化的防闪烁三步方案
  - 描述 locale 的查找链与 settings 持久化边界
tags: [deepseek-harness, web 前端, theme]
keyPoints:
  - ThemeRuntime 基于 --dsw-* token（静态尺度 + 别名语义层），发布不可变 ThemeSnapshot
  - 防闪烁：宿主向 index 嵌入偏好 → 同步引导代码在首帧前设 color-scheme → 运行时接管
  - 回环浏览器有 settings 特权，远程浏览器的选择仅存进程内——按网络位置分权
  - locale 查找链 ns → common → en → key，类型化的 register/bind 契约
---

上一讲看了 client 的骨架，本讲挑两个最有教学价值的运行时深潜：ui-theme 和 locale。它们体量不大，却把前端架构里最难的两课——**状态与呈现分离**、**初始化时序**——演示到了极致。

## 一、ThemeRuntime：绝不接触 DOM 的服务

ui-theme README 的第一段就抛出一条铁律：

> 它拥有实时主题偏好……发布**不可变的 ThemeSnapshot**，通过 theme/change 事件通知变化；它**绝不接触 DOM**：ui-layout 的呈现器会应用解析后的快照。

把一个功能劈成两半：**决策者**（ThemeRuntime：知道现在该用暗色还是亮色，产出快照）和**执行者**（ui-layout 的渲染器：拿快照去改 html 的 color-scheme 和 body 的 data 属性）。为什么这么较真？因为决策和执行的耦合是前端复杂度的头号来源——一旦主题服务直接操作 DOM，它就得处理"DOM 还没 ready 怎么办""组件卸载了谁清理"这类时序地狱，单元测试也得拖上整个 DOM 环境。分离后，ThemeRuntime 是个纯逻辑状态机，测试只需断言快照内容。

**token 架构**也值得一提："基于 --dsw-* token 基础样式表（静态尺度 + 别名语义层）"。两层设计：底层是静态尺度（间距 4/8/16、字号阶梯），上层是语义别名（--dsw-surface、--dsw-text-primary 指向下层）。主题切换只换别名的指向，所有组件引用别名——于是新主题只需要一张别名映射表，不需要碰任何组件样式。这是设计系统的标准解法，值得每个前端项目抄写。

## 二、防闪烁：一段教科书级的初始化

暗色主题最经典的翻车现场：页面先白闪一下才变黑（FOUC）。看 dsh 的三步方案：

1. **宿主注入**："当主机组合包含 HTTP 服务器时，主机侧紧接 `<body>` 起始标签**注入同步引导代码**。每份 index 响应会嵌入已注册的 Host 设置 ui-theme.preference"——用户的偏好被直接烙进 HTML 里送达；
2. **同步设色**：这段引导代码在页面渲染前就设置 color-scheme 和 data 属性——第一帧就是正确主题，无从闪烁；
3. **运行时接管**：插件树激活后，"ThemeRuntime 与 ui-layout 仍分别是客户端状态和后续 DOM 更新的权威来源"，引导代码功成身退。

注意时序里的分工哲学：**最关键的初始状态由最快的通道（HTML 内联）保证，后续演化由正规体系接管**。没有为了架构纯洁让首屏闪白，也没有为了速度绕过架构乱改 DOM——两全来自对"哪个阶段该谁说话"的清晰排序。

## 三、locale：类型化的翻译契约

locale 包管中英文切换，三个设计点：

**持久化走 settings**："zh/en 偏好以 locale.preference 存储在 $DSH_HOME/settings.yaml"——语言偏好不是浏览器 localStorage 里的孤岛，而是宿主设置的一部分：换台机器连上同一个宿主，语言跟着走。

**优雅的初值策略**："没有显式 Host 值时，全新浏览器暂时使用 navigator 请求的语言（按主子标签匹配）……Host 读取在插件激活后执行，因此 **settings 服务不可用不会阻塞页面**"。先用浏览器语言的暂定值立刻渲染，宿主的权威值到了再热替换。又是"暂定值 + 权威值"双轨制——第 38 讲 RPC 校验、这里初始化，同款模式反复出现。

**类型化字典**："类型化 register(ns, {zh, en}) 按 LocaleNamespaceMap 校验，bind(ns) → TranslateNS<ns>"——翻译键不是裸字符串而是类型参数：bind('settings') 返回的翻译函数只知道 settings 命名空间的合法键，拼错键名编译期报错。i18n 从"字符串对不上就显示 key"升级为"编译器替你查字典"。

## 四、回环特权的再一例

两个运行时都重复同一句纪律："settings API **仅限回环请求**，远程浏览器的选择仅保留在进程内。"第 38 讲从安全角度讲过它，这里补充产品视角：这个限制换来了 settings.yaml 作为**唯一真相源**的地位——不存在 localStorage 与宿主文件互相覆盖的同步噩梦。限制造就简单，简单成就可靠。

> 💡 **知识拓展：前端状态管理的"所有权声明"**
> ui-theme 注释里有个措辞值得学：它是主题偏好的"**拥有者**"（owner）。给每个状态明确指定唯一拥有者、其他一切通过事件订阅——这消解了前端一大类 bug（两处代码都以为自己负责这个状态）。React 社区的"状态提升"、Redux 的 single source of truth、这里 Cordis 服务的事件通知，全是同一思想的不同方言。评审前端代码时第一个问题永远是：这个状态谁是 owner？

## 试一试

打开 packages/client/ui-theme/README.zh.md 对照本讲，找出 ThemeSnapshot 里除了明暗之外还携带什么。然后思考题：如果用户连续快速点击主题切换按钮，那段"按操作顺序携带 namespace revision 串行写入，最新写入被拒时重新加载持久化值"的机制如何防止乱序？

## 下一讲预告

界面与协议都齐了，最后一扇门留给第三方开发者：sdk 家族。下一讲看如何从另一个进程驱动 harness 运行时——换行分帧的 JSON-RPC、双语言客户端，以及“不创建不配置不启动你的项目”的产品边界。
