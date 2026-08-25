---
title: 第21讲·沙箱与审批：给危险操作上双保险
summary: 拆解 ctx.sandbox 的 argv 包装术、三种限制模式、fail-closed 承诺，以及审批流的一次性语义。
objectives:
  - 解释 confine(argv, policy) 的返回值如何取代原始命令
  - 区分 SandboxMode 三种模式与 Enforcement 两种完整度
  - 说出"策略随调用传递"与"容器不是后端"两条边界宣言的含义
tags: [deepseek-harness, sandbox, 审批]
keyPoints:
  - 核心约定一句话：confine(argv, policy) 返回应当取代原 argv 的包装版
  - 三模式 read-only / workspace-write / danger-full-access；两完整度 full / partial
  - 无可用后端时抛 SANDBOX_UNAVAILABLE——绝不原样放行 argv（fail-closed）
  - 策略随每次调用传递而非绑定提供方：两个消费方可用不同策略并存
---

第 20 讲流水线的③⑤两站是整个安全体系的核心，本讲放大细看。先想清楚威胁模型：智能体要执行 shell 命令、改文件——这些能力一旦被模型误用（或被提示词注入劫持），最坏能造成什么？删库、泄密、装后门。防线分两层：**沙箱管"就算执行了也翻不了天"**（技术强制），**审批管"动手前人类点过头"**（授权确认）。两层互补，缺一不可。

## 一、sandbox 接缝的核心理念

`packages/sandbox/sandbox/README.zh.md` 开头用一句话概括了整个约定：

> `ctx.sandbox.confine(argv, policy)` 返回用于 spawn、**应当取代调用方原始 argv** 的 argv。

argv 就是命令行参数向量（如 `['bash', '-c', 'rm -rf tmp']`）。confine 不去"审查"命令、也不在执行时拦截系统调用——它直接**改写命令本身**，给进程套上一层运行时牢笼：

```text
原始:   ['bash', '-c', 'npm test']
包装后: ['bwrap', '--ro-bind', '/', '/', '--bind', '~/.dsh/workspace', ...,
         'bash', '-c', 'npm test']     # Linux bwrap 后端的示意
```

进程从出生就在笼子里，它的所有子进程继承牢笼。这个设计的优雅之处在于**消费方无感**：bash 工具只管把 argv 换成 confine 的返回值再 spawn，不需要懂任何沙箱技术。

**fail-closed 的承诺**写在注释里："没有可用后端时，它会抛出异常，绝不会原样传递 argv 使其不受限制地运行。"对照一下常见的反面设计（沙箱不可用就降级直跑并打个警告）——dsh 认为**安全能力的缺失必须是显式错误，而不是静默降级**。和第 07 讲 ignorable 的哲学同根同源。

## 二、词汇表：模式与完整度

接缝定义了两组关键词：

**SandboxMode（限制模式）三档：**

| 模式 | 含义 |
|---|---|
| `read-only` | 只读——可以看，不许碰 |
| `workspace-write` | 只许写工作区目录 |
| `danger-full-access` | 完全放开（名字里带 danger 是故意的） |

**SandboxEnforcement（强制完整度）两档**：full 与 partial——按内核 ABI 区分。诚实的工程承认现实：不同操作系统内核提供的隔离强度不同（Linux 的 Landlock、macOS 的 Seatbelt），与其假装一致，不如如实报告"这次限制做到了几成"，让上层策略自己决定 partial 是否可接受。

官方实现是 `sandbox-local`：Linux 用 bwrap（bubblewrap），否则平台原生 Landlock launcher；macOS 用 sandbox-exec/Seatbelt。注意 README 划下的边界线：

> **只支持与宿主共享文件系统和内核的限制。** 容器、microVM 与远程执行器都不是该 seam 的后端——它们会以环境一致的分组**替换整个能力 seam 的 Service Provider**（ctx.shell、ctx.fs）。

这句话值得读三遍。为什么 E2B 这类云沙箱不算"后端"？因为本地沙箱只是给进程加箍，进程还活在你的机器上；而远程沙箱是把整个执行世界搬走——文件系统、shell、终端全都换了。前者是 Provider 内的实现细节，后者是整个 Provider 的替换。**分清"换零件"和"换器官"**，扩展点才不会设计错层级。（仓库里确实有 e2b 包——它就是以整套 Provider 替换的方式存在的。）

## 三、策略随调用走

另一条反直觉的设计："策略随调用传递，而不属于提供方"。注释给了具体例子：

> bash 使用 read-only，而受限制的子 agent 保持其状态目录可写；获批的升权重试只是使用更宽策略发起的新调用。

如果策略绑死在提供方上，两种并行需求就要两个提供方实例；而"策略参数化"让同一个 confine 服务同时服务多种严格度。甚至审批流程的"批准升级"也被统一进来：用户批准了更高权限？那只是下一次调用带着更宽的策略重新走一遍 confine——**授权变更不需要新机制，只是新参数**。

还有一个安全细节见功力："workspaceRoot 先解析 symlink 再规范化，因此含 symlink/.. 的有效 cwd 会授权 chdir 实际到达的目录，而非无关的词法父级"。翻译：防止攻击者用符号链接把"看起来在工作区"的路径偷换成工作区外的真身。路径类安全漏洞的头号套路，一句话堵死。

## 四、审批：把决策权交还人类

技术强制再强，也有需要人类拍板的时刻。审批流的要点在第 20 讲已点过：ctx.approval 一次性提问、无人应答即拒绝。补充它的位置哲学——审批不是独立组件，而是 pre-execute 瀑布里的一个监听者返回 ask 的产物。这意味着：

- **任何插件都能发起审批**：写一个监听器判断"这条命令包含 rm"，返回 ask 即可；
- **审批策略可插拔**：全自动放行（CI 场景）、全部询问（偏执场景）、白名单免审（信任场景）都是不同的监听者实现;
- **拒绝有据可查**：每次问答都随事件留痕，审计链完整。

自动化与人工介入的分界线由此变成一个纯策略问题——框架不替你决定哪里该问人，但保证问的时候一定等得到、拒的时候一定留得下记录。

> 💡 **知识拓展：安全设计的纵深防御（Defense in Depth）**
> 数一数一次 bash 调用穿过了多少层防线：①提示词层（system prompt 里的行为准则）→②模型自律→③pre-execute 权限瀑布→④单调守卫→⑤人工审批→⑥沙箱 argv 包装→⑦fs 意图门控→⑧post-execute 结果检查。八层！每一层单独都不完美（模型可能被骗、审批可能误点、沙箱可能有内核漏洞），但突破全部八层的概率是乘积级的。安全从不依赖单点完美——这正是纵深防御的精髓。

## 试一试

打开 `packages/sandbox/sandbox/src/index.ts`，找到 SandboxProvider 接口定义，数出它除了 confine 还暴露哪些成员。然后思考题：为什么"detect 当前平台支持哪种沙箱"这件事不属于接口的一部分？（提示：回想第 09 讲 session-query "provider-independent 过滤"的同款取舍。）

## 下一讲预告

安全体系外围还有一个广阔的世界：shell 的四种后端、持久终端、subprocess 孵化器、fs 提供方与观察策略。下一讲合卷四——巡礼"执行世界"的全部地基，看智能体的手脚到底站在什么样的土地上。
