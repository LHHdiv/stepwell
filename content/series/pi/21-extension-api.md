---
title: 第21讲·扩展系统 ExtensionAPI
summary: 把"支持哪些工具、命令、快捷键、provider"全部开放给扩展——ExtensionAPI 是 pi 相对 dsh 最激进的一步：产品形态本身可插拔。
objectives:
  - 说出 ExtensionAPI 开放了哪几类能力，为什么说"产品形态可插拔"
  - 讲清 registerTool / registerCommand / registerShortcut / registerFlag 各自把什么注入系统
  - 把 ExtensionAPI 和第 03 讲"自扩展哲学"、第 19-20 讲工具系统连起来
tags: [pi, 扩展系统, ExtensionAPI, 插件化]
keyPoints:
  - "ExtensionAPI 是扩展能拿到的'能力面板'（extensions/types.ts:1198），pi 把工具/命令/快捷键/CLI flag/provider/markdown/UI/事件全部开放给它"
  - "registerTool（types.ts:1251）只是其一；还有 registerCommand、registerShortcut、registerFlag、registerProvider 等，分别注入不同维度能力"
  - "扩展以工厂函数 (pi: ExtensionAPI) => void 注册（types.ts:1519 附近），从 cwd/.pi/extensions 与内置目录经 jiti 动态加载（loader.ts:689 / :436）"
  - "一个 pi 进程装不同扩展，就变成不同产品——这正是第 03 讲'零件边界也可插拔'的极致体现"
  - "扩展能监听 30+ 种事件（session_start、project_trust、resources_discover…），在生命周期各节点介入"
---

第 03 讲我们埋下一句话：pi 把"插件化"做到了极致——**不仅记忆、工具、UI 是插件，连"支持哪家模型供应商""接受什么斜杠命令""绑定哪个快捷键"都交给扩展注入**。这句话的主语，就是本讲的主角 `ExtensionAPI`。它是 pi 相对 dsh 最激进的设计：dsh 的插件化是"能力可加"，pi 的插件化是"**产品形态本身可重塑**"。

## 一、先结论：ExtensionAPI 是一块"开关面板"

扩展在加载时，会拿到一个 `pi` 对象，类型就是 `ExtensionAPI`（定义在 `packages/coding-agent/src/core/extensions/types.ts:1198` 一带）。它不是一堆零散函数，而是一块集中了所有"可注入能力"的面板：

```ts
interface ExtensionAPI {
	// —— 工具与命令 ——
	registerTool(tool: ToolDefinition): void;          // 注入一个工具（第 19-20 讲）
	registerCommand(command: CommandDefinition): void;  // 注入一个斜杠命令，如 /commit
	// —— 交互与键位 ——
	registerShortcut(shortcut: ShortcutDefinition): void; // 绑定一个快捷键
	// —— 启动参数 ——
	registerFlag(flag: FlagDefinition): void;           // 给 CLI 加一个新参数
	// —— 模型供应商 ——
	registerProvider(provider: Provider): void;         // 接入新的 LLM 供应商
	// —— 渲染与 UI ——
	registerMarkdownComponent(...): void;               // 自定义 markdown 渲染
	ui: ExtensionUIContext;                             // 选择/确认/输入/通知等 UI 能力
	// —— 事件总线 ——
	on(event, handler): void;                           // 监听 30+ 种生命周期事件
}
```

注意一个细节：第 20 讲工具示例里写的是 `pi.registerTool(...)`，这里的 `pi` 就是 `ExtensionAPI` 实例。工具的"身份证"（`defineTool`）和"上户口"（`registerTool`）是通过这块面板接进系统的。

## 二、八类能力，对应产品的八个维度

把 `ExtensionAPI` 的方法摊开，正好对应一个编码智能体的八个产品维度：

| 能力 | 方法 | 它决定产品的什么 |
|---|---|---|
| 工具 | `registerTool` | agent 能"动手"做什么 |
| 命令 | `registerCommand` | 用户能敲什么斜杠指令 |
| 快捷键 | `registerShortcut` | 终端里按什么键触发什么 |
| CLI 参数 | `registerFlag` | 启动命令多哪些开关 |
| 模型供应商 | `registerProvider` | 背后接哪家 LLM |
| Markdown 渲染 | `registerMarkdownComponent` | 对话里代码块/图表怎么显示 |
| UI 组件 | `ui.*` | 选择/确认/输入的交互形态 |
| 事件钩子 | `on(...)` | 在生命周期哪一点介入 |

> **知识拓展**：这种"把产品所有可变面都收进一个 API"的思路，和 VS Code 的 `ExtensionContext`、Figma 的 Plugin API 同源。区别是 pi 走得最远——连"供应商"和"CLI 参数"都开放了，意味着扩展能改的不只是行为，还有**接入的外部世界**。

## 三、事件总线：扩展的"眼睛和耳朵"

`ExtensionAPI` 不止有"注入"，还有"监听"。扩展可以订阅 30+ 种事件，在生命周期各节点介入。几个关键事件（`extensions/types.ts` 中定义）：

- **`session_start`**（`:562`）：会话启动/恢复/分叉时触发，可据此注入资源路径。
- **`project_trust`**（`:519`）：当 pi 遇到需要"是否信任此项目"的决策时，扩展可以接管这个判断——这和第 00 讲提到的"权限外推为部署形态"直接相关。
- **`resources_discover`**（`:544`）：让扩展补充 skill / prompt / theme 的路径。
- 还有消息流事件、工具调用事件等，覆盖一整轮对话的每个切面。

换句话说，扩展既能"主动加能力"（注册工具/命令），也能"被动响应"（监听事件），双向打通。

## 四、扩展怎么"上户口"：工厂函数与动态加载

扩展不是静态 import 进来的，而是**运行时发现 + 动态加载**的。看 `types.ts:1519` 附近的 `ExtensionFactory`：

```ts
type ExtensionFactory = (pi: ExtensionAPI) => void;  // 拿到面板，往里塞东西
```

加载发生在 `packages/coding-agent/src/core/extensions/loader.ts`：

- `:689` `discoverAndLoadExtensions`：扫描 `cwd/.pi/extensions` 目录与内置扩展目录，找出所有候选。
- `:436` `loadExtensionModule`：用 `jiti` 动态加载 `.ts` / `.js` 扩展文件（无需预编译）。
- `:174–242` `bindCore`：在加载期把 `ExtensionAPI` 的懒绑定准备好，等扩展调用 `registerXxx` 时再落库。

> **一句话总结**：`ExtensionFactory` 是"插件入口"，`jiti` 是"免编译加载器"，`loader` 是"发现 + 上户口"的总调度。三者让 pi 在启动那一刻，才决定自己"是谁"。

## 五、试一试

1. 打开 `packages/coding-agent/examples/extensions/hello.ts`，找到它的 `ExtensionFactory` 函数签名，数一数它往 `pi` 面板上注册了几样东西。
2. 在 `extensions/types.ts` 里搜索 `registerCommand`，对比 `registerTool` 的签名差异（命令为什么不需要 `execute` 返回值给模型？）。
3. 思考：如果某扩展 `registerProvider` 接入了一个错误配置的供应商，会影响别的扩展吗？结合"每个扩展独立加载"的设计给出你的判断。

## 下一讲预告

上一讲我们看到 loader 用 `jiti` 免编译加载扩展。下一讲就钻进 `loader.ts`，看清"发现 → 加载 → 绑定 → 热更新"这条流水线，以及为什么 pi 选择 jiti 而不是 require/import。
