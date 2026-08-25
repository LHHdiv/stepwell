/**
 * 目录工具库 —— 全站数据的中转站
 * 页面一律从这里取数据，不直接碰 collections API，方便以后调整。
 */
import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { SITE } from "../site.config";

export type SeriesEntry = CollectionEntry<"seriesMeta">;
export type ChapterEntry = CollectionEntry<"chapters">;

/** 章节文件名里的数字前缀（如 "03-agent-loop" → "03"） */
export function chapterNo(chapterOrId: ChapterEntry | string): string {
  const id = typeof chapterOrId === "string" ? chapterOrId : chapterEntryId(chapterOrId);
  const base = id.split("/").pop() ?? "";
  const m = base.match(/^(\d+)/);
  return m ? m[1] : "";
}

/** 章节条目 id 形如 "<seriesId>/03-agent-loop" */
export function chapterEntryId(c: ChapterEntry): string {
  return c.id;
}

/** 章节 id 里的系列 id 部分 */
function seriesPart(entryId: string): string {
  return entryId.split("/")[0];
}

/** 章节的访问路径：/series/<id>/<NN-slug>/ */
export function chapterUrl(c: ChapterEntry): string {
  return `/series/${c.id}/`;
}

/** 系列目录页路径：/series/<id>/ */
export function seriesUrl(s: SeriesEntry): string {
  return `/series/${s.id}/`;
}

/** 阅读分钟数：优先 frontmatter，否则按正文字数估算（中文约 400 字/分钟） */
export function readingMinutes(c: ChapterEntry): number {
  if (c.data.minutes && c.data.minutes > 0) return c.data.minutes;
  const chars = c.body?.length ?? 0;
  return Math.max(1, Math.round(chars / 400));
}

/** 全部未草稿系列，按 order 排序 */
export async function allSeries(): Promise<SeriesEntry[]> {
  const list = await getCollection("seriesMeta", ({ data }) => !data.draft);
  return list.sort((a, b) => a.data.order - b.data.order);
}

/** 按 id 取单个系列 */
export async function seriesById(id: string): Promise<SeriesEntry | undefined> {
  return (await allSeries()).find((s) => s.id === id);
}

/** 某系列的全部章节（按文件名数字前缀排序），可选剔除草稿 */
export async function chaptersOf(
  seriesId: string,
  opts: { includeDrafts?: boolean } = {}
): Promise<ChapterEntry[]> {
  const all = await getCollection("chapters", (c) => {
    if (seriesPart(c.id) !== seriesId) return false;
    return opts.includeDrafts ? true : !c.data.draft;
  });
  return all.sort((a, b) => {
    const na = Number(chapterNo(a)) || 0;
    const nb = Number(chapterNo(b)) || 0;
    return na - nb || a.id.localeCompare(b.id);
  });
}

/** 按元卡的 phases 分卷；没分进任何卷的章节归入“其他”。slugPrefix 支持两种写法：
 *  前缀匹配（"0" 匹配 00、01…）或区间匹配（"5-11" 匹配 05 到 11） */
export function groupByPhases(
  s: SeriesEntry,
  chapters: ChapterEntry[]
): { name: string; items: ChapterEntry[] }[] {
  const groups: { name: string; items: ChapterEntry[] }[] = s.data.phases.map((p) => ({
    name: p.name,
    items: [],
  }));
  const other: ChapterEntry[] = [];
  for (const c of chapters) {
    const no = chapterNo(c);
    const gi = s.data.phases.findIndex((p) => matchesPhase(no, p.slugPrefix));
    if (gi >= 0) groups[gi].items.push(c);
    else other.push(c);
  }
  if (other.length) groups.push({ name: "其他", items: other });
  return groups.filter((g) => g.items.length > 0);
}

function matchesPhase(no: string, slugPrefix: string): boolean {
  const range = slugPrefix.match(/^(\d+)-(\d+)$/);
  if (!range) return no.startsWith(slugPrefix);
  const n = Number(no);
  return n >= Number(range[1]) && n <= Number(range[2]);
}

/** 系列统计：总章数、总字数、总时长 */
export function seriesStats(chapters: ChapterEntry[]) {
  const totalMinutes = chapters.reduce((n, c) => n + readingMinutes(c), 0);
  const words = chapters.reduce((n, c) => n + (c.body?.length ?? 0), 0);
  return { count: chapters.length, minutes: totalMinutes, words };
}

/** 分类显示信息 */
export function categoryInfo(key: string): { label: string; emoji: string } {
  return SITE.categories[key] ?? { label: key, emoji: "📚" };
}

/** 难度显示信息 */
export function levelInfo(key: string): { label: string; desc: string } {
  return SITE.levels[key] ?? { label: key, desc: "" };
}

/** 阅读页的上一篇 / 下一篇 */
export function neighborsOf(chapters: ChapterEntry[], currentId: string) {
  const i = chapters.findIndex((c) => c.id === currentId);
  return {
    prev: i > 0 ? chapters[i - 1] : undefined,
    next: i >= 0 && i < chapters.length - 1 ? chapters[i + 1] : undefined,
  };
}
