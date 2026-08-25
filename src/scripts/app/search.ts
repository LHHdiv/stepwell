/**
 * ⌘K 全站搜索
 * 索引由构建期生成到 /search-index.json（见 src/pages/search-index.json.ts），
 * 首次打开面板时按需加载一次。
 */
interface SearchItem {
  title: string;
  series: string;
  seriesTitle: string;
  url: string;
  summary: string;
  text: string;
}

export function initSearch(): void {
  const layer = document.querySelector<HTMLElement>("[data-search-layer]");
  if (!layer) return;

  const panel = layer.querySelector<HTMLElement>(".search-panel");
  const input = layer.querySelector<HTMLInputElement>("[data-search-input]");
  const list = layer.querySelector<HTMLElement>("[data-search-results]");

  let index: SearchItem[] | null = null;
  let results: SearchItem[] = [];
  let active = -1;

  const open = () => {
    layer.classList.add("open");
    document.body.style.overflow = "hidden";
    if (!index) {
      fetch("/search-index.json")
        .then((r) => r.json())
        .then((d: SearchItem[]) => {
          index = d;
          render(query());
        })
        .catch(() => {
          if (list) list.innerHTML = `<li class="search-empty">索引加载失败</li>`;
        });
    }
    input?.focus();
  };

  const close = () => {
    layer.classList.remove("open");
    document.body.style.overflow = "";
    if (input) input.value = "";
    results = [];
    active = -1;
  };

  const query = (): string => (input?.value ?? "").trim().toLowerCase();

  function render(q: string): void {
    if (!list) return;
    if (!index) {
      list.innerHTML = `<li class="search-empty">索引加载中…</li>`;
      return;
    }
    if (!q) {
      list.innerHTML = `<li class="search-empty">输入关键词，检索全部课程</li>`;
      return;
    }
    results = index
      .map((item) => {
        const t = item.title.toLowerCase();
        const s = item.seriesTitle.toLowerCase();
        let score = 0;
        if (t.includes(q)) score += 10;
        if (s.includes(q)) score += 6;
        if (item.summary.toLowerCase().includes(q)) score += 4;
        const hit = item.text.indexOf(q);
        if (hit >= 0) score += 2;
        return { item, score, hit };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    if (!results.length) {
      list.innerHTML = `<li class="search-empty">没有找到「${escapeHtml(q)}」相关内容</li>`;
      return;
    }

    active = 0;
    list.innerHTML = results
      .map(({ item, hit }, i) => {
        const start = Math.max(0, (hit ?? 0) - 30);
        const snippet =
          hit !== undefined && hit >= 0
            ? (start > 0 ? "…" : "") + escapeHtml(item.text.slice(start, start + 90)) + "…"
            : escapeHtml(item.summary.slice(0, 90));
        return `<li><a href="${item.url}" data-i="${i}" class="${i === 0 ? "active" : ""}">
          <span class="r-series">${escapeHtml(item.seriesTitle)}</span>
          <div class="r-title">${highlight(item.title, q)}</div>
          <div class="r-snippet">${snippet}</div>
        </a></li>`;
      })
      .join("");
  }

  function highlight(text: string, q: string): string {
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return escapeHtml(text);
    return (
      escapeHtml(text.slice(0, i)) +
      "<mark>" +
      escapeHtml(text.slice(i, i + q.length)) +
      "</mark>" +
      escapeHtml(text.slice(i + q.length))
    );
  }

  function move(dir: 1 | -1): void {
    if (!results.length || !list) return;
    active = (active + dir + results.length) % results.length;
    list.querySelectorAll("a").forEach((a, i) => a.classList.toggle("active", i === active));
    list.querySelectorAll("a")[active]?.scrollIntoView({ block: "nearest" });
  }

  const go = () => {
    const target = results[active];
    if (target) location.href = target.url;
  };

  /* ---- 事件绑定 ---- */
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      layer.classList.contains("open") ? close() : open();
    } else if (e.key === "Escape" && layer.classList.contains("open")) {
      close();
    } else if (layer.classList.contains("open")) {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") { e.preventDefault(); go(); }
    }
  });

  layer
    .querySelector("[data-search-open]")
    ?.addEventListener("click", open);
  // 顶栏按钮
  document
    .querySelectorAll<HTMLElement>("[data-open-search]")
    .forEach((b) => b.addEventListener("click", open));

  layer.querySelector(".search-backdrop")?.addEventListener("click", close);
  input?.addEventListener("input", () => render(query()));
  list?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) close();
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c
  );
}
