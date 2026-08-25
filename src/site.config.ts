/**
 * 站点全局配置 —— 「拾阶 STEPWELL」
 * 改这里就能改全站的名称、口号、导航、分类体系。
 */
export const SITE = {
  /** 站点名（中文） */
  name: "拾阶",
  /** 站点名（英文/品牌字样） */
  nameEn: "STEPWELL",
  /** 口号 */
  motto: "每天向上一步",
  /** 长描述（SEO 用） */
  description:
    "拾阶是一个个人学习平台：把想学的知识做成一系列精读文章，一步一步深入学习。",
  /** 作者署名 */
  author: "拾阶",
  /** 语言 */
  lang: "zh-CN",

  /** 顶栏导航 */
  nav: [
    { label: "书房", href: "/" },
    { label: "书架", href: "/library/" },
    { label: "文章", href: "/posts/" },
    { label: "看板", href: "/dashboard/" },
    { label: "订阅", href: "/feeds/" },
    { label: "提示词", href: "/prompts/" },
    { label: "关于", href: "/about/" },
  ],

  /**
   * 内容分类体系。
   * series 元卡里的 category 字段必须取自这里的 key。
   * 想加新分类：在这里加一行即可，书架页会自动出现对应筛选按钮。
   */
  categories: {
    ai: { label: "人工智能", emoji: "🤖" },
    source: { label: "源码精读", emoji: "🔬" },
    math: { label: "数学", emoji: "📐" },
    engineering: { label: "软件工程", emoji: "⚙️" },
    life: { label: "生活与思维", emoji: "🌿" },
  } as Record<string, { label: string; emoji: string }>,

  /** 难度等级 */
  levels: {
    intro: { label: "入门", desc: "不需要基础" },
    core: { label: "进阶", desc: "需要一些基础概念" },
    deep: { label: "硬核", desc: "深入实现细节" },
  } as Record<string, { label: string; desc: string }>,
} as const;

/** localStorage 键名统一管理，避免散落各处 */
export const STORAGE_KEYS = {
  progress: "stepwell.progress.v1",
  activity: "stepwell.activity.v1",
  settings: "stepwell.settings.v1",
} as const;
