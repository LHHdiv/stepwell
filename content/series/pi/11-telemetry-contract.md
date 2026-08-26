---
title: 第11讲·遥测契约：spans/events 而非日志
summary: 拆解 pi-telemetry 的 span/event 契约模型、InMemory/NOOP 实现与 AI_TELEMETRY_SCHEMA 的运行时落地。
objectives:
  - 说明 TelemetryContext.startSpan 的 span/event 契约与日志的本质区别
  - 区分 InMemoryTelemetryContext 与 NOOP_TELEMETRY_SCHEMA 两种现成实现的用途
  - 解释 defineTelemetrySchema 中 sensitive 仅作元数据、运行时不自动脱敏
keyPoints:
  - TelemetryContext.startSpan 以回调式 span 承载属性/事件/状态，index.ts:14-22
  - 敏感标记 sensitive? 只是元数据，运行时不自动脱敏，index.ts:30
  - defineTelemetrySchema 是类型安全的 schema 身份函数；createTypedSpanStarter 仅做类型推断，index.ts:72/349
  - InMemoryTelemetryContext 在内存中记录 span，供测试/调试；NOOP_TELEMETRY_CONTEXT 什么都不做，memory.ts:192、noop.ts:20
  - AI_TELEMETRY_SCHEMA 定义 pi.ai 的 span 词汇，startAiSpan/startHarnessSpan 在 agent 运行时驱动 startSpan，harness/telemetry.ts:42/138/602
  - ai 仅以 import type 依赖 telemetry，遥测与日志彻底解耦，types.ts:1
tags: [pi, pi-telemetry, 可观测性, 契约]
---

写代码容易，知道"它跑起来时发生了什么"难。很多人第一反应是 `console.log` 到处打——但日志是给人看的流水账，没法回答"这次请求花了多久、卡在哪一步、花了多少钱"。pi 选择了另一条路：**把可观测性定义成一份"契约"——span（跨度）和 event（事件），而不是一堆日志行。**

本讲我们看 `pi-telemetry` 这套契约怎么设计，以及它为何刻意和日志解耦。

## 一、结论：遥测是契约（spans/events），不是日志

`pi-telemetry` 的核心接口是 `TelemetryContext`（`index.ts:14`）：

```ts
export interface TelemetryContext {
  startSpan<T>(options: SpanOptions, callback: (span: TelemetrySpan) => T | Promise<T>): Promise<T>;
}   // :14-22

export interface TelemetrySpan extends TelemetryContext {
  addEvent(name: string, attributes?: SpanAttributes): void;   // 在 span 内记一个事件
  setAttributes(attributes: SpanAttributes): void;             // 补属性
  setStatus(status: SpanStatus): void;                         // 标 ok / error
}   // :18-22
```

逐行：

- `startSpan`（`:15`）是**回调式**的：你传入 `options`（span 名 + 起始属性）和一个 `callback`，span 在回调执行期间"打开"，回调返回即"关闭"。这种结构天然保证 span 有清晰的起止边界，不像日志那样靠人工配对"开始/结束"两行。
- `TelemetrySpan` 继承自 `TelemetryContext`——意味着**span 内部还能再 `startSpan` 开子 span**，形成一棵"调用树"。这就是 OpenTelemetry 式的层级追踪，而日志是扁平的、难还原层级。
- `addEvent`（`:19`）在 span 生命期内记离散事件（如"开始调用工具 X"）；`setAttributes`（`:20`）补属性；`setStatus`（`:21`）标成功/失败。三者让一个 span 同时携带"结构（层级）+ 数据（属性）+ 时间点（事件）"。

**为什么这比日志强？** 日志是"我说了什么"，遥测是"系统做了什么的结构化记录"。一个 `pi.ai.request` span 自动带上 model、token 数、耗时、子 span，事后可以聚合、可以画火焰图、可以按 attribute 过滤——这些是 `console.log` 永远给不了的。

## 二、两种现成实现：InMemory 与 NOOP

契约再好，也得有实现。`pi-telemetry` 自带两个开箱即用的 `TelemetryContext`。

最轻量的是 `NOOP_TELEMETRY_CONTEXT`（`noop.ts:20`）——它什么都不记录：

```ts
const noopTelemetrySpan: TelemetrySpan = {
  startSpan: startNoopSpan,
  addEvent: () => {},
  setAttributes: () => {},
  setStatus: () => {},
};
Object.freeze(noopTelemetrySpan);

/** Shared telemetry context used when an application does not provide one. */
export const NOOP_TELEMETRY_CONTEXT: TelemetryContext = noopTelemetrySpan;   // :20
```

逐行：

- `addEvent` / `setAttributes` / `setStatus` 全是空函数（`:13-15`），`startSpan` 直接同步执行回调并返回（`startNoopSpan`，`:3`）。
- 整个对象被 `Object.freeze`——不可改，保证"无操作"语义稳定。
- 它是**默认兜底**：当应用（CLI、扩展）不提供自己的遥测后端时，`pi-ai` 就用它，确保"没有可观测性"也绝不会让程序报错或崩溃。

另一个是 `InMemoryTelemetryContext`（`memory.ts:192`），它把 span **记录在进程内存里**：

```ts
export class InMemoryTelemetryContext implements TelemetryContext {
  private readonly state: InMemoryTelemetryState = {
    spans: [],
    nextSpanId: 1,
    nextEndSequence: 1,
  };

  startSpan<T>(options: SpanOptions, callback: (span: TelemetrySpan) => T | Promise<T>): Promise<T> {
    return startInMemorySpan(this.state, undefined, options, callback);
  }

  /** Returns detached snapshots in span-start order. */
  getSpans(): readonly RecordedTelemetrySpan[] { /* … */ }
}   // :192
```

逐行：

- 第 3 行 `state.spans` 是内存里的 span 数组；`startSpan`（`:199`）把每次调用委托给 `startInMemorySpan`，后者负责开关 span、收集属性与事件。
- `getSpans()`（`:204`）让调用方**事后检视**所有记录的 span——这正是测试与调试的利器：单测里注入 `InMemoryTelemetryContext`，跑完断言"是否产生了预期的 `pi.ai.request` span、耗时属性是否合理"。

两个实现的对比点出了契约的价值：**上层（`pi-ai`）只认 `TelemetryContext` 接口，至于背后是"不记录"还是"记内存"还是"发到真实 APM"，随时可换，代码零改动。**

## 三、Schema 即契约：defineTelemetrySchema 与敏感标记

光有 span 还不够——如果每个人随便起 span 名、随便塞属性，数据就会乱。pi 用一份 **schema** 把"允许哪些 span、每个 span 有哪些属性、属性什么类型"钉死。定义入口是 `defineTelemetrySchema`（`index.ts:72`）：

```ts
/** Typed identity helper for serializable telemetry schema data. */
export function defineTelemetrySchema<const T extends TelemetrySchemaDefinition>(schema: T): T {
  return schema;
}   // :72
```

逐行：它看起来只是"原样返回参数"的 identity 函数，但配合 `const T` 泛型约束，它把传入的对象**推断出精确的字面量类型**。于是 `AI_TELEMETRY_SCHEMA`（下一节）一旦被它包过，TypeScript 就能在编译期校验"你 `startSpan` 用的 span 名、属性名、属性类型"是否合法——**类型即文档，类型即约束**。

属性元数据里有一个容易误读的细节（`index.ts:30`）：

```ts
export interface TelemetryAttributeMetadata {
  description: string;
  sensitive?: boolean;       // :30 标记该属性是否敏感
  cardinality?: "low" | "high";
}
```

逐行：

- `sensitive?: boolean`（`:30`）**只是元数据**——它向阅读 schema 的人（和未来的工具）声明"这个属性可能含密钥/PII，处理时小心"，但 `pi-telemetry` **运行时不自动脱敏**。注释与代码一致：库不替你擦除值，只是把"敏感"这件事记在 schema 上。
- 这点很重要：别误以为标了 `sensitive: true` 就自动打码了。真正的脱敏要由**消费端**（如导出到 APM 时按 schema 过滤）负责。pi 把"声明"和"执行"分开，避免库偷偷做它可能做不对的事。

绑定 schema 到具体 context 的是 `createTypedSpanStarter`（`index.ts:349`）：

```ts
export function createTypedSpanStarter<const Schemas extends TelemetrySchemaTuple>(
  telemetryContext: TelemetryContext,
  _schemas: Schemas & UniqueTelemetrySchemas<Schemas>,
): TypedSpanStarter<Schemas> {
  return bindTypedSpanStarter<Schemas>(telemetryContext);
}   // :349
```

逐行：它接收一个 `TelemetryContext` 和一份（或多份）schema，返回一个"**类型增强版**"的 span starter。注意它**只做类型推断**——注释（`index.ts:347`）明说 "Schema values are used only for type inference; no runtime schema validation is performed"。也就是说，schema 是给编译器和 IDE 看的契约，运行时不强制校验（避免性能与复杂度）。这再次体现 pi 的克制：约束尽量前移到编译期。

## 四、运行时落地：AI_TELEMETRY_SCHEMA + startAiSpan

契约定义好了，真正在 `pi` 运行时点火的地方是 `packages/agent/src/harness/telemetry.ts`。这里定义了 `pi.ai` 的 span 词汇表（`harness/telemetry.ts:42`）：

```ts
export const AI_TELEMETRY_SCHEMA = {
  version: 1,
  spans: {
    "pi.ai.request": {
      description: "One logical request to an AI provider",
      parents: { kind: "any" },
      startAttributes: {
        "pi.ai.operation": { type: "string", required: true, description: "…" },
        /* … 其他属性 … */
      },
      endAttributes: { /* … */ },
      events: { /* … */ },
      status: { default: "ok", errorWhen: "…" },
    },
    /* … 更多 span，如 pi.ai.stream … */
  },
};   // :42
```

逐行：

- `AI_TELEMETRY_SCHEMA`（`:42`）用 `defineTelemetrySchema` 的风格声明了 `pi.ai.request` 等 span：它的描述、允许的父 span（`parents`）、起始/结束属性、内嵌事件、以及默认状态。这就是"pi.ai 模块对外承诺的可观测性契约"。
- 注意它定义在 **agent 包**而非 telemetry 包——`pi-telemetry` 只提供通用机制，具体"有哪些 span"由各业务包（ai、harness）自己定义。这是关注点分离：机制通用、词汇专有。

真正发起一个 span 的便捷函数是 `startAiSpan`（`harness/telemetry.ts:138`）：

```ts
export function startAiSpan<Name extends AiSpanName, const Attributes extends AiSpanStartAttributes<Name>, Result>(
  telemetryContext: TelemetryContext,
  name: Name,
  attributes: ExactTelemetryAttributes<AiSpanStartAttributes<Name>, Attributes>,
  callback: (span: AiTelemetrySpan<Name>) => Result | Promise<Result>,
): Promise<Result> {
  return telemetryContext.startSpan({ name, attributes }, (span) => callback(span as AiTelemetrySpan<Name>));
}   // :138
```

逐行：

- `startAiSpan`（`:138`）把强类型的 `name` / `attributes` 透传给底层的 `telemetryContext.startSpan`（`:144`）——也就是第 09 讲契约的总开关。它只是个"带 AI schema 类型约束的薄封装"。
- 同理，`startHarnessSpan`（`harness/telemetry.ts:602`）服务于 harness 层自己的 span 词汇（`HARNESS_TELEMETRY_SCHEMA`）。二者都最终落到同一个 `TelemetryContext.startSpan`，只是类型词汇不同。

于是调用链很清晰：`pi-ai` 内部某次请求 → `startAiSpan("pi.ai.request", {...})` → `telemetryContext.startSpan(...)` → 由注入的 context（NOOP / InMemory / 真实后端）决定"记不记、怎么记"。**业务代码完全不感知后端是谁。**

## 五、为什么可观测性与日志解耦

把前面的线索收尾：第 05 讲我们看过 `types.ts:1` 是 `import type { TelemetryContext } from "@earendil-works/pi-telemetry"`——注意 `import type`。

这意味着 **`pi-ai` 在运行时根本不依赖 `pi-telemetry` 的实现**，只借用它的类型来给 `Model.stream` 等签名做类型标注。由此推出一个关键设计：

- 遥测是**可选契约**。`pi-ai` 调用 `telemetryContext.startSpan`，但 `telemetryContext` 由外部注入；没人注入时，默认是 `NOOP_TELEMETRY_CONTEXT`，程序照常跑。
- 遥测**不绑定任何日志后端**。它不 `console.log`、不写文件、不发网络——那些是"消费端"的事。pi 把"产生结构化遥测数据"和"把数据落到哪"彻底分开。
- 你能在测试里换成 `InMemoryTelemetryContext` 做断言，在浏览器里用 `NOOP` 省开销，在生产里换成对接 OpenTelemetry 的实现——而 `pi-ai` 一行都不用改。

这正是"契约而非日志"的终极好处：**可观测性从"顺手打印"升级为"可组合、可替换、可类型校验的一等公民"**。

> **知识拓展：卷三预告**
> `startHarnessSpan`（`:602`）属于 harness 层，它和 `startAiSpan` 一起，将在卷三（Agent 运行时）里被大量调用——每次工具派发、每次会话生命周期、每次网络往返，都会开一个 span。到那时你会看到，本讲定义的"契约"如何把整个 agent 的运行轨迹，织成一张可观测的网。

## 试一试

打开 `packages/telemetry/src/index.ts`，定位 `TelemetryContext`（`:14`）和 `TelemetryAttributeMetadata.sensitive`（`:30`）。回答：

1. `TelemetrySpan` 继承自 `TelemetryContext`（`index.ts:18`）。这意味着 `span.startSpan(...)` 能再开子 span。为什么"span 可嵌套"对还原调用层级比扁平日志更有价值？
2. `sensitive?: boolean`（`index.ts:30`）注释说它"只是元数据"。如果某个属性标了 `sensitive: true`，运行时的 `InMemoryTelemetryContext` 会自动把值替换成 `***` 吗？真正负责脱敏的应该是哪一层？（结合第 09 讲的"声明/执行分离"想一想。）
3. 翻到 `packages/agent/src/harness/telemetry.ts:138` 的 `startAiSpan`，它最终调用 `telemetryContext.startSpan`（`:144`）。如果注入的是 `NOOP_TELEMETRY_CONTEXT`（noop.ts:20），这次 `startAiSpan` 会产生任何记录吗？这印证了本讲哪句话？

## 下一讲预告

基础库三剑客——`pi-ai`（消息与模型）、`pi-protocol`（线格式与合同）、`pi-telemetry`（可观测性契约）——已经讲完。它们像地基，安静地承托着上层。下一讲起，我们进入**卷三·Agent 运行时**：看 `AgentSession` 如何把用户输入翻译成 `prompt()`、runLoop 如何在 `pi-ai` 之上真正驱动"思考—工具—再思考"的循环，以及 `startHarnessSpan` 如何把这一切织成可观测的轨迹。
