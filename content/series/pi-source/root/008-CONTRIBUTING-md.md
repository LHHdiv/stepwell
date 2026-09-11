---
title: "04 · CONTRIBUTING.md — 外部贡献闸门"
summary: "读懂为什么这个仓库看起来「不欢迎贡献」——以及闸门具体卡在哪一步。培训课改内部代码不走这条闸门，但读 issue、看被关的 PR、判断一个改动该进核心还是该做成扩展时，用的就是这份哲学。"
tags: [pi, root]
---
源码：`CONTRIBUTING.md`  
被谁调用：GitHub 上的人类和新来的 agent；`.github/workflows/issue-gate.yml` / `pr-gate.yml` 按这里的政策自动关 issue/PR。**构建和运行时都不读它。**

## 本课目标

读懂为什么这个仓库看起来「不欢迎贡献」——以及闸门具体卡在哪一步。培训课改内部代码不走这条闸门，但读 issue、看被关的 PR、判断一个改动该进核心还是该做成扩展时，用的就是这份哲学。

## 在仓库中的位置

```text
README.md          首页一句「新贡献者 auto-close」
CONTRIBUTING.md    ← 完整规则
AGENTS.md          「Issues and PRs」一节指过来
.github/workflows/issue-gate.yml / pr-gate.yml / approve-contributor.yml
.github/APPROVED_CONTRIBUTORS
.github/ISSUE_TEMPLATE/*.yml
```

Discord 链接在文档里出现了两个（正文和 Questions），以文件为准；过期了去 pi.dev / README 的徽章。

## 文件做什么

### Philosophy：核心必须小

「If your feature does not belong in the core, it should be an extension.」这不是口号。`packages/coding-agent` 的扩展机制、hook 点、skill，都是为了让功能待在核心外面。PR 若往 `agent-loop.ts` 塞专用分支，按这份文件就会被拒。连 hook 点本身都要讨论——扩展 API 也是核心表面积。

### The One Rule

**You must understand your code.** 允许用 AI 写，不允许交看不懂的 slop。用 agent 必须从仓库根跑，好加载 AGENTS.md。培训课的精读方式（左源码右讲解、能讲出失败会怎样）就是这条规则的练习。

### Contribution Gate

新贡献者的 issue 和 PR **默认关闭**。维护者每天 reopen 值得看的。放行口令必须出现在维护者回复的**命令位置**（开头，或 @mention 之后；或末尾）：

| 口令 | 效果 |
|---|---|
| `lgtmi` | 以后的 **issue** 不再自动关 |
| `lgtm` | 以后的 **issue 和 PR** 都不再自动关 |

`lgtmi` 不能开 PR。没拿到 `lgtm` 就开 PR，会被关。周末（周五到周日）的 issue 不保证看；急的去 Discord。

实现上依赖 `.github/APPROVED_CONTRIBUTORS` 和 gate workflow，本文是政策，workflow 是执行。口令格式写死是为了让机器人能 parse，所以「Thanks, lgtm!」这种随口一句如果位置不对，可能不会放行。

### Quality Bar / Blocking

issue 必须用 GitHub 模板，一屏能读完，用人话，说清楚 bug 和为什么重要。忽略本文两次或用 agent 刷 tracker → 永久 block GitHub 账号。FAQ 把「为什么 auto-close / 为什么周末低优先 / 为什么有的 issue 不回 / 为什么不用 AI 做最终分诊」写成维护者可转发的标准答案，减少重复辩论。

### Before Submitting a PR

```bash
npm run check
./test.sh
```

两条都必须绿。不准改 `CHANGELOG.md`（维护者在发版时处理）。给 `packages/ai` 加 provider 要看 AGENTS.md 的测试要求。

## 关键逻辑

闸门存在是因为 **issue 量超过维护者实时处理能力**，且大量是 agent 代发、不可复现、或该做成扩展的功能请求。auto-close 把 tracker 变成「维护者的收件箱」而不是「任何人的白板」。

失败 / 误用：

- 新人按普通开源项目直接开 PR → 被关，误以为项目死了
- 口令不在命令位置 → 工作流不放行，人已经口头同意但机器人仍关
- 把核心膨胀 PR 硬开 → 即使代码绿也会因 philosophy 被拒，check 绿不是合并条件的全部
- 贡献者改了 CHANGELOG → 发版脚本 `release.mjs` 按 `## [Unreleased]` 做字符串替换，重复标题或错误格式会让发版 commit 变成垃圾

## 和启动链的关系

无。它约束的是 GitHub 上的人与 bot，不约束 `main.ts`。

和开发入口的间接关系：PR 必跑的 `npm run check` 和 `./test.sh` 就是根目录后面几课要精读的那两条命令。你在本仓库改代码，提交前走的是同一对命令，只是没有 auto-close。

## 下一课

信任边界写在：[05-SECURITY.md.md](/series/pi-source/root/009-SECURITY-md/)。
