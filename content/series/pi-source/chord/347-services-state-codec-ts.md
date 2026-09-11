---
title: "14 · services/state-codec.ts — 订阅级 path 字典"
summary: "记住：一对 codec 只服务一条订阅。 每个 (instance, member) 再独占一对 Delta encoder/decoder。snapshot / replaced / unavailable 会 reset 整个登记表"
tags: [pi, chord]
---
源码：`packages/chord/src/services/state-codec.ts`  
被谁调用：Pi 的 server/client 适配器在把 snapshot/update 放进信封前 encode，取出后 decode。Chord 根导出 `createServiceStateEncoder` / `Decoder`。

## 本课目标

记住：**一对 codec 只服务一条订阅。** 每个 (instance, member) 再独占一对 Delta encoder/decoder。snapshot / replaced / unavailable 会 `reset` 整个登记表。搞混就会 PathError。

## 在系统中的位置

```text
provider.subscribe 给出 decoded snapshot（ops 是完整路径 Op[]）
  encoder.encodeSnapshot → WireOp[]     压缩路径
传输
  decoder.decodeSnapshot → Op[]         还原
  replica.hydrate / facade.install
后续 update.type === "state"
  encoder.encodeUpdate 用已登记的那对 encoder
  decoder.get 同一 (instance, member)
```

本地 loopback **不**走 codec。同进程直接传 decoded ops。

## `StateCodecRegistry<C>`

`add(instance, member)`：键是 `JSON.stringify([key|null, generation|null, member])`。重复 add 抛 Duplicate。`get` 找不到抛 Unknown。`removeInstance` 扫表删掉该 address 的所有 member。`reset` 清空。

singleton 的 instance 是 `undefined`，键为 `[null,null,member]`。

## Encoder 行为

`encodeSnapshot`：reset，然后对每个 state 成员 `codecs.add(...).encode(ops)`。方法成员原样。

`encodeUpdate`：

- `state`：`get` 已有 encoder，`encode(ops)`
- `replaced`：reset，再 encode 新 snapshot（新字典）
- `spawned`：add 新实例的 members（不 reset 其它实例）
- `unavailable`：reset（singleton 冷了，字典作废）
- `closed`：`removeInstance`

## Decoder 对称

decodeSnapshot reset + add。decodeUpdate 同一套分支。**两端必须看到同一序列的 snapshot/update。** 丢包后不要继续 decode，应重新 subscribe 拿 base snapshot。

## 失败与边界

- 对未 spawn 的 instance 发 state update → Unknown service state。
- 两个订阅共享一对 encoder：路径 id 会对不上。注释和 README 都强调独立 hydrated stream 各一对。
- encode 不 `assertValidOp`。脏 ops 会原样压缩。校验在 parse 或 apply。
- `describeState` 只用于报错字符串：`key@generation.member` 或裸 member。

## 下一课

[15-services.provider.ts.md](/series/pi-source/chord/348-services-provider-ts/)：目录、provide/spawn、invoke、订阅缓冲。
