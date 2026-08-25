/**
 * 首页/书架的进度回填：
 * - 「继续阅读」横条：找最近在读且未读完的一章
 * - 系列卡片进度条：按系列聚合已读比例
 * 页面元素带 data-* 钩子，这里只做客户端增强。
 */
import { loadProgress } from "./storage";

interface ChapterRef {
  key: string;
  url: string;
  title: string;
  seriesTitle: string;
}

/** 页面在 <script type="application/json" data-chapters> 里放章节清单（JSON），供进度计算 */
function readChapterList(): ChapterRef[] {
  const el = document.querySelector<HTMLScriptElement>('script[data-chapters][type="application/json"]');
  if (!el) return [];
  try {
    return JSON.parse(el.textContent ?? "[]") as ChapterRef[];
  } catch {
    return [];
  }
}

export function initHomeProgress(): void {
  const list = readChapterList();
  if (!list.length) return;

  const progress = loadProgress();

  /* ---- 继续阅读横条 ---- */
  const bar = document.querySelector<HTMLElement>("[data-resume]");
  if (bar) {
    const inFlight = list
      .map((c) => ({ c, p: progress[c.key] }))
      .filter((x) => x.p && !x.p.done)
      .sort((a, b) => b.p.at - a.p.at)[0];

    const target = inFlight
      ? { c: inFlight.c, pct: inFlight.p.pct }
      : // 没有在读记录时，不显示横条
        null;

    if (target) {
      bar.classList.add("show");
      bar.setAttribute("href", target.c.url);
      const t = bar.querySelector("[data-resume-title]");
      if (t) t.textContent = `${target.c.seriesTitle} · ${target.c.title}`;
      const pct = bar.querySelector("[data-resume-pct]");
      if (pct) pct.textContent = `${Math.min(99, target.pct)}%`;
    }
  }

  /* ---- 系列卡片进度 ---- */
  document.querySelectorAll<HTMLElement>("[data-series-card]").forEach((card) => {
    const id = card.dataset.seriesCard;
    if (!id) return;
    const chapters = list.filter((c) => c.key.startsWith(`${id}/`));
    if (!chapters.length) return;
    const doneCount = chapters.filter((c) => progress[c.key]?.done).length;
    const pct = Math.round((doneCount / chapters.length) * 100);
    const fill = card.querySelector<HTMLElement>(".card-progress > i");
    if (fill && pct > 0) {
      card.querySelector(".card-progress")?.classList.add("show");
      fill.style.setProperty("--pct", `${pct}%`);
    }
    const label = card.querySelector("[data-progress-label]");
    if (label && doneCount > 0) label.textContent = `已读 ${doneCount}/${chapters.length}`;
  });

  /* ---- 目录页章节已读标记 ---- */
  document.querySelectorAll<HTMLAnchorElement>("[data-toc-link]").forEach((a) => {
    const k = a.dataset.tocLink ?? "";
    if (progress[k]?.done) a.dataset.done = "true";
  });
}

/** 首页数据条里的连读天数 */
export function initStatsStrip(): void {
  const el = document.querySelector<HTMLElement>("[data-streak]");
  if (el) el.textContent = String(currentStreak());
}

import { currentStreak } from "./streak";
