import {
  AVAILABLE_CHAPTERS,
  CHAPTERS,
  PRACTICE_QUESTIONS,
  QUESTIONS,
} from './questions';
import { nextMastery } from './leitner';
import { bumpStreak, localDateKey, type StreakState } from './streak';
import {
  MAX_CHAPTER,
  type LastResult,
  type MasteryLevel,
  type PracticeQuestion,
  type Question,
  type QuestionState,
} from '../types';

export const STORAGE_KEY = 'apc_progress_v2';
export const PROGRESS_VERSION = 2 as const;
export const DEFAULT_SPRINT_SIZE = 5;
export const MIN_SPRINT_SIZE = 1;
export const MAX_SPRINT_SIZE = 10;

/** Unlock rule: latest-attempt accuracy threshold. */
export const UNLOCK_ACCURACY = 0.8;

export interface ProgressV2 {
  version: 2;
  streak: StreakState;
  /** Highest chapter the user may access (1..MAX_CHAPTER). Default 1. */
  highestUnlockedChapter: number;
  /** IDs of info cards the user has acknowledged. */
  seenInfo: string[];
  questionProgress: Record<string, QuestionState>;
}

/** Highest chapter that actually has questions in the bank. */
export const MAX_AVAILABLE_CHAPTER: number = AVAILABLE_CHAPTERS.length
  ? AVAILABLE_CHAPTERS[AVAILABLE_CHAPTERS.length - 1]
  : 1;

export function emptyProgress(): ProgressV2 {
  return {
    version: PROGRESS_VERSION,
    streak: {
      current: 0,
      best: 0,
      lastSprintDate: null,
      shieldAvailable: true,
    },
    highestUnlockedChapter: 1,
    seenInfo: [],
    questionProgress: {},
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function clampChapter(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return Math.min(MAX_CHAPTER, Math.max(1, Math.round(v)));
}

function normalizeLastResult(v: unknown): LastResult {
  return v === 'incorrect' || v === 'correct' ? v : 'unseen';
}

function normalizeMasteryLevel(v: unknown): MasteryLevel {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.min(3, Math.max(0, Math.round(v))) as MasteryLevel;
}

function normalizeTimestamp(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
}

function normalizeQuestionState(v: unknown): QuestionState | null {
  if (!isRecord(v)) return null;
  return {
    lastResult: normalizeLastResult(v.lastResult),
    masteryLevel: normalizeMasteryLevel(v.masteryLevel),
    lastAttemptAt: normalizeTimestamp(v.lastAttemptAt),
    nextReviewAt: normalizeTimestamp(v.nextReviewAt),
  };
}

interface LegacyQuestionEntry {
  boxLevel?: unknown;
  nextReview?: unknown;
  attempts?: unknown;
  correct?: unknown;
}

/** Convert a v1 question entry into a v2 QuestionState (or null if unseen). */
function migrateLegacyEntry(v: unknown): QuestionState | null {
  if (!isRecord(v)) return null;
  const e = v as LegacyQuestionEntry;
  const attempts = typeof e.attempts === 'number' ? e.attempts : 0;
  const correct = typeof e.correct === 'number' ? e.correct : 0;
  const now = Date.now();
  if (attempts > 0 && correct > 0) {
    return {
      lastResult: 'correct',
      masteryLevel: 1,
      lastAttemptAt: now,
      nextReviewAt: now,
    };
  }
  if (attempts > 0 && correct === 0) {
    return {
      lastResult: 'incorrect',
      masteryLevel: 0,
      lastAttemptAt: now,
      nextReviewAt: now,
    };
  }
  return null;
}

function parseStreak(raw: unknown): StreakState {
  const streakRaw = isRecord(raw) ? raw : {};
  const lastSprintDate =
    typeof streakRaw.lastSprintDate === 'string' ? streakRaw.lastSprintDate : null;
  return {
    current:
      typeof streakRaw.current === 'number' && streakRaw.current >= 0
        ? Math.round(streakRaw.current)
        : 0,
    best:
      typeof streakRaw.best === 'number' && streakRaw.best >= 0
        ? Math.round(streakRaw.best)
        : 0,
    lastSprintDate,
    shieldAvailable: streakRaw.shieldAvailable !== false,
  };
}

function parseSeenInfo(raw: unknown): string[] {
  const seenInfo: string[] = [];
  if (Array.isArray(raw)) {
    for (const id of raw) {
      if (typeof id === 'string' && !seenInfo.includes(id)) seenInfo.push(id);
    }
  }
  return seenInfo;
}

/** Validate + normalize an unknown blob into ProgressV2, or null if unusable. */
export function parseProgress(raw: unknown): ProgressV2 | null {
  if (!isRecord(raw)) return null;

  const questionProgress: Record<string, QuestionState> = {};
  let streak: StreakState;
  let highestUnlockedChapter: number;
  let seenInfo: string[];

  if (raw.version === 2) {
    streak = parseStreak(raw.streak);
    highestUnlockedChapter =
      typeof raw.highestUnlockedChapter === 'number'
        ? clampChapter(raw.highestUnlockedChapter)
        : 1;
    seenInfo = parseSeenInfo(raw.seenInfo);
    if (isRecord(raw.questionProgress)) {
      for (const [id, entry] of Object.entries(raw.questionProgress)) {
        const norm = normalizeQuestionState(entry);
        if (norm) questionProgress[id] = norm;
      }
    }
  } else if (raw.version === 1) {
    // Migrate a v1 Leitner blob: attempts/correct → latest-attempt mastery.
    streak = parseStreak(raw.streak);
    highestUnlockedChapter =
      typeof raw.highestUnlockedChapter === 'number'
        ? clampChapter(raw.highestUnlockedChapter)
        : 1;
    seenInfo = parseSeenInfo(raw.seenInfo);
    if (isRecord(raw.questions)) {
      for (const [id, entry] of Object.entries(raw.questions)) {
        const migrated = migrateLegacyEntry(entry);
        if (migrated) questionProgress[id] = migrated;
      }
    }
  } else {
    return null;
  }

  return {
    version: PROGRESS_VERSION,
    streak,
    highestUnlockedChapter,
    seenInfo,
    questionProgress,
  };
}

export function loadProgress(): ProgressV2 {
  if (typeof localStorage === 'undefined') return emptyProgress();
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return emptyProgress();
    const parsed = parseProgress(JSON.parse(text));
    return parsed ?? emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: ProgressV2): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // storage may be full or disabled; ignore
  }
}

/* ------------------------------------------------------------------ */
/* Chapter statistics                                                  */
/* ------------------------------------------------------------------ */

export interface ChapterStat {
  chapter: number;
  title: string;
  /** Total non-info questions in the bank for this chapter. */
  total: number;
  /** Questions whose latest result is correct. */
  latestCorrect: number;
  /** latestCorrect / total, 0 when total is 0. */
  accuracy: number;
  /** Count of questions at mastery level 1 (Familiar). */
  familiar: number;
  /** Count of questions at mastery level 2 (Proficient). */
  proficient: number;
  /** Count of questions at mastery level 3 (Mastered). */
  mastered: number;
  /** Count of questions at mastery level 0 (Attempted, not yet familiar). */
  attempted: number;
  unlocked: boolean;
  /** mastered === total && total > 0. */
  allMastered: boolean;
}

/** Per-chapter aggregate stats over practice questions only. */
export function getChapterStats(p: ProgressV2): ChapterStat[] {
  return CHAPTERS.map((meta) => {
    let latestCorrect = 0;
    let familiar = 0;
    let proficient = 0;
    let mastered = 0;
    let attempted = 0;
    for (const q of PRACTICE_QUESTIONS) {
      if (q.chapter !== meta.chapter) continue;
      const entry = p.questionProgress[q.id];
      if (entry && entry.lastResult === 'correct') latestCorrect += 1;
      const level = entry?.masteryLevel ?? 0;
      if (level === 1) familiar += 1;
      else if (level === 2) proficient += 1;
      else if (level === 3) mastered += 1;
      else attempted += 1;
    }
    const total = meta.count;
    return {
      chapter: meta.chapter,
      title: meta.title,
      total,
      latestCorrect,
      accuracy: total > 0 ? latestCorrect / total : 0,
      familiar,
      proficient,
      mastered,
      attempted,
      unlocked: meta.chapter <= p.highestUnlockedChapter,
      allMastered: total > 0 && mastered === total,
    };
  });
}

/** Number of unseen info cards in a chapter. */
export function unseenInfoCount(p: ProgressV2, chapter: number): number {
  const seen = new Set(p.seenInfo);
  let n = 0;
  for (const q of QUESTIONS) {
    if (q.chapter === chapter && q.type === 'info' && !seen.has(q.id)) n += 1;
  }
  return n;
}

function chapterMeetsUnlock(stat: ChapterStat): boolean {
  return stat.total > 0 && stat.latestCorrect / stat.total >= UNLOCK_ACCURACY;
}

/**
 * Advance `highestUnlockedChapter` while the current frontier chapter meets
 * the unlock criteria. Returns the (possibly unchanged) chapter number.
 */
export function evaluateUnlocks(p: ProgressV2): number {
  const stats = getChapterStats(p);
  const byChapter = new Map(stats.map((s) => [s.chapter, s]));
  let unlocked = clampChapter(p.highestUnlockedChapter);

  // Advance the frontier while it is satisfied and a next chapter exists.
  for (let guard = 0; guard <= MAX_CHAPTER; guard += 1) {
    if (unlocked >= MAX_AVAILABLE_CHAPTER) break;
    const stat = byChapter.get(unlocked);
    if (!stat || !chapterMeetsUnlock(stat)) break;
    unlocked += 1;
  }
  return unlocked;
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export function recordAttempt(
  p: ProgressV2,
  id: string,
  correct: boolean,
  now: number = Date.now(),
  alreadyCorrectInSprint: boolean = false,
): ProgressV2 {
  const existing = p.questionProgress[id];
  const entry = nextMastery(existing, correct, now, alreadyCorrectInSprint);
  const withQuestion: ProgressV2 = {
    ...p,
    questionProgress: { ...p.questionProgress, [id]: entry },
  };
  const highestUnlockedChapter = evaluateUnlocks(withQuestion);
  if (highestUnlockedChapter === withQuestion.highestUnlockedChapter) {
    return withQuestion;
  }
  return { ...withQuestion, highestUnlockedChapter };
}

export function completeSprintIfNeeded(
  p: ProgressV2,
  todayKey: string = localDateKey(),
): ProgressV2 {
  const withStreak: ProgressV2 = { ...p, streak: bumpStreak(p.streak, todayKey) };
  const highestUnlockedChapter = evaluateUnlocks(withStreak);
  if (highestUnlockedChapter === withStreak.highestUnlockedChapter) {
    return withStreak;
  }
  return { ...withStreak, highestUnlockedChapter };
}

/** Unlock a specific chapter early (clamped to available range). */
export function unlockChapter(p: ProgressV2, chapter: number): ProgressV2 {
  const target = Math.min(MAX_AVAILABLE_CHAPTER, Math.max(1, Math.round(chapter)));
  if (target <= p.highestUnlockedChapter) return p;
  return { ...p, highestUnlockedChapter: target };
}

/** Count of practice questions the user can currently access. */
export function unlockedQuestionCount(
  p: ProgressV2,
  questions: readonly Question[] = QUESTIONS,
): number {
  let n = 0;
  for (const q of questions) {
    if (q.chapter <= p.highestUnlockedChapter && q.type !== 'info') n += 1;
  }
  return n;
}

/** Mark an info card as seen (idempotent). */
export function markInfoSeen(p: ProgressV2, id: string): ProgressV2 {
  if (p.seenInfo.includes(id)) return p;
  return { ...p, seenInfo: [...p.seenInfo, id] };
}

/** Mark several info cards as seen at once (idempotent). */
export function markInfoSeenMany(p: ProgressV2, ids: string[]): ProgressV2 {
  const set = new Set(p.seenInfo);
  let changed = false;
  for (const id of ids) {
    if (!set.has(id)) {
      set.add(id);
      changed = true;
    }
  }
  if (!changed) return p;
  return { ...p, seenInfo: Array.from(set) };
}

/* ------------------------------------------------------------------ */
/* Sprint generation                                                   */
/* ------------------------------------------------------------------ */

interface Meta {
  q: PracticeQuestion;
  entry: QuestionState | undefined;
  lastResult: LastResult;
  masteryLevel: MasteryLevel;
  lastAttemptAt: number;
  nextReviewAt: number;
  unseen: boolean;
}

function metaOf(p: ProgressV2, q: PracticeQuestion): Meta {
  const entry = p.questionProgress[q.id];
  return {
    q,
    entry,
    lastResult: entry?.lastResult ?? 'unseen',
    masteryLevel: entry?.masteryLevel ?? 0,
    lastAttemptAt: entry?.lastAttemptAt ?? 0,
    nextReviewAt: entry?.nextReviewAt ?? 0,
    unseen: !entry || entry.lastResult === 'unseen',
  };
}

function byId(a: Meta, b: Meta): number {
  return a.q.id < b.q.id ? -1 : a.q.id > b.q.id ? 1 : 0;
}

export interface SprintOptions {
  /** Number of practice questions to draw (default DEFAULT_SPRINT_SIZE). */
  size?: number;
  /** Restrict to these chapters (must be <= frontier). Default: all unlocked. */
  chapters?: number[];
}

/**
 * Build a sprint using 3-tier priority within the allowed chapters:
 * 1. Incorrect in the active chapter (oldest attempt first).
 * 2. Unseen in the active chapter.
 * 3. Due reviews (masteryLevel < 3), earliest nextReviewAt.
 * Remaining slots fill due-first, then by nextReviewAt, lower mastery, id.
 */
export function getSprintQueue(
  p: ProgressV2,
  now: number = Date.now(),
  options: SprintOptions = {},
): PracticeQuestion[] {
  const frontier = clampChapter(p.highestUnlockedChapter);
  const size = Math.max(
    MIN_SPRINT_SIZE,
    Math.min(MAX_SPRINT_SIZE, Math.round(options.size ?? DEFAULT_SPRINT_SIZE)),
  );
  const allowed =
    options.chapters && options.chapters.length > 0
      ? new Set(options.chapters.filter((c) => c <= frontier))
      : null;

  const unlocked = PRACTICE_QUESTIONS.filter(
    (q) => q.chapter <= frontier && (!allowed || allowed.has(q.chapter)),
  );
  const target = Math.min(size, unlocked.length);
  if (target === 0) return [];

  // Active chapter = frontier (or the selected set for chapter review).
  const activeChapters = allowed
    ? new Set(allowed)
    : new Set<number>([frontier]);

  const chosen: PracticeQuestion[] = [];
  const usedIds = new Set<string>();
  const push = (q: PracticeQuestion | undefined) => {
    if (!q || usedIds.has(q.id) || chosen.length >= target) return;
    usedIds.add(q.id);
    chosen.push(q);
  };

  const metas = unlocked.map((q) => metaOf(p, q));

  // Tier 1: incorrect in active chapter, oldest lastAttemptAt first.
  const tier1 = metas
    .filter((m) => activeChapters.has(m.q.chapter) && m.lastResult === 'incorrect')
    .sort((a, b) => {
      if (a.lastAttemptAt !== b.lastAttemptAt) return a.lastAttemptAt - b.lastAttemptAt;
      return byId(a, b);
    });
  for (const m of tier1) {
    if (chosen.length >= target) break;
    push(m.q);
  }

  // Tier 2: unseen in active chapter.
  const tier2 = metas
    .filter((m) => activeChapters.has(m.q.chapter) && m.unseen)
    .sort(byId);
  for (const m of tier2) {
    if (chosen.length >= target) break;
    push(m.q);
  }

  // Tier 3: due (nextReviewAt <= now) with masteryLevel < 3, earliest due first.
  const tier3 = metas
    .filter((m) => !m.unseen && m.nextReviewAt <= now && m.masteryLevel < 3)
    .sort((a, b) => {
      if (a.nextReviewAt !== b.nextReviewAt) return a.nextReviewAt - b.nextReviewAt;
      return byId(a, b);
    });
  for (const m of tier3) {
    if (chosen.length >= target) break;
    push(m.q);
  }

  // Fill remaining slots: due-first across allowed chapters.
  if (chosen.length < target) {
    const fill = metas
      .filter((m) => !usedIds.has(m.q.id))
      .sort((a, b) => {
        const ad = a.nextReviewAt <= now ? 0 : 1;
        const bd = b.nextReviewAt <= now ? 0 : 1;
        if (ad !== bd) return ad - bd;
        if (a.nextReviewAt !== b.nextReviewAt) return a.nextReviewAt - b.nextReviewAt;
        if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel;
        return byId(a, b);
      });
    for (const m of fill) {
      if (chosen.length >= target) break;
      push(m.q);
    }
  }

  return chosen.slice(0, target);
}

/**
 * Build a review sprint restricted to a set of chapters (no frontier weighting),
 * drawing due-first across the selected chapters. Used by chapter review.
 */
export function getChapterReviewQueue(
  p: ProgressV2,
  chapters: number[],
  size: number,
  now: number = Date.now(),
): PracticeQuestion[] {
  return getSprintQueue(p, now, { size, chapters });
}