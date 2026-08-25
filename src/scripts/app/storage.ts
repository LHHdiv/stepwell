/**
 * 存储适配层 —— 全站客户端数据的唯一出入口
 *
 * 第一期：数据全部存 localStorage（本地模式）。
 * 第二期接腾讯云后端时：只需在这里把 read/write 换成「localStorage + 远程同步」，
 * 其余代码零改动。这就是规划里说的"后端接缝"。
 */

const PREFIX = "stepwell";

function key(k: string): string {
  return `${PREFIX}.${k}`;
}

export function readJSON<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(k));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(k: string, value: T): void {
  try {
    localStorage.setItem(key(k), JSON.stringify(value));
  } catch {
    /* 隐私模式等场景下写入失败，静默降级为不持久化 */
  }
}

/* ---------- 阅读进度 ---------- */

export interface ProgressEntry {
  /** 最后阅读时间（epoch ms） */
  at: number;
  /** 是否已读完 */
  done: boolean;
  /** 最近一次记录的滚动百分比 */
  pct: number;
}

export type ProgressMap = Record<string, ProgressEntry>;

export function loadProgress(): ProgressMap {
  return readJSON<ProgressMap>("progress.v1", {});
}

export function saveProgress(map: ProgressMap): void {
  writeJSON("progress.v1", map);
}

/** 记录/更新某章进度。chapterKey 形如 "deepseek-harness/00-intro" */
export function trackProgress(chapterKey: string, pct: number, done?: boolean): ProgressEntry {
  const map = loadProgress();
  const prev = map[chapterKey];
  const entry: ProgressEntry = {
    at: Date.now(),
    pct: Math.max(prev?.pct ?? 0, Math.round(pct)),
    done: done ?? prev?.done ?? false,
  };
  map[chapterKey] = entry;
  saveProgress(map);
  return entry;
}

/* ---------- 学习活动（看板热力图/连续天数）---------- */

/** date → 当日完成章节数，date 为 YYYY-MM-DD */
export type ActivityMap = Record<string, number>;

export function loadActivity(): ActivityMap {
  return readJSON<ActivityMap>("activity.v1", {});
}

/** 今天又读完一章：活动 +1 并返回最新表 */
export function bumpActivity(dateISO: string): ActivityMap {
  const map = loadActivity();
  map[dateISO] = (map[dateISO] ?? 0) + 1;
  writeJSON("activity.v1", map);
  return map;
}

/* ---------- 设置（主题 / 字号）---------- */

export interface Settings {
  theme: "light" | "dark" | "auto";
  fs: "s" | "m" | "l";
}

export function loadSettings(): Settings {
  return readJSON<Settings>("settings.v1", { theme: "auto", fs: "m" });
}

export function saveSettings(s: Settings): void {
  writeJSON("settings.v1", s);
}
