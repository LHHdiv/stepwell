/**
 * 内容集合定义 —— stepwell 的"课程数据库"
 *
 * 两个 collection：
 *  - seriesMeta：每系列一张元卡（content/series/<id>/_meta.md）
 *  - chapters ：章节正文（content/series/<id>/NN-slug.md，文件名数字前缀定序）
 */
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const seriesMeta = defineCollection({
  loader: glob({
    pattern: "**/_meta.md",
    base: "./content/series",
    // 目录名即系列 id（deepseek-harness/_meta.md → deepseek-harness）
    generateId: ({ entry }) => entry.split("/")[0] ?? entry,
  }),
  schema: z.object({
    /** 系列名（中文） */
    title: z.string(),
    /** 系列英文名/副题，用于封面装饰 */
    en: z.string().default(""),
    /** 一句话概括 */
    sub: z.string().default(""),
    /** 长介绍（书架页展示） */
    intro: z.string().default(""),
    /** 分类 key，取值见 site.config.ts 的 categories */
    category: z.string(),
    /** 难度 key：intro | core | deep */
    level: z.enum(["intro", "core", "deep"]).default("intro"),
    /** 封面主题色（hex），用于程序化封面渐变 */
    hue: z.string().default("#2F6B4F"),
    /** 封面辅助色（hex） */
    hue2: z.string().default("#8FBF9F"),
    /** 状态：ongoing 连载 | done 完结 | paused 暂停 */
    status: z.enum(["ongoing", "done", "paused"]).default("ongoing"),
    /**
     * 分卷规划：name 为卷名，slugPrefix 支持两种写法：
     * 前缀匹配（如 "0" 匹配 00-xx、01-xx …）或区间匹配（"5-11" 匹配第 5 到第 11 章）。
     * 目录页按 phases 顺序分组展示。
     */
    phases: z
      .array(
        z.object({
          name: z.string(),
          slugPrefix: z.string(),
        })
      )
      .default([]),
    /** 书架排序，小的在前 */
    order: z.number().default(100),
    /** 草稿（true 则全站不显示、不构建页面） */
    draft: z.boolean().default(false),
  }),
});

const chapters = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!**/_*.md"],
    base: "./content/series",
  }),
  schema: z.object({
    title: z.string(),
    summary: z.string().default(""),
    /** 本讲学习目标（阅读页顶部展示） */
    objectives: z.array(z.string()).default([]),
    /** 要点回顾（章末小结） */
    keyPoints: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    /** 预计阅读分钟数；缺省时按正文字数自动估算 */
    minutes: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

const prompts = defineCollection({
  loader: glob({ pattern: "*.md", base: "./prompts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

/**
 * 独立文章：不属于任何系列的单篇 markdown（content/posts/ 下）
 * 适合：读书笔记、随笔、单篇技术备忘、快速上手指南等
 */
const posts = defineCollection({
  loader: glob({ pattern: ["*.md", "!_*.md"], base: "./content/posts" }),
  schema: z.object({
    title: z.string(),
    summary: z.string().default(""),
    date: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** 分类 key，同 site.config.ts 的 categories */
    category: z.string().default("ai"),
    minutes: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { seriesMeta, chapters, prompts, posts };
