---
title: "03 · sqlite/sql.ts — 参数化模板和片段拼接"
summary: "${value} 变成 ? 绑定，${sql...} 内联片段。动态 WHERE 不要拼接用户字符串。读完应能看懂 joinSqlFragments(filters, \" AND \")。"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/sql.ts`  
核心导出：`sql`、`SqlQuery`、`joinSqlFragments`  
被谁调用：几乎所有 session 查询；`NodeSqliteDatabase.transaction` 的 BEGIN/COMMIT。

## 本课目标

`${value}` 变成 `?` 绑定，`${sql`...`}` 内联片段。动态 WHERE 不要拼接用户字符串。读完应能看懂 `joinSqlFragments(filters, " AND ")`。

## `sql` 模板

```ts
sql`SELECT ... WHERE session_id = ${sessionId} AND id IN (${placeholders})`
```

循环：普通值 push 进 `params`，queryText 加 `?`；`SqlQuery` 则把子 queryText 和 params 按序接上。`strings[0]` 起头，每个值后面跟 `strings[index+1]`。

**不**做标识符转义。表名、列名、`ASC`/`DESC`、`LIMIT` 必须是代码里的字面量或受信的 `SqlQuery`（如 `sql`ASC``）。`LIMIT ${n}` 把 n 当绑定参数，SQLite 允许。

## `SqlQuery` 方法

| 方法 | 用途 |
|---|---|
| `exec` | 无参数才能 exec（DDL）。有 params 抛 TypeError |
| `run` | INSERT/UPDATE/DELETE |
| `get` | 一行或 undefined |
| `all` | 数组 |
| `iterate` | 游标 |

每次都 `db.prepare(this.queryText)`。热路径插入用 Writer 类缓存 statement，不走模板。

## `joinSqlFragments`

`IN (${id1}, ${id2})`：`ids.map(id => sql`${id}`)` 再 `joinSqlFragments(..., ", ")`。空数组不要调用——`readEntryRows` 在 `ids.length === 0` 早返回。空 join 会得到空 queryText，`IN ()` 非法。

## 失败与边界

- 嵌套 `sql` 不会加括号。需要分组自己写 `AND (${joinSqlFragments(stop, " OR ")})`。
- 两个独立 `sql` 对象即使文本相同也不共享 prepare 缓存。
- 测试见 `test/sql.test.ts`。

## 下一课

schema 正文（含 SQL 迁移文件）：[04-sqlite.migrations.ts.md](/series/pi-source/session-backends/371-sqlite-migrations-ts/)。
