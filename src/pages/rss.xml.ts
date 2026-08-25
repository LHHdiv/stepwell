import type { APIRoute } from "astro";
import { allSeries, chaptersOf } from "../lib/catalog";
import { SITE } from "../site.config";

/** 本站 RSS：别人可以订阅你的学习更新 */
export const GET: APIRoute = async ({ site }) => {
  const seriesList = await allSeries();

  type Item = {
    title: string;
    link: string;
    description: string;
    categories: string[];
  };
  const items: Item[] = [];

  for (const s of seriesList) {
    for (const c of await chaptersOf(s.id)) {
      items.push({
        title: `${s.data.title} · ${c.data.title}`,
        link: new URL(`/series/${c.id}/`, site).toString(),
        description: c.data.summary || s.data.sub,
        categories: [s.data.title, ...c.data.tags],
      });
    }
  }

  const { getCollection } = await import("astro:content");
  for (const p of await getCollection("posts", (x) => !x.data.draft)) {
    items.push({
      title: p.data.title,
      link: new URL(`/posts/${p.id}/`, site).toString(),
      description: p.data.summary,
      categories: ["独立文章", ...p.data.tags],
    });
  }

  // 新的在前面（按路径里的编号倒序近似处理）
  items.reverse();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE.name} · ${SITE.nameEn}</title>
    <link>${site}</link>
    <description>${SITE.description}</description>
    <language>zh-CN</language>
    <atom:link href="${new URL("rss.xml", site)}" rel="self" type="application/rss+xml"/>
${items
  .map(
    (i) => `    <item>
      <title>${esc(i.title)}</title>
      <link>${i.link}</link>
      <guid isPermaLink="true">${i.link}</guid>
      <description>${esc(i.description)}</description>
      ${i.categories.map((c) => `<category>${esc(c)}</category>`).join("\n      ")}
    </item>`
  )
  .join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}
