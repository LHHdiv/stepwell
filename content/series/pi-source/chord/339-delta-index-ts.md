---
title: "06 · delta/index.ts — 权威 JSON 的 flush 时差量"
summary: "能默写七种 decoded Op、三种 tracker 脏标记（append / diff / replace）、flush 为何先 walkDirty 再尽量 syncBaseline。能解释 encoder 为什么第二次才 inte"
tags: [pi, chord]
---
源码：`packages/chord/src/delta/index.ts`（约 1267 行）  
附：`packages/chord/src/delta/README.md`（操作词汇、所有权、数组陷阱；npm 包 `files` 含这份 README）  
出口：`@earendil-works/chord/delta`

## 本课目标

能默写七种 decoded `Op`、三种 tracker 脏标记（append / diff / replace）、`flush` 为何先 `walkDirty` 再尽量 `syncBaseline`。能解释 encoder 为什么第二次才 intern 路径、`r` 为何清空字典。这是 replicated state 和远程订阅的共同地基。

## 在系统中的位置

```text
track(initial)
  生产者改 tracker.state
  flush() → Op[]                         本地 decoded
    encoder.encode(ops) → WireOp[]       过线/落盘
    decoder.decode(wire) → Op[]
    apply / applyImmutable(prev, ops)
```

`MutableReplicatedStateImpl` 构造时 `track(initial)`，第一次 flush 当 hydrate 的 `["r", value]`。之后每次 `publish` 再 flush。副本只用 `applyImmutable`，这样旧 `value` 引用不变。

文件头注释写：Delta **不依赖 harness**。箭头只能从 session / runtime / facet host 指向这里。

## 操作词汇（README 并入）

路径是 `Seg[]`，`Seg = string | number`。

**Decoded `Op`（`flush` / `apply`）：**

| 元组 | 含义 |
|---|---|
| `["r", value]` | 整值替换。唯一能改根的 op |
| `["s", path, value]` | 设属性或数组元素。path 非空 |
| `["d", path]` | 删对象属性。path 非空 |
| `["a", path, text]` | 字符串追加 |
| `["t", path, count]` | 从字符串头去掉 count 个 UTF-16 code unit |
| `["p", path, index, remove, items]` | splice。path 可空（根是数组时） |

`isBase(ops)`：`ops[0]` 是 `r`。flush 保证 `r` 要么在下标 0 要么没有。

**Encoded `WireOp`：** 加上 `["#", id, path]`、数字 PathRef、省略路径的短元组。`["s", value]` 表示「用本批上一条的 path」。**绝不要把 WireOp 丢给 `apply`。**

## `overlap` — 滚动窗口

`diffString` 在不是纯前缀追加时，用 `overlap(before, after, scan)` 找「旧串后缀 = 新串前缀」的最长匹配。命中则 `t` + `a`（日志滚动窗口）；否则整段 `s`。

实现用 `indexOf` 探头，不用手写 KMP。重复字符（一长串相同字母）会限制候选次数，放弃则返回 0——发出更大的 `s`，但绝不算错。`maxOverlapScan` 默认 65536。

`after.startsWith(before)` 被刻意改成 `after.slice(0, before.length) === before`：V8 对 cons string 的 startsWith 是逐字符走，slice 一次 flatten 后 memcmp。注释给过 200 KB 每次 +8 字节的测量：845µs → 42µs。

## `track` 的脏树

`DirtyNode`：`valueDirty`、`array: append|diff|replace`、`children`。

- 普通赋值 → `markValue`（该节点以后当黑盒 diff）
- `push` / 在尾部 `splice(length, 0, ...)` / 拉长 `length` → `markArrayAppend(start)`
- `shift` / `unshift` / 中间 splice / sort / reverse → `markArrayDiff`
- `splice` 整段替换或 `length = 0` → `markArrayReplace`

Proxy `get` 对 `push/pop/...` 返回包装函数，走 `spliceItems`（1 万一批，避开 apply/spread 上限）。子代理缓存在 `childProxies`；会改下标的变异会 `childProxies.clear()`——**不要握着元素代理过 splice。**

`set`：`undefined` 在对象上等于 delete（发 `d`）；在数组上抛「会变稀疏」。数组只允许写到 `length`（追加）或已有下标。`defineProperty` / `setPrototypeOf` / `preventExtensions` 直接 TypeError。

`__proto__` / `constructor` / `prototype`：读可以通过，但写入抛 `UnsafePathError`。被这些键挡住的子树只能替换最近的普通父节点。这是为了防止 `["s", ["__proto__", "isAdmin"], true]` 污染 `Object.prototype`。

## `flush` / `rebase` / `discard` / `state =`

- 第一次或 `rebase()` 后：`[["r", cloneJson(root)]]`，并克隆一份 baseline。
- 否则 `walkDirty(baseline, root, pending)`。纯 append 不 diff 整组，只 splice 尾部；旧下标上的 child dirty 仍单独 walk。
- 然后 `syncBaseline`：能廉价共享的（标量、字符串、纯 append）把 baseline 沿脏路径对着 root 补；否则 `apply(baseline, cloneOp(ops))` 回放。共享字符串是为了下一轮不要对着 cons string 比。
- `discard()`：baseline = 当前 root 的克隆，丢掉未 flush 的脏。已存在的副本看不到这些改动。
- `tracker.state = next`：换根，强制下次 base。

`cloneJson` 只走 own enumerable data，保留 `null` 原型。

## `apply` vs `applyImmutable`

`apply`：**就地**改。`r` 直接采用 payload 引用（不拷）。一份 in-memory batch 扇出到多个可变副本会别名——所有权规则，要扇出就拷 batch 或让每人 decode。`s` 用 `defineProperty` 写，避免原型 setter。`d` 在数组上是 `splice(i,1)`（会改后续下标），对象上 `delete`。

`applyImmutable`：沿路径 `copyContainers`（只拷容器，子树共享），再对拷出来的根 `applyOps` 单条。旧 revision 的引用保持原样。replicated state 的源和副本都走这条。

`apply` 不是事务：中间某条 op 抛了，前面的已经改了。出错的流要丢掉 decoder 和 replica，等下一次 base。

## encoder / decoder

一对一绑定一条有序流。

encoder：

- 本批路径与上一条相同 → 短元组
- 路径第二次出现 → `["#", id, path]` 然后用数字
- 第一次 → 内联
- 遇到 `r`：**清空** seen/ids。base 是恢复点，新 decoder 从这里能自举

decoder：短形式没有 previous 就 `PathError`。未知 id 同样 PathError。`r` 清空字典。

`assertValidOp` / `assertValidWireOp` 按各词汇校验 arity。未知 verb 抛错而不是跳过——跳过会让新生产者的 op 静默消失。

## README 里必须记住的所有权

插进 `state` 的对象归 tracker。保留的外部引用可以读，**不能**再 mutate，也不能插到第二个 live 路径。tracker 不检测别名。`fill` / `copyWithin` 保持 JS 引用语义，不要用来把同一个可变对象放到多个下标。

可选属性用缺省，不要 `null` 除非位置必须在。`undefined` 只作为「删除对象键」的赋值语法。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 稀疏写 `arr[5]=x` 而 length=2 | `UnsafePathError` |
| 根上 `d` | TypeError |
| 未信任的 `__proto__` 路径 | `UnsafePathError` |
| 序号/重试/持久化 | **不在 Delta**。周围协议负责 |
| 对象键插入顺序 | 不复制。不要用序列化键序比 replica |
| shift 后再改新下标 0，同一次 flush | 可能按位置 diff 整段后缀，ops 变大。能控制 batch 就先 flush 结构再改元素 |

## 下一课

[07-services.errors.ts.md](/series/pi-source/chord/340-services-errors-ts/)：远程服务过线的稳定错误码。
