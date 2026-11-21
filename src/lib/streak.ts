export interface StreakState {
  current: number;
  best: number;
  lastSprintDate: string | null;
  shieldAvailable: boolean;
}

export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a local `YYYY-MM-DD` key into a Date at local midnight. */
export function parseLocalDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(year, month - 1, day);
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return null;
  }
  return dt;
}

/**
 * Whole-calendar-day difference between two local date keys.
 * Computed from midnight-normalized local components so DST does not break it.
 * Returns NaN when either key is invalid.
 */
export function dayDiff(fromKey: string, toKey: string): number {
  const a = parseLocalDateKey(fromKey);
  const b = parseLocalDateKey(toKey);
  if (!a || !b) return NaN;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / (24 * 60 * 60 * 1000));
}

/**
 * Apply a completed sprint for `todayKey` (local YYYY-MM-DD).
 * Rules:
 * - same day as last sprint: no change.
 * - exactly yesterday: extend streak, shield recharged (available).
 * - exactly 2 days ago AND shield available: extend streak, consume shield.
 * - otherwise: reset to 1, shield available.
 */
export function bumpStreak(streak: StreakState, todayKey: string): StreakState {
  const { lastSprintDate } = streak;

  if (lastSprintDate === todayKey) {
    return { ...streak };
  }

  let current: number;
  let shieldAvailable: boolean;

  if (lastSprintDate === null) {
    current = 1;
    shieldAvailable = true;
  } else {
    const diff = dayDiff(lastSprintDate, todayKey);
    if (diff === 1) {
      current = streak.current + 1;
      shieldAvailable = true;
    } else if (diff === 2 && streak.shieldAvailable) {
      current = streak.current + 1;
      shieldAvailable = false;
    } else {
      current = 1;
      shieldAvailable = true;
    }
  }

  const best = Math.max(streak.best, current);
  return { current, best, lastSprintDate: todayKey, shieldAvailable };
}