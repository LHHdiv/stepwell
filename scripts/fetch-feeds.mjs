#!/usr/bin/env node
/**
 * RSS 抓取脚本：读 src/data/feeds.yaml，抓取每个源的最新文章，
 * 生成 src/data/feeds-cache.json（/feeds/ 页面构建时读取它）。
 *
 * 用法：
 *   npm run feeds          # 本地手动跑
 *   GitHub Actions 每天自动跑一次并提交快照
 *
 * 特性：
 *   - 单个源失败不影响其他源
 *   - 有缓存时增量合并，避免源临时挂掉导致旧内容消失
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import yaml from "yaml";
import Parser from "rss-parser";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LIST_PATH = path.join(ROOT, "src/data/feeds.yaml");
const CACHE_PATH = path.join(ROOT, "src/data/feeds-cache.json");

const MAX_PER_SOURCE = 20; // 每个源最多保留条数

function loadYamlSafe(p) {
  try {
    return yaml.parse(readFileSync(p, "utf8"));
  } catch (e) {
    console.error(`[feeds] 解析 ${p} 失败：`, e.message);
    process.exit(1);
  }
}

async function main() {
  const doc = loadYamlSafe(LIST_PATH);
  const sources = doc.sources ?? [];
  if (!sources.length) {
    console.log("[feeds] feeds.yaml 里还没有任何订阅源。");
    writeCache({ generatedAt: new Date().toISOString(), items: [] });
    return;
  }

  // 旧快照：源挂掉时可沿用旧数据
  let prevItems = [];
  if (existsSync(CACHE_PATH)) {
    try {
      prevItems = JSON.parse(readFileSync(CACHE_PATH, "utf8")).items ?? [];
    } catch {
      /* 忽略坏缓存 */
    }
  }

  const parser = new Parser({ timeout: 15000 });
  const results = await Promise.allSettled(
    sources.map(async (src) => {
      const feed = await parser.parseURL(src.url);
      const entries = (feed.items ?? []).slice(0, MAX_PER_SOURCE).map((item) => ({
        source: src.name,
        tag: src.tag ?? "",
        title: (item.title ?? "(无标题)").trim(),
        link: item.link ?? "",
        summary: stripHtml(item.contentSnippet || item.content || "").slice(0, 160),
        date: isoDate(item.isoDate || item.pubDate),
      }));
      return { name: src.name, ok: true, entries };
    })
  );

  /** 新结果（按源合并） */
  const fresh = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const name = sources[i].name;
    if (r.status === "fulfilled") {
      console.log(`[feeds] ✓ ${name}：${r.value.entries.length} 条`);
      fresh.push(...r.value.entries);
    } else {
      console.warn(`[feeds] ✗ ${name} 抓取失败：${r.reason?.message ?? r.reason}`);
      // 沿用该源的旧数据
      fresh.push(...prevItems.filter((it) => it.source === name));
    }
  }

  // 去重（同链接只保留一条）+ 按时间倒序
  const seen = new Set();
  const items = fresh
    .filter((it) => {
      if (!it.link || seen.has(it.link)) return false;
      seen.add(it.link);
      return true;
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  writeCache({ generatedAt: new Date().toISOString(), items });
  console.log(`[feeds] 完成：共 ${items.length} 条 → ${path.relative(ROOT, CACHE_PATH)}`);
}

function writeCache(data) {
  writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function isoDate(s) {
  if (!s) return "";
  try {
    return new Date(s).toISOString();
  } catch {
    return "";
  }
}

function stripHtml(s) {
  return String(s)
    // 先修复裸 & 符号（部分源 XML 转义不规范，导致解析失败）
    .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

main().catch((e) => {
  console.error("[feeds] 运行失败：", e);
  process.exit(1);
});
