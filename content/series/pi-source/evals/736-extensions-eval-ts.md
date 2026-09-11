---
title: "11 · extensions.eval.ts — 系统提示对扩展写作的 lift"
summary: "唯一一份比较实验。问题：默认系统提示后半的 Guidelines / Pi documentation 能不能让模型写出可加载、用新包名、调用成功的 hello 扩展？baseline 切掉 Guidelines 及之后；candida"
tags: [pi, evals]
---
源码：`packages/evals/src/extensions.eval.ts`  
被谁运行：默认 eval；`npm run eval -- src/extensions.eval.ts`。

## 本课目标

唯一一份比较实验。问题：默认系统提示后半的 Guidelines / Pi documentation 能不能让模型写出可加载、用新包名、调用成功的 hello 扩展？baseline 切掉 Guidelines 及之后；candidate 只切掉 cwd 段（避免把临时路径政策写进「文档」里？实际上是去掉 working-directory 段，保留指南）。

读完应能指出 judge 的失败列表、reload 为何必要、`judgeThreshold: null` 的效果。

## 两个 harness

`createExtensionAuthoringHarness(name, transform?)`：`output` 抽出

- 最终 response
- 系统提示是否还含 `\nGuidelines:\n` 和 `\nPi documentation (read only`
- extension loader 错误
- 已加载扩展的 path 与工具名
- 磁盘上 `.pi/extensions/hello.ts` 正文或 null

这是 README 说的「场景专用 JSON-safe output」，没塞进通用适配器。

`excludeGuidelinesAndDocumentation`：切到 Guidelines 之前。找不到该标题直接 throw——默认提示改结构时评测应当炸，而不是静默变成「两个 harness 一样」。

`prepareDefaultPromptOverride`：切掉最后的 `Current working directory:` 段。candidate 仍有指南和 Pi docs。临时 cwd 会变，留给 runtime 在 reload 后自己加？override 替换整份 prompt，cwd 段没了。这减少「提示里出现 /tmp/pi-eval-xxx」干扰写作，也测指南本身。

## 工作流

```ts
await run([
  { type: "prompt", content: "Create a Pi extension with a hello tool ..." },
  { type: "reload" },
  { type: "prompt", content: "Use the hello tool to greet Bob. Respond with exactly ..." },
]);
```

第一轮写文件。扩展是启动时加载的，必须 reload 才能进 `extensionRunner`。第二轮调 hello。`output.loadedExtensions` 在三步都结束后读，应含 `hello`。

若有源码，`recordEvalSourceArtifact(task, runId, { name: "hello.ts", ... })`。比较报表不读源码，人看 `.eval/sources/`。

硬断言（基础设施）：`systemPromptHasGuidelines/HasPiDocs` 必须与 harness 名一致。这不是 judge。配错 transform 会 fail 测试。

## `ExtensionAuthoringJudge`

纯确定性，不另调模型。失败项：

- 没有源码
- 没 import `@earendil-works/pi-coding-agent`
- 还在用 `@mariozechner/` 或 `@sinclair/typebox`（旧包名）
- loader errors
- 没注册 `hello` 工具
- 没有成功的 `hello({ name: "Bob" })` 返回 `Hello, Bob!`
- 最终 response 不是恰好那句

全过 score 1，否则 0 + rationale 拼接。`judgeThreshold: null`：0 分不 fail vitest。报表上 baseline 可能经常 0、candidate 可能 1，lift 是观察。

`evalHarnessTable(..., { baseline, candidate })` 默认 repetitions=1。要更可信应加大 repetitions（README 示例 6）。现在是方法学占位 + 回归信号。

`describe.for(table)("$name", ...)` 标题是 harness 名。没有 `$repetition` 因为默认 1。

## 失败与边界

- 模型在 baseline 下偶尔也能写出正确扩展（见过 Pi 的训练数据），lift 不是 100%。所以要重复和看报表，不要把一次 fail 当证明。
- 临时 cwd 的 `.pi/extensions/hello.ts` 在 rm 前读进 output，artifact 另存。
- 工具：没设 `noTools`/`tools`，默认四件套 + 写扩展需要的 write/edit。模型有完整工具箱。
- 不走 experimental server。扩展加载是本地 AgentSession.reload。

本包结束。下一包若关心 durable Session 的 SQLite 实现：[session-backends](/series/pi-source/session-backends/367-%E6%A8%A1%E5%9D%97%E5%AF%BC%E8%AF%BB/)。
