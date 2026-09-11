---
title: "03 · AGENTS.md — 仓库内 agent 的硬规则"
summary: "分清「产品会读的 AGENTS.md」和「这份仓库级规则」是同一类机制、不同实例。读完应能回答：为什么禁止 npm test、为什么禁止 git add -A、为什么 models.generated.ts 不准手改。后面在 packa"
tags: [pi, root]
---
源码：`AGENTS.md`  
被谁调用：在仓库根启动的 coding agent（含 `./pi-test.sh` 跑起来的 pi 自己）；人类贡献者按 CONTRIBUTING.md 也被要求遵守。**运行时的 `Agent` 循环不 parse 这份文件**——加载它的是 coding-agent 的 AGENTS.md 资源加载器，发生在会话装配阶段。

## 本课目标

分清「产品会读的 AGENTS.md」和「这份仓库级规则」是同一类机制、不同实例。读完应能回答：为什么禁止 `npm test`、为什么禁止 `git add -A`、为什么 `models.generated.ts` 不准手改。后面在 `packages/coding-agent` 看到加载 AGENTS.md 的代码时，这份就是它会喂给模型的仓库根文件。

## 在仓库中的位置

```text
仓库根 AGENTS.md          ← 你在这里（clone 后 agent 默认能看见）
~/.pi/agent/AGENTS.md     用户全局规则
项目内嵌套 AGENTS.md      子目录还可以再放
CONTRIBUTING.md           对人类说同一套闸门
.pi/skills/release.md     发版时 AGENTS.md 叫你 load 的 skill
.pi/skills/interactive-testing.md
```

CONTRIBUTING.md 写：用 agent 就从 **pi 根目录**跑，好自动捡到这份文件。cwd 若在 `packages/coding-agent/`，根 AGENTS.md 仍可能被资源加载器按向上查找读到，但工具的相对路径、`./test.sh` 都会错。规定从根跑不是风格问题，是路径契约。

## 文件做什么

按章节，只讲「为什么是硬规则」。

### Conversational Style

短句、无 emoji、先回答再改代码。这是给**在本仓库工作的模型**的输出约束，不是给 CLI 用户的系统提示。产品用户的语气在 `packages/coding-agent` 的 prompt 里，别混。

「When the user asks a question, answer it first」直接针对 agent 的常见毛病：还没解释就开改。培训课读源码时如果让 agent 帮查，它应当先讲文件，再动工作区。

### Code Quality

几条会在源码里留下可见痕迹：

- **禁止 inline import**（`await import()`、`import("pkg").Type`）。`check-runtime-deps.mjs` 仍会扫描 `import()` / `require`，但 AGENTS.md 从规范上禁止新增。历史代码里 `packages/ai/src/env-api-keys.ts` 用字符串拼接 `import("node:"+"fs")` 绕浏览器打包——那是有注释的例外，不是样板。
- **只用 erasable TypeScript。** 根 `tsconfig.base.json` 开了 `erasableSyntaxOnly`。参数属性、`enum`、`namespace` 会让 `tsgo --noEmit` 红。Node 的 strip-only 模式要靠这个才能不经 tsc emit 跑 ts。
- **不准手改 `packages/ai/src/models.generated.ts`。** 改生成器 `generate-models.ts` 再生成。diff 里夹带上游模型元数据变化是允许的——否则每次刷新目录都要人工拆 commit。
- **禁止硬编码按键**（`matchesKey(..., "ctrl+x")`）。快捷键必须进 `DEFAULT_EDITOR_KEYBINDINGS` / `DEFAULT_APP_KEYBINDINGS`，否则用户改不了，TUI 课会再遇到。

### Commands（本课最容易踩的坑）

| 规则 | 原因 |
|---|---|
| 改代码后跑 `npm run check`，完整输出，不 tail | husky 同样跑它；局部绿、整仓红会在 commit 时爆 |
| 不主动跑 `npm run build` / `npm test` | `build` 会刷新模型数据（网络）；`test` 在有 API key 时会跑 e2e 真打厂家 |
| 非 e2e 一律 `./test.sh` | 隔离 HOME，见 [14-test.sh.md](/series/pi-source/root/018-test-sh/) |
| 单测从包目录用 vitest 的绝对路径 cli | 避免 `npx vitest` 解析到另一份 |
| `packages/coding-agent/test/suite/` 必须用 harness + faux provider | 付费 token 和真实网络不准进这套 suite |
| 修 GitHub issue 的回归测试旁边写 issue 号 | 源码里能搜到 `#1234` |
| 临时脚本写到 `/tmp`，不把多行脚本塞进 bash 工具参数 | 和产品自己的 bash 工具转义问题同源（见 issue 5893 repro） |
| 用户没说就不 commit | 多 session 并行时乱提交会踩别人的文件 |

### Dependency and Install Security

把 README 的供应链节收成操作清单：`npm install --ignore-scripts`、lockfile 用 `--package-lock-only`、shrinkwrap 新 lifecycle 必须进白名单、pre-commit 挡 lockfile 除非 `PI_ALLOW_LOCKFILE_CHANGE=1`。`undici` 升级被单独点名：必须读 changelog，因为它影响 HTTP 层。

### Git（并行 pi session 的生存规则）

「Multiple pi sessions may be running in this cwd」。这不是假想：维护者就用多个 pi 改不同文件。因此：

- 只 stage **本 session 改过的路径**，禁止 `git add -A` / `git add .`
- 禁止 `reset --hard` / `checkout .` / `clean -fd` / `stash` / `commit --no-verify`
- rebase 冲突若在你没改过的文件上：abort，问人
- 禁止 force push

违反的后果不是风格扣分，是把另一个 agent 未提交的工作清掉。`models.generated.ts` 被列为可随时和你的文件一起提交——因为生成器经常顺带更新它。

### Issues / PRs / Changelog / Release

贡献闸门指向 CONTRIBUTING.md。Changelog 在 `packages/*/CHANGELOG.md` 的 `## [Unreleased]`，**已发布的版本节不可改**。发版不写在 AGENTS.md 正文里，而是 `load .pi/skills/release.md`——规则文件把长流程外置成 skill，避免 AGENTS.md 膨胀。这和产品设计一致：核心最小，流程用 skill。

### User Override

用户指令和本文冲突时，先确认再执行。防止「用户随口说 commit」绕过上面的 Git 规则。

## 关键逻辑

这份文件存在，是因为 **Pi 自己就是会改这个仓库的 agent**。产品加载 AGENTS.md 的机制（coding-agent 的 resource loader）会把根文件塞进系统提示。仓库规范因此必须写在 agent 真会读的地方，而不是只写在 wiki。

失败模式：

- agent 在子目录启动 → 用错相对路径，改到别的包，或者跑了带密钥的 vitest
- agent `git add -A` → 把另一个 session 的半成品提交进去
- agent 手改 `models.generated.ts` 又丢掉生成器 → 下次 `generate:models` 把修复覆盖掉
- agent 跑 `npm test` 且环境有 `ANTHROPIC_API_KEY` → 账单和不稳定 e2e

## 和启动链的关系

`./pi-test.sh` → `experimental/cli.ts` → `main.ts` → session 装配 → resource loader 读 AGENTS.md。所以**用源码跑 pi 来改 pi** 时，这份文件会进入模型上下文。用已安装的 `pi` 在别的项目里跑，读的是那个项目的 AGENTS.md，不是这一份。

本课文件本身不执行。它改变的是模型行为，不是 Node 控制流。

## 下一课

人侧的闸门写在另一份：[04-CONTRIBUTING.md.md](/series/pi-source/root/008-CONTRIBUTING-md/)。
