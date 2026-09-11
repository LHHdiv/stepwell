---
title: "97 · utils/frontmatter.ts — YAML 头"
summary: "技能和 prompt 模板文件以 --- 开头。parseFrontmatter：剥 BOM、统一换行，找第二段 \\n---，中间当 YAML（yaml.parse），后面当 body。没有头则 frontmatter {}、body "
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/frontmatter.ts`

技能和 prompt 模板文件以 `---` 开头。`parseFrontmatter`：剥 BOM、统一换行，找第二段 `\n---`，中间当 YAML（`yaml.parse`），后面当 body。没有头则 frontmatter `{}`、body 全文。`stripFrontmatter` 只要 body。

## 失败与边界

YAML 非法会 throw。调用方（skills loader）应捕获。结束 `---` 找不到则整文件当 body，避免把没写完的草稿当 YAML。

## 下一课

[98-utils.git.ts.md](/series/pi-source/coding-agent/651-utils-git-ts/)
