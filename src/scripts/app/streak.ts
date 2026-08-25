/**
 * 学习活动记录与连续天数（streak）
 * 活动数据 = 每日读完的章节数；由 reader.ts 在标记完成时调用 recordCompletion()。
 */
import { bumpActivity, loadActivity } from "./storage";

/** 本地时区的 YYYY-MM-DD */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 完成一章：当日活动 +1 */
export function recordCompletion(): void {
  bumpActivity(todayISO());
}

/** 连续学习天数：从今天（或昨天）往前数有活动的天数 */
export function currentStreak(): number {
  const map = loadActivity();
  let streak = 0;
  const d = new Date();
  // 今天还没有活动不打断连续（以昨天为起点起算）
  if (!map[todayISO(d)]) d.setDate(d.getDate() - 1);
  for (;;) {
    const iso = todayISO(d);
    if (map[iso] && map[iso] > 0) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

/** 累计读完章节数 */
export function totalCompleted(): number {
  return Object.values(loadActivity()).reduce((n, v) => n + v, 0);
}
