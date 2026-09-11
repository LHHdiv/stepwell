// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// 站点最终域名（Netlify 生产地址）。本地开发/预览不受影响；换域名时改这一行。
const SITE = "https://stepwell-reader.netlify.app";

export default defineConfig({
  site: SITE,
  trailingSlash: "always",
  devToolbar: { enabled: false },
  build: { inlineStylesheets: "auto" },
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
    },
  },
  integrations: [sitemap()],
});
