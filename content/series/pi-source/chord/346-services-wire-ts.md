---
title: "13 · services/wire.ts — `$chord.service` 语法与解析"
summary: "分清 decoded 快照（Op[]）和 wire 快照（WireOp[]）。能手写 catalogue / subscribe / unsubscribe 三个控制 ServiceCall。知道 parse 是结构校验，不是业务 sc"
tags: [pi, chord]
---
源码：`packages/chord/src/services/wire.ts`  
被谁调用：适配器组控制调用；`createRemoteServiceEndpoint` 用 `decodeServiceControlCall`；Pi protocol 边界用 `parseServiceCall` 等。

## 本课目标

分清 **decoded** 快照（`Op[]`）和 **wire** 快照（`WireOp[]`）。能手写 catalogue / subscribe / unsubscribe 三个控制 `ServiceCall`。知道 `parse*` 是结构校验，不是业务 schema。

## 在系统中的位置

```text
适配器发送
  createServiceCatalogueCall()     { serviceId: "$chord.service", member: "catalogue", args: [] }
  createServiceSubscribeCall(id, serviceId, mode)
  createServiceUnsubscribeCall(id)
对端 endpoint.invoke
  decodeServiceControlCall(call) → 分流到 provider.catalogue / subscribe / close
业务调用
  parseServiceCall(unknown) → ServiceCall → provider.invoke
```

Chord 拥有这份语法。外层信封（request id、路由、鉴权）是 Pi protocol 的事。

## 控制调用

常量：`SERVICE_CONTROL_ID = "$chord.service"`。三个 member：`catalogue` / `subscribe` / `unsubscribe`。

`decodeServiceControlCall`：serviceId 不对或带 `instance` → `undefined`（当业务调用）。args 形状不对也 `undefined`，**不抛**——endpoint 会把它当普通 invoke，然后 provider 因 `$chord.service` 不在业务目录里而 `service_not_allowed`。适配器应在进 endpoint 前保证控制调用形状正确。

subscribe 的 `subscriptionId` 是适配器分配的。Chord 不解释它，只当 Map 键。重复 id 在 endpoint 里抛。

## `parseServiceCall`

`record` + `assertKeys` 必需 `serviceId, member, args`，可选 `instance`。id 非空字符串，args 是数组。多余键、缺键都 TypeError `"Invalid service call"`。

`parseServiceCatalogue`：数组、id 唯一、mode 只能 singleton|keyed。

## 快照与更新：两套 parser

| decoded | wire |
|---|---|
| `parseServiceSubscriptionSnapshot` + `assertValidOp` | `parseWireServiceSubscriptionSnapshot` + `assertValidWireOp` |
| `parseServiceProviderUpdate` | `parseWireServiceProviderUpdate` |

结构相同，只是 `ops` 的词汇不同。`assertInstance` 要求 members 里 method 有 name、state 有 sequence≥0 和 ops 数组。address 的 generation 必须是 ≥1 的整数。

`assertKeys` **拒绝未知键**。多一个字段就 Invalid。这让协议演进必须走版本，不能偷偷加字段。

`state` 更新的 sequence 最小是 **1**（`isInteger(seq, 1)`）。hydrate 快照里 state.sequence 最小是 **0**。对得上 state.ts：未 publish 过的源 sequence=0，第一次 publish 才是 1。

## 失败与边界

- parse 失败是 `TypeError`，不是 `RemoteServiceError`。适配器应在进服务层之前挡掉畸形消息。
- `decodeServiceControlCall` 宽松（不匹配就 undefined）。`parse*` 严格。
- 不校验 ops 能否 apply，只校验元组形状。apply 时还会 `assertValidOp` + 路径安全。
- `$chord.service` 本身不应出现在业务 catalogue。provider 构造时也不会登记它。

## 下一课

[14-services.state-codec.ts.md](/series/pi-source/chord/347-services-state-codec-ts/)：每条订阅如何给每个 state 成员配一对 encoder/decoder。
