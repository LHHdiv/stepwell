---
title: "29 · agent-treeshake-smoke-entry.ts — 只装一家模型时图必须瘦"
summary: "对照 28 课的「宽入口」：本文件只做"
tags: [pi, root]
---
源码：`scripts/agent-treeshake-smoke-entry.ts`  
被谁调用：`check-browser-smoke.mjs` 的第二次 esbuild，`metafile: true`。产品不引用。

## 本课目标

对照 28 课的「宽入口」：本文件只做

```ts
createModels();
models.setProvider(anthropicProvider());
models.getModel("anthropic", "claude-sonnet-4-5");
new Agent({ streamFn: models.streamSimple.bind(models) });
```

检查脚本随后断言 metafile 里：**不能**出现 `compat.ts`、`models.generated.ts`、`providers/all.ts`；catalog JSON 只能有 `anthropic.json`；厂家 SDK 只能有 `@anthropic-ai/sdk`。这是「按需 setProvider」的打包合同。

## 在仓库中的位置

```text
esbuild(agent-treeshake-smoke-entry.ts, platform: browser, metafile)
  禁止输入: packages/ai/src/compat.ts
            packages/ai/src/models.generated.ts
            packages/ai/src/providers/all.ts
  catalog 只允许 anthropic.json
  SDK 只允许 @anthropic-ai/sdk
```

模型 id `claude-sonnet-4-5` 必须在 anthropic 目录里存在，否则 `getModel` 返回 undefined，本文件 `throw`。那会让 esbuild 仍可能成功（throw 在运行时），但 check 脚本并不运行产物——所以这个 throw 只有在有人用 node 直接跑本文件时才有用。打包期靠的是静态 import `anthropicProvider`。

## 文件做什么

`from "@earendil-works/pi-ai/providers/anthropic"` 是窄路径，对应 vitest.base 和 tsconfig 的 providers 映射。若有人把 `anthropic.ts` 改成 `export * from "./all"`，treeshake 合同当场破裂。

`streamFn: models.streamSimple.bind(models)` 把 Models 实例的流函数接到 Agent，模拟浏览器里「不经过 coding-agent SDK」的用法。

## 关键逻辑

宽入口 `pi-ai` 的 index 会带上全部厂家，那是 CLI 要的。库用户在 Web 里只想带 Anthropic 时，必须走 `createModels` + `setProvider`。本夹具防止回归到「index 桶污染窄路径」。

失败会怎样：

- 在 anthropic provider 里 import 了 `../all` 或 `models.generated` → check 红，报 unexpected includes
- 新增 openai SDK 被 anthropic 文件误 import → `includedAiSdkPackages` 长度不为 1
- 模型改名导致 getModel 失败：打包仍绿（不执行）。模型目录测试在 packages/ai 自己的 generate/check 里

## 和启动链的关系

无。CLI bundle（`build-coding-agent-bundle.mjs`）走的是宽入口，会带上多家 SDK。本课保护的是库的按需图，不是 `pi` 命令的体积。

## 下一课

把 28/29 跑起来的检查器：[30-check-browser-smoke.mjs.md](/series/pi-source/root/034-check-browser-smoke-mjs/)。
