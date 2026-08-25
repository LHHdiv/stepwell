#!/usr/bin/env node
/**
 * 新章节/新系列脚手架
 *
 * 用法：
 *   npm run new:chapter -- deepseek-harness          # 在已有系列里建下一讲
 *   npm run new:chapter -- my-series --new           # 创建全新系列（_meta.md 模板）
 *
 * 交互式询问标题等信息，生成符合规范的文件，免记 frontmatter。
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import readline from "node:readline";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONTENT_DIR = path.join(ROOT, "content/series");

const args = process.argv.slice(2);
const isNew = args.includes("--new");
const seriesId = args.find((a) => !a.startsWith("-"));

if (!seriesId) {
  console.error("用法：npm run new:chapter -- <系列id> [--new]");
  console.error("示例：npm run new:chapter -- deepseek-harness");
  process.exit(1);
}

const seriesDir = path.join(CONTENT_DIR, seriesId);

function ask(question, fallback = "") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(
      fallback ? `${question}（回车默认：${fallback}）：` : `${question}：`,
      (ans) => {
        rl.close();
        resolve(ans.trim() || fallback);
      }
    );
  });
}

function nextChapterNo(dir) {
  const nos = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
        .map((f) => parseInt(f.match(/^(\d+)/)?.[1] ?? "-1", 10))
        .filter((n) => n >= 0)
    : [];
  const next = nos.length ? Math.max(...nos) + 1 : 0;
  return String(next).padStart(2, "0");
}

import { readdirSync } from "node:fs";

async function main() {
  // ---- 全新系列 ----
  if (isNew) {
    if (existsSync(seriesDir)) {
      console.error(`目录已存在：${seriesDir}`);
      process.exit(1);
    }
    const title = await ask("系列名（中文）", "我的新课");
    const en = await ask("英文名（封面装饰用）", "MY SERIES");
    const sub = await ask("一句话概括", "");
    console.log(`\n将创建系列目录：content/series/${seriesId}/`);
    mkdirSync(seriesDir, { recursive: true });
    writeFileSync(
      path.join(seriesDir, "_meta.md"),
      `---
title: ${title}
en: ${en}
sub: ${sub}
intro: >
  （这里写系列长介绍：学完能得到什么）
category: ai
level: intro
hue: "#2F6B4F"
hue2: "#7FB89A"
status: ongoing
order: 50
phases:
  - name: 卷一 · 起步
    slugPrefix: "0"
---

（这里写系列的卷首语，会显示在书架卡片背面。）
`,
      "utf8"
    );
    console.log("✅ _meta.md 已生成。接下来添加章节：npm run new:chapter -- " + seriesId);
    return;
  }

  // ---- 已有系列加章节 ----
  if (!existsSync(seriesDir)) {
    console.error(`找不到系列目录 ${seriesDir}。新建系列请加 --new 参数。`);
    process.exit(1);
  }

  const no = nextChapterNo(seriesDir);
  const title = await ask(`第${no}讲·标题`, `第${no}讲·未命名`);
  const summary = await ask("一句话概括本讲", "");
  const slug = (await ask("英文短横线文件名slug", `lecture-${no}`))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");

  const file = path.join(seriesDir, `${no}-${slug}.md`);
  if (existsSync(file)) {
    console.error(`文件已存在：${file}`);
    process.exit(1);
  }

  writeFileSync(
    file,
    `---
title: 第${no}讲·${title.replace(/^第\d+讲·/, "")}
summary: ${summary || "（一句话概括本讲解决什么问题）"}
objectives:
  - 理解……
  - 能够……
tags: []
keyPoints:
  - ……
---

（开篇类比或场景引入）

## 第一节

正文……

## 试一试

（留一个动手小练习）

## 下一讲预告

（一句话引出下一讲）
`,
    "utf8"
  );

  console.log(`✅ 已生成：content/series/${seriesId}/${no}-${slug}.md`);
  console.log("   打开它开始写作。写完记得过一遍提示词03审校员。");
}

main();
