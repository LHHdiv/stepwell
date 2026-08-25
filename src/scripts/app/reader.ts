/**
 * 阅读页行为：滚动进度、已读标记、TOC 高亮
 * 仅在文章页（存在 data-reader 根节点时）激活。
 */
import { trackProgress } from "./storage";

/** 章节唯一键，由页面写在 <article data-chapter="系列/章节"> 上 */
function chapterKey(): string {
  const el = document.querySelector<HTMLElement>("[data-chapter]");
  return el?.dataset.chapter ?? "";
}

export function initReader(): void {
  const root = document.querySelector<HTMLElement>("[data-reader]");
  if (!root) return;

  const key = chapterKey();
  if (!key) return;

  /* ---- 右侧信息栏实时百分比 ---- */
  const sidePct = document.querySelector<HTMLElement>("[data-side-pct]");
  const sideFill = document.querySelector<HTMLElement>(".reader-side .card-progress > i");

  /* ---- 滚动进度条 + 进度记录 ---- */
  const bar = document.querySelector<HTMLElement>(".reader-progress-track > i");
  let doneMarked = root.dataset.done === "true";
  let lastPct = 0;

  const onScroll = () => {
    const doc = document.documentElement;
    const total = doc.scrollHeight - window.innerHeight;
    const pct = total > 0 ? Math.min(100, Math.round((window.scrollY / total) * 100)) : 100;
    lastPct = pct;
    if (bar) bar.style.width = `${pct}%`;
    if (sidePct) sidePct.textContent = `${pct}%`;
    if (sideFill) sideFill.style.setProperty("--pct", `${pct}%`);

    // 滚过 85% 自动记已读
    if (!doneMarked && pct >= 85) {
      markDone(true);
    }
  };

  const markDone = (silent: boolean) => {
    doneMarked = true;
    root.dataset.done = "true";
    const entry = trackProgress(key, Math.max(lastPct, 100), true);
    // 活动计数交给看板脚本按日期聚合（读 progress 的 done 变化即可，这里直接 bump）
    import("./streak").then((m) => m.recordCompletion());
    if (!silent) renderStamp();
  };

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          onScroll();
          ticking = false;
        });
      }
    },
    { passive: true }
  );
  onScroll();

  // 每 30 秒静默保存一次滚动位置百分比
  const saveTimer = window.setInterval(() => {
    if (!doneMarked && lastPct > 0) trackProgress(key, lastPct);
  }, 30000);
  window.addEventListener("pagehide", () => {
    window.clearInterval(saveTimer);
    if (!doneMarked && lastPct > 0) trackProgress(key, lastPct);
  });

  /* ---- 「标记为已读」按钮 ---- */
  const btn = document.querySelector<HTMLButtonElement>("[data-mark-done]");
  if (btn) {
    btn.addEventListener("click", () => {
      if (!doneMarked) {
        markDone(false);
        btn.disabled = true;
        btn.textContent = "已读完 ✓";
      }
    });
    if (doneMarked) {
      btn.disabled = true;
      btn.textContent = "已读完 ✓";
    }
  }

  function renderStamp() {
    const holder = document.querySelector<HTMLElement>("[data-stamp-holder]");
    if (!holder || holder.querySelector(".read-stamp")) return;
    const span = document.createElement("span");
    span.className = "read-stamp stamp";
    span.textContent = "已读";
    holder.appendChild(span);
  }

  if (doneMarked) renderStamp();

  /* ---- TOC 滚动高亮 ---- */
  const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".page-toc a"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    const headings = tocLinks
      .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
      .filter((h): h is HTMLElement => !!h);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = e.target.id;
          tocLinks.forEach((a) =>
            a.classList.toggle("current", decodeURIComponent(a.hash.slice(1)) === id)
          );
        }
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );
    headings.forEach((h) => io.observe(h));
  }
}
