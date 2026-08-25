/**
 * 主题（明暗）与正文字号
 * 页面头部有一段内联预载脚本防闪烁，这里负责运行时切换与持久化。
 */
import { loadSettings, saveSettings } from "./storage";

type Theme = "light" | "dark" | "auto";

function applyTheme(t: Theme): void {
  const dark =
    t === "dark" ||
    (t === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function initTheme(): void {
  applyTheme(loadSettings().theme);

  // 系统主题变化时跟随（仅 auto 模式）
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (loadSettings().theme === "auto") applyTheme("auto");
  });

  document.querySelectorAll<HTMLElement>("[data-toggle-theme]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = loadSettings();
      const cur = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      const next: Theme = cur === "dark" ? "light" : "dark";
      s.theme = next;
      saveSettings(s);
      applyTheme(next);
    });
  });
}

/* ---------- 正文字号 ---------- */

const FS_ORDER = ["s", "m", "l"] as const;

export function initFontSize(): void {
  const set = (fs: "s" | "m" | "l") => {
    document.documentElement.dataset.fs = fs;
    const s = loadSettings();
    s.fs = fs;
    saveSettings(s);
    document.querySelectorAll<HTMLButtonElement>("[data-fs-btn]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.fsBtn === fs));
    });
  };

  document.documentElement.dataset.fs = loadSettings().fs;

  document.querySelectorAll<HTMLButtonElement>("[data-fs-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.fsBtn as "s" | "m" | "l";
      if (target) {
        set(target);
        return;
      }
      // 无 data-fs-btn 目标时视为步进按钮
      const step = Number(btn.dataset.fsStep ?? 0);
      const cur = FS_ORDER.indexOf(
        (document.documentElement.dataset.fs as "s" | "m" | "l") ?? "m"
      );
      const next = Math.min(2, Math.max(0, cur + step));
      set(FS_ORDER[next]);
    });
  });

  // 恢复按钮态
  const cur = (document.documentElement.dataset.fs as "s" | "m" | "l") ?? "m";
  document.querySelectorAll<HTMLButtonElement>("[data-fs-btn]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.fsBtn === cur));
  });
}
