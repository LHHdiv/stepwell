/**
 * 学习看板（/dashboard/）
 * 全部数据来自本地存储：连续天数、累计完成、热力图、每本书进度。
 */
import { loadActivity, loadProgress } from "./storage";
import { currentStreak, todayISO } from "./streak";

interface ChapterRef {
  key: string;
  url: string;
  title: string;
  seriesTitle: string;
}

export function initDashboard(): void {
  const root = document.querySelector<HTMLElement>("[data-dashboard]");
  if (!root) return;

  const activity = loadActivity();
  const progress = loadProgress();

  /* ---- 顶部统计 ---- */
  const set = (sel: string, v: string | number) => {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) el.textContent = String(v);
  };
  set("[data-stat-streak]", currentStreak());

  const doneKeys = Object.keys(progress).filter((k) => progress[k].done);
  set("[data-stat-done]", doneKeys.length);

  // 累计阅读分钟估算：读完章节数 × 平均 12 分钟（粗略但稳定）
  set("[data-stat-minutes]", doneKeys.length * 12);

  // 活跃天数
  const activeDays = Object.keys(activity).filter((d) => activity[d] > 0).length;
  set("[data-stat-days]", activeDays);

  /* ---- 热力图：最近 26 周 ---- */
  const heat = root.querySelector<HTMLElement>("[data-heatmap]");
  if (heat) {
    const cells: string[] = [];
    const end = new Date();
    // 对齐到本周周日结尾，向前铺满 26 周 × 7 天
    end.setDate(end.getDate() + (7 - ((end.getDay() + 1) % 7)));
    for (let i = 181; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const iso = todayISO(d);
      const n = activity[iso] ?? 0;
      const lv = n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3;
      const label = `${iso} · ${n === 0 ? "未学习" : `读完 ${n} 讲`}`;
      cells.push(`<span class="hm-cell" data-lv="${lv}" title="${label}"></span>`);
    }
    heat.innerHTML = cells.join("");
  }

  /* ---- 每本书进度 ---- */
  const dataEl = document.querySelector<HTMLScriptElement>(
    'script[data-chapters][type="application/json"]'
  );
  if (dataEl) {
    try {
      const chapters = JSON.parse(dataEl.textContent ?? "[]") as ChapterRef[];
      const bySeries = new Map<string, { total: number; done: number; title: string; last: string }>();
      for (const c of chapters) {
        const sid = c.key.split("/")[0];
        const rec = bySeries.get(sid) ?? {
          total: 0,
          done: 0,
          title: c.seriesTitle,
          last: "",
        };
        rec.total += 1;
        if (progress[c.key]?.done) rec.done += 1;
        else if (!rec.last && progress[c.key]) rec.last = c.title;
        bySeries.set(sid, rec);
      }

      const listEl = root.querySelector<HTMLElement>("[data-book-progress]");
      if (listEl) {
        const rows = Array.from(bySeries.entries())
          .sort((a, b) => b[1].done / b[1].total - a[1].done / a[1].total)
          .map(([sid, r]) => {
            const pct = Math.round((r.done / r.total) * 100);
            return `<li><a href="/series/${sid}/">
              <span class="bp-name">${escapeHtml(r.title)}</span>
              <span class="bp-pct">${pct}%</span>
              <span class="bp-sub"><i style="width:${pct}%"></i></span>
            </a></li>`;
          });
        listEl.innerHTML =
          rows.join("") ||
          `<div class="empty-tip">还没有阅读记录——去<a href="/library/">书架</a>挑一本书开始吧</div>`;
      }
    } catch {
      /* 数据解析失败时静默跳过 */
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c
  );
}
