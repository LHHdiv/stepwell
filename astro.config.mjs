// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// 站点最终域名。本地开发/预览不受影响；部署后改成你的域名即可。
const SITE = "https://stepwell.example.com";

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
