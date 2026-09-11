---
title: "06 · testing/index.ts — testing 子路径的对外门面"
summary: "知道为什么一致性套件不从根 index.ts 再 export 一遍：根包要保持 runtime-neutral，testing 才能放心 import node:assert。"
tags: [pi, telemetry]
---
源码：`packages/telemetry/src/testing/index.ts`（6 行）  
核心导出：`createTelemetryAdapterConformance` 以及三个类型  
谁加载它：`package.json` 的 `exports["./testing"]` → 编译后 `dist/testing/index.js`。源码映射在仓库根 `tsconfig.json` 的 `@earendil-works/pi-telemetry/testing`。

## 本课目标

知道为什么一致性套件不从根 `index.ts` 再 export 一遍：根包要保持 runtime-neutral，testing 才能放心 import `node:assert`。

## 在系统中的位置

```text
import { createTelemetryAdapterConformance } from "@earendil-works/pi-telemetry/testing";
```

根入口 `src/index.ts` **没有** re-export 这些符号。`InMemoryTelemetryContext` 在根上，因为它不依赖 Node assert，测试和产品都能用。

## 逐行

```ts
export { createTelemetryAdapterConformance } from "./conformance.ts";
export type {
  TelemetryAdapterConformanceCase,
  TelemetryAdapterFixture,
  TelemetryAdapterFixtureFactory,
} from "./types.ts";
```

值导出一个函数，类型导出夹具约定。没有 `RecordedTelemetrySpan`——那是根包 `memory.ts` 的形状，adapter 作者从 `@earendil-works/pi-telemetry` 拿。

## 失败与边界

- 在非 Node 环境 import 本路径会因 `node:assert/strict` 失败。产品代码只依赖根包。
- 不要把 `/testing` 加进 coding-agent 的运行时依赖图。现行 CLI 主链本来就不碰 telemetry。

## 下一课

本包结束。观测契约记住三句话：显式 context、callback 拥有 settle、记录失败不影响业务。

主链 print / 交互下一步仍是 `packages/ai` 的 `streamSimple`。若改走实验远程会话，从 [protocol 模块导读](/series/pi-source/protocol/358-%E6%A8%A1%E5%9D%97%E5%AF%BC%E8%AF%BB/) 开始：framing → codec → `Client.connect` → Server listener。
