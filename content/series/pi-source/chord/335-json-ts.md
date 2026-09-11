---
title: "02 · json.ts — 有限无环的 strict JSON"
summary: "能亲手走一遍 check：深度上限、数组不能有洞、对象必须是 {} 或 Object.create(null)、循环检测用祖先 Set。知道为什么 undefined、NaN、class 实例全部失败。"
tags: [pi, chord]
---
源码：`packages/chord/src/json.ts`  
被谁调用：根导出 `isJsonValue`；`packages/protocol` 的 codec 在信封边界上调用。Chord 服务运行时**默认不**对每次 RPC 参数跑它。

## 本课目标

能亲手走一遍 `check`：深度上限、数组不能有洞、对象必须是 `{}` 或 `Object.create(null)`、循环检测用祖先 Set。知道为什么 `undefined`、`NaN`、class 实例全部失败。

## 在系统中的位置

```text
适配器收到 unknown
  isJsonValue(value)?     ← 你在这里
    否 → 拒收
    是 → parseServiceCall / parseServiceCatalogue / ...
```

`JsonValue` 类型在 `types.ts`。本文件是那个类型的运行时裁判。PLANNING 写：Chord 校验结构控制信封，业务 JSON 的强制目前交给序列化器。所以你在 `provider.invoke` 里看不到 `isJsonValue(args)`——那是有意的缺口，不是漏写。

## `isJsonValue`

```ts
export function isJsonValue(value: unknown): value is JsonValue {
  return check(value, new Set<object>(), 0);
}
```

入口只建一个祖先集合。递归在 `check`。

## `check(value, ancestors, depth)`

1. **`depth > 512` → false。** 防止合法但极深的对象把栈打爆。512 是硬上限，不是 JSON 标准。
2. **`null` / `string` / `boolean` → true。**
3. **`number`：必须 `Number.isFinite`。** `NaN`、`Infinity`、`-Infinity` 都不是 JSON。
4. **数组：**
   - `Reflect.ownKeys` 长度必须等于 `length + 1`（`length` 本身占一个键），且所有键都是 string。这排除：稀疏洞（`[1,,2]` 的 ownKeys 不含 `"1"`）、符号键、额外自己的属性。
   - 进祖先 Set；若已在集合里 → 环 → false。
   - 每个下标必须有 **enumerable data 属性**（不是 accessor）。值递归 `check`。
   - `finally` 里从祖先删掉，这样兄弟节点可以共享已经离开路径的对象——但 Chord 的规则其实禁止别名，这里只是为了深度优先走完。
5. **对象：**
   - 原型必须是 `Object.prototype` 或 `null`。`new Date`、`class Foo`、`Map` 全灭。
   - ownKeys 必须全是 string（不要 symbol）。
   - 同样做环检测。
   - 每个描述符必须 enumerable 且是 data 属性。getter 不算 JSON。

非对象的剩余类型（`undefined`、`function`、`bigint`、`symbol`）在第 5 步开头 `typeof !== "object"` 失败。

## 失败与边界

| 输入 | 结果 | 原因 |
|---|---|---|
| `undefined` | false | 不是 JSON |
| `{ a: undefined }` | false | 属性值不是 JSON；要用缺省键或 `null` |
| `[1,,2]` | false | 稀疏 |
| `Array(3)` | false | 同上 |
| `{ __proto__: { x: 1 } }` | 看写法 | 字面量 `__proto__` 可能变成原型；`Object.create(null)` 加 own `__proto__` 才是纯数据。Delta 另外禁止通过该键变异 |
| 循环 `a.b = a` | false | ancestors |
| 深度 513 | false | 上限 |
| `Object.defineProperty(..., { get })` | false | accessor |

`isJsonValue` **不**冻结、不克隆。通过之后调用方仍可能原地改。远程适配器若需要隔离，自己拷。

## 下一课

[03-context.index.ts.md](/series/pi-source/chord/336-context-index-ts/)：取消和调用作用域值。远程方法最后一个参数就是它。
