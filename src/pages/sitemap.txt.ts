import type { APIRoute } from "astro";
import type { CollectionEntry } from "astro:content";

/** sitemap.txt：最简站点地图（xml 版由 @astrojs/sitemap 自动生成） */
export const GET: APIRoute = async ({ site }) => {
  const { allSeries, chaptersOf } = await import("../lib/catalog");
  const urls: string[] = ["/", "/library/", "/posts/", "/dashboard/", "/feeds/", "/prompts/", "/about/"];
  for (const s of await allSeries()) {
    urls.push(`/series/${s.id}/`);
    for (const c of await chaptersOf(s.id)) {
      urls.push(`/series/${c.id}/`);
    }
  }
  const { getCollection } = await import("astro:content");
  for (const p of await getCollection("posts", (x) => !x.data.draft)) {
    urls.push(`/posts/${p.id}/`);
  }
  const body = urls.map((u) => new URL(u, site).toString()).join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};

export type _T = CollectionEntry<"chapters">;
