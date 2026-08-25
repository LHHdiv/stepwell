/**
 * 全站客户端入口：按页面钩子激活各模块
 */
import { initTheme, initFontSize } from "./theme";
import { initSearch } from "./search";
import { initReader } from "./reader";
import { initHomeProgress, initStatsStrip } from "./home";
import { initDashboard } from "./dashboard";

function boot(): void {
  initTheme();
  initFontSize();
  initSearch();
  initReader();
  initHomeProgress();
  initStatsStrip();
  initDashboard();

  // 移动端菜单开合
  const menuBtn = document.querySelector<HTMLButtonElement>("[data-menu-btn]");
  const nav = document.querySelector<HTMLElement>("[data-topnav]");
  menuBtn?.addEventListener("click", () => {
    const open = nav?.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(!!open));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
