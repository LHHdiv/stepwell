---
title: "07 · biome.json — 格式化和 lint 的唯一开关"
summary: "看清 Biome 管哪些文件、故意关掉哪些规则、以及它改文件之后 git 怎么不丢 stage。类型错误不归它管（那是 tsgo）；测试对错不归它管（那是 ./test.sh）。"
tags: [pi, root]
---
源码：`biome.json`  
被谁调用：`npm run check` 的第一句 `biome check --write --error-on-warnings .`；husky pre-commit 因此也会跑。编辑器若装了 Biome 插件，保存时也会读这份配置。

## 本课目标

看清 Biome **管哪些文件、故意关掉哪些规则、以及它改文件之后 git 怎么不丢 stage**。类型错误不归它管（那是 `tsgo`）；测试对错不归它管（那是 `./test.sh`）。

## 在仓库中的位置

```text
npm run check
  biome check --write --error-on-warnings .     ← 读本文件
  check:pinned-deps / runtime-deps / ...
  tsgo --noEmit
```

`$schema` 钉在 `https://biomejs.dev/schemas/2.3.5/schema.json`，和根 `devDependencies` 里 `@biomejs/biome` `2.3.5` 锁在一起。升级 biome 必须同时改 JSON schema 版本，否则编辑器提示和 CLI 行为会分叉。

## 文件做什么

### linter

`recommended: true` 打底，然后开了几处产品选择：

| 规则 | 本仓设置 | 为什么 |
|---|---|---|
| `style.noNonNullAssertion` | off | 源码大量 `value!`（例如 session 解析）。开了会逼出无意义的分支 |
| `style.useConst` | error | 能 const 就必须 const，和「最小可变状态」一致 |
| `style.useNodejsImportProtocol` | off | 允许 `import fs from "fs"`。推荐的是 `node:fs`，但历史代码和某些生成物混用，没一刀切 |
| `suspicious.noExplicitAny` | off | AGENTS.md 说「尽量不用 any」，但 lint 层关掉——留下给类型检查和人审。否则 biome 会把大量边界解析打红 |
| `suspicious.noControlCharactersInRegex` | off | TUI / ANSI / OSC 序列正则必须写控制字符 |
| `suspicious.noEmptyInterface` | off | 有的公开类型先占位再扩展 |

注意：关掉 `noExplicitAny` **不是**允许新写 `any`。AGENTS.md 仍禁止。lint 和规范可以不一致：lint 管噪声，规范管审查。

### formatter

- `indentStyle: tab`，`indentWidth: 3`（tab 显示宽度，不是空格数）
- `lineWidth: 120`
- `formatWithErrors: false`：语法都 parse 不了时不要强行格式化，避免把坏文件改得更不可读

`--write` 会把格式落盘。所以 pre-commit 在 check 成功后，对**原本 staged 的路径**再 `git add` 一次，把 biome 刚改的空白写进即将提交的 index。未 staged 的文件若被 biome 改了，不会被那次循环 add——这是故意的，避免把别人正在写的文件塞进你的 commit（和 AGENTS.md 的并行 session 规则一致）。

### files.includes

白名单几乎只覆盖：

```text
packages/*/src/**/*.ts
packages/*/test/**/*.ts
packages/session-backends/*/src|test/**/*.ts
packages/coding-agent/examples/**/*.ts
```

然后排除：

- `node_modules`
- `test-sessions.ts`（大 fixture）
- `models.generated.ts`、`*.models.ts`（生成物，格式化会制造无意义 diff）
- `packages/mom/data/**`（即使 mom 包现在不在地图里，排除仍留着）

`!!**/node_modules` 是 Biome 2 的「再包含」语法，写在一串 `!` 后面，用来抵消过于宽的忽略。不要把它理解成「lint node_modules」——真正被 include 的仍是上面那些 `packages/*/src` glob。

**不在范围内的：** 根 `scripts/*.mjs`、`*.sh`、JSON、Markdown。所以 `scripts/release.mjs` 风格不统一不会被 biome 打。`check-ts-relative-imports.mjs` 自己用 TypeScript parser 扫 `.ts`，也不靠 biome。

## 关键逻辑

全仓只有这一份 biome 配置，没有 per-package `biome.json`。好处是 tab/120 列在 agent、ai、tui 之间一致；坏处是不能给生成物包单独放宽——所以用 glob 排除生成文件。

失败会怎样：

- 本地没跑 check 就 push（绕过 husky）→ CI 的 `biome check --write` 仍会失败。CI 上 `--write` 改了工作树但没人 commit，只表现为非零退出。
- 有人把 `lineWidth` 改成 80 → 几乎每个源文件都动，diff 无法审。这是仓库级格式，改它等于全量重写。
- 把 `models.generated.ts` 加进 includes → 每次 `generate:models` 的 diff 夹杂格式变动，review 地狱。

`--error-on-warnings` 在 `package.json` 不在本文件。规则即使是 warning，check 也当 error。新增一条 recommended 规则（升级 biome 时）可能让原本绿的仓库变红，升级必须当独立 PR。

## 和启动链的关系

不进运行时。开发时若编辑器 format-on-save 用的是 Prettier 而不是 Biome，你会和 hook 打架：保存成空格，commit 时又变 tab。以本文件为准。

## 下一课

类型系统的底座：[08-tsconfig.base.json.md](/series/pi-source/root/012-tsconfig-base-json/)。
