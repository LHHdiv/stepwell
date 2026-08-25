import type { APIRoute } from "astro";
import { allSeries, chaptersOf } from "../lib/catalog";

/**
 * 全站搜索索引（构建期生成）
 * text 只保留正文前 2000 字符，控制索引体积。
 */
export const GET: APIRoute = async () => {
  const seriesList = await allSeries();
  const titleOf = new Map(seriesList.map((s) => [s.id, s.data.title]));
  const items: {
    title: string;
    series: string;
    seriesTitle: string;
    url: string;
    summary: string;
    text: string;
  }[] = [];

  for (const s of seriesList) {
    for (const c of await chaptersOf(s.id)) {
      items.push({
        title: c.data.title,
        series: s.id,
        seriesTitle: s.data.title,
        url: `/series/${c.id}/`,
        summary: c.data.summary,
        text: (c.body ?? "").slice(0, 2000),
      });
    }
  }

  // 独立文章也纳入搜索
  const { getCollection } = await import("astro:content");
  for (const p of await getCollection("posts", (x) => !x.data.draft)) {
    items.push({
      title: p.data.title,
      series: "posts",
      seriesTitle: "独立文章",
      url: `/posts/${p.id}/`,
      summary: p.data.summary,
      text: (p.body ?? "").slice(0, 2000),
    });
  }

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
