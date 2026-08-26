---
title: 第43讲·测试策略与防御性模式
summary: 一个自扩展 harness 怎么保证"改了不坏"？本讲看 pi 的测试分层与 AGENTS.md 里的防御性开发纪律。
objectives:
  - 说出 pi 的测试分层：单元/类型/轨迹评测各管什么
  - 列出 AGENTS.md 里的关键防御性纪律（勿手改生成代码、显式暂存、锁步版本）
  - 把测试策略与第 33 讲 vitest-evals、第 36 讲写入安全连成"质量三角"
tags: [pi, 测试, 防御性, AGENTS]
keyPoints:
  - "测试分层：单元测试保'零件'，vitest-evals 轨迹评测（第 33 讲）保'智能体整体行为不回归'"
  - "AGENTS.md:27 严禁手改 models.generated.ts，须改生成脚本 regenerate——生成代码不在 review 范围"
  - "AGENTS.md:58 只暂存显式路径，永不 git add -A / git add .，避免误提交敏感或无关文件"
  - "AGENTS.md:128 锁步版本：所有包共用一个版本号，发版整体推进"
  - "AGENTS.md:20 外部 API 类型以 node_modules 为准、不猜——防御'凭记忆写错接口'"
---

写代码容易，保证"越改越稳"难——尤其 pi 这种"装不同扩展就变不同产品"的系统。这一讲看它的**测试分层**与藏在 `AGENTS.md` 里的**防御性开发纪律**，它们共同构成"改了不坏"的安全网。

## 一、先结论：质量靠三层网

pi 的"质量三角"：

1. **单元测试**：保住每个零件（工具、解析器、reducer）的正确性；
2. **类型检查**：保住接口契约不被悄悄破坏（`tsc` 全量类型校验）；
3. **轨迹评测**（第 33 讲 `vitest-evals`）：保住"智能体整体行为不回归"——改了一行，跑一批题，分数不掉才算过。

三层各管一摊：单元管"局部对"，类型管"接得对"，评测管"整体还好"。第 36 讲的写入安全（数据不坏）是第 33 讲评测能可靠跑的前提——没有它，评测自己都会因为写串而失真。

## 二、防御性纪律一：生成代码不手改

`AGENTS.md:27` 是条铁律：

> Never modify `packages/ai/src/models.generated.ts` directly; update `packages/ai/scripts/generate-models.ts` instead, then regenerate.

`models.generated.ts` 是模型元数据的**自动生成文件**（第 8 讲讲过）。手改它，下次生成就会被覆盖、且 diff 难 review。正确做法是改生成脚本、重新生成。这避免了"两个人一个手改一个生成，冲突且不察"的经典坑。

> **知识拓展**：所有 "generated" 文件都该走这条纪律——protobuf 的 `.pb.go`、CSS 的构建产物、OpenAPI 的 client。把它们当"编译输出"而非"源码"对待，是大型项目的共识。

## 三、防御性纪律二：只暂存显式路径

`AGENTS.md:58`：

> Stage explicit paths (`git add <path1> <path2>`); never `git add -A` / `git add .`.

为什么重要？`git add -A` 会把**所有改动**（包括你忘了的 `.env`、本地日志、密钥文件）一股脑暂存。pi 这类项目常含敏感配置，一条 `git add -A` 就可能把密钥推上公开仓库。显式路径暂存是"最小暴露面"原则在版本控制上的体现——和第 25 讲"密钥隔离"是同一安全心智。

## 四、防御性纪律三：锁步版本与类型诚实

`AGENTS.md:128`：

> Lockstep versioning: all packages share one version; every release updates all together.

这是个反直觉但省心的选择：11 个包（第 01 讲）共用一个版本号，发版整体推进。好处是**没有"包 A 用 v1、包 B 用 v3 不兼容"的组合爆炸**——消费者永远拿到一套相互对齐的版本。代价是"改一个小 bug 也要发所有包"，但对 monorepo 来说，这点代价换来了巨大的依赖确定性。

另一条（`AGENTS.md:20`）：外部 API 类型以 `node_modules` 为准、不猜。这防御的是"凭记忆写错第三方接口"——TypeScript 的 `node_modules` 才是真相源，而不是你的印象。

## 五、和全系列的咬合

| 讲次 | 贡献的质量维度 |
|---|---|
| 第 33 讲 vitest-evals | 整体行为回归检测 |
| 第 36 讲写入安全 | 数据不坏（评测可信的前提） |
| 第 37 讲遥测 | 线上可观测、问题可定位 |
| **本讲 AGENTS.md** | 开发期纪律，从源头减少引入 bug |

测试是"事后发现"，纪律是"事前避免"——两者夹击，才撑得起"自扩展"系统的脆弱面。

## 六、试一试

1. 在 `AGENTS.md:27` 提到的 `packages/ai/scripts/generate-models.ts`，看它读什么源（某个 API 目录？），推断"改生成脚本"具体改什么。
2. 把 `AGENTS.md:58` 的纪律套到你自己的项目：你的 `.gitignore` 是否漏了 `.env`？一次 `git add -A` 会暴露什么？
3. 思考：锁步版本（:128）对"只想单独修一个包"的消费者是负担吗？什么场景下你会希望改成独立版本？（提示：库被外部广泛依赖时。）

## 下一讲预告

纪律保证"不改坏"，但写代码时还是要反复跑、反复看。下一讲看 pi 的"开发工作区调试回路"：怎么从源码跑起来、怎么用遥测和评测当调试工具。
