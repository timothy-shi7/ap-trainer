import {
  AVAILABLE_CHAPTERS,
  CHAPTERS,
  PRACTICE_QUESTIONS,
  QUESTIONS,
} from './questions';
import { schedule } from './leitner';
import { bumpStreak, localDateKey, type StreakState } from './streak';
import { MAX_CHAPTER, type PracticeQuestion, type Question } from '../types';

export const STORAGE_KEY = 'apc_progress_v1';
export const PROGRESS_VERSION = 1 as const;
export const DEFAULT_SPRINT_SIZE = 5;
export const MIN_SPRINT_SIZE = 1;
export const MAX_SPRINT_SIZE = 10;

/** Unlock rule thresholds. */
export const UNLOCK_MIN_UNIQUE = 10;
export const UNLOCK_MIN_ACCURACY = 0.75;

export interface QuestionProgress {
  boxLevel: number;
  nextReview: number; // epoch ms; 0 = due now/unseen
  attempts: number;
  correct: number;
}

export interface ProgressV1 {
  version: 1;
  streak: StreakState;
  /** Highest chapter the user may access (1..MAX_CHAPTER). Default 1. */
  highestUnlockedChapter: number;
  /** IDs of info cards the user has acknowledged. */
  seenInfo: string[];
  questions: Record<string, QuestionProgress>;
}

/** Highest chapter that actually has questions in the bank. */
export const MAX_AVAILABLE_CHAPTER: number = AVAILABLE_CHAPTERS.length
  ? AVAILABLE_CHAPTERS[AVAILABLE_CHAPTERS.length - 1]
  : 1;

export function emptyProgress(): ProgressV1 {
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
    questions: {},
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeQuestionEntry(v: unknown): QuestionProgress | null {
  if (!isRecord(v)) return null;
  const boxLevel = typeof v.boxLevel === 'number' ? v.boxLevel : 1;
  const nextReview = typeof v.nextReview === 'number' ? v.nextReview : 0;
  const attempts = typeof v.attempts === 'number' ? v.attempts : 0;
  const correct = typeof v.correct === 'number' ? v.correct : 0;
  if (!Number.isFinite(nextReview) || !Number.isFinite(attempts)) return null;
  return {
    boxLevel: Math.min(4, Math.max(1, Math.round(boxLevel))),
    nextReview,
    attempts: Math.max(0, Math.round(attempts)),
    correct: Math.max(0, Math.round(correct)),
  };
}

function clampChapter(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return Math.min(MAX_CHAPTER, Math.max(1, Math.round(v)));
}

/** Validate + normalize an unknown blob into ProgressV1, or null if unusable. */
export function parseProgress(raw: unknown): ProgressV1 | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== PROGRESS_VERSION) return null;

  const streakRaw = isRecord(raw.streak) ? raw.streak : {};
  const lastSprintDate =
    typeof streakRaw.lastSprintDate === 'string' ? streakRaw.lastSprintDate : null;
  const streak: StreakState = {
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

  // Missing field (older payload) defaults to chapter 1.
  const highestUnlockedChapter =
    typeof raw.highestUnlockedChapter === 'number'
      ? clampChapter(raw.highestUnlockedChapter)
      : 1;

  const seenInfo: string[] = [];
  if (Array.isArray(raw.seenInfo)) {
    for (const id of raw.seenInfo) {
      if (typeof id === 'string' && !seenInfo.includes(id)) seenInfo.push(id);
    }
  }

  const questions: Record<string, QuestionProgress> = {};
  if (isRecord(raw.questions)) {
    for (const [id, entry] of Object.entries(raw.questions)) {
      const norm = normalizeQuestionEntry(entry);
      if (norm) questions[id] = norm;
    }
  }

  return {
    version: PROGRESS_VERSION,
    streak,
    highestUnlockedChapter,
    seenInfo,
    questions,
  };
}

export function loadProgress(): ProgressV1 {
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

export function saveProgress(p: ProgressV1): void {
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
  /** Total questions in the bank for this chapter. */
  total: number;
  /** Distinct questions with at least one attempt. */
  uniqueAnswered: number;
  attempts: number;
  correct: number;
  /** correct / attempts, 0 when no attempts. */
  accuracy: number;
  unlocked: boolean;
}

/** Per-chapter aggregate stats over practice questions only. */
export function getChapterStats(p: ProgressV1): ChapterStat[] {
  return CHAPTERS.map((meta) => {
    let attempts = 0;
    let correct = 0;
    let uniqueAnswered = 0;
    for (const q of PRACTICE_QUESTIONS) {
      if (q.chapter !== meta.chapter) continue;
      const entry = p.questions[q.id];
      if (entry && entry.attempts > 0) {
        uniqueAnswered += 1;
        attempts += entry.attempts;
        correct += entry.correct;
      }
    }
    return {
      chapter: meta.chapter,
      title: meta.title,
      total: meta.count,
      uniqueAnswered,
      attempts,
      correct,
      accuracy: attempts > 0 ? correct / attempts : 0,
      unlocked: meta.chapter <= p.highestUnlockedChapter,
    };
  });
}

/** Number of unseen info cards in a chapter. */
export function unseenInfoCount(
  p: ProgressV1,
  chapter: number,
): number {
  const seen = new Set(p.seenInfo);
  let n = 0;
  for (const q of QUESTIONS) {
    if (q.chapter === chapter && q.type === 'info' && !seen.has(q.id)) n += 1;
  }
  return n;
}

function chapterMeetsUnlock(stat: ChapterStat): boolean {
  return (
    stat.uniqueAnswered >= UNLOCK_MIN_UNIQUE &&
    stat.attempts > 0 &&
    stat.accuracy >= UNLOCK_MIN_ACCURACY
  );
}

/**
 * Advance `highestUnlockedChapter` while the current frontier chapter meets
 * the unlock criteria. Returns the (possibly unchanged) chapter number.
 */
export function evaluateUnlocks(p: ProgressV1): number {
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
  p: ProgressV1,
  id: string,
  correct: boolean,
  now: number = Date.now(),
): ProgressV1 {
  const existing = p.questions[id];
  const oldBox = existing?.boxLevel ?? 1;
  const next = schedule(oldBox, correct, now);
  const entry: QuestionProgress = {
    boxLevel: next.boxLevel,
    nextReview: next.nextReview,
    attempts: (existing?.attempts ?? 0) + 1,
    correct: (existing?.correct ?? 0) + (correct ? 1 : 0),
  };
  const withQuestion: ProgressV1 = {
    ...p,
    questions: { ...p.questions, [id]: entry },
  };
  const highestUnlockedChapter = evaluateUnlocks(withQuestion);
  if (highestUnlockedChapter === withQuestion.highestUnlockedChapter) {
    return withQuestion;
  }
  return { ...withQuestion, highestUnlockedChapter };
}

export function completeSprintIfNeeded(
  p: ProgressV1,
  todayKey: string = localDateKey(),
): ProgressV1 {
  const withStreak: ProgressV1 = { ...p, streak: bumpStreak(p.streak, todayKey) };
  const highestUnlockedChapter = evaluateUnlocks(withStreak);
  if (highestUnlockedChapter === withStreak.highestUnlockedChapter) {
    return withStreak;
  }
  return { ...withStreak, highestUnlockedChapter };
}

/** Unlock a specific chapter early (clamped to available range). */
export function unlockChapter(p: ProgressV1, chapter: number): ProgressV1 {
  const target = Math.min(MAX_AVAILABLE_CHAPTER, Math.max(1, Math.round(chapter)));
  if (target <= p.highestUnlockedChapter) return p;
  return { ...p, highestUnlockedChapter: target };
}

/** Count of practice questions the user can currently access. */
export function unlockedQuestionCount(
  p: ProgressV1,
  questions: readonly Question[] = QUESTIONS,
): number {
  let n = 0;
  for (const q of questions) {
    if (q.chapter <= p.highestUnlockedChapter && q.type !== 'info') n += 1;
  }
  return n;
}

/** Mark an info card as seen (idempotent). */
export function markInfoSeen(p: ProgressV1, id: string): ProgressV1 {
  if (p.seenInfo.includes(id)) return p;
  return { ...p, seenInfo: [...p.seenInfo, id] };
}

/** Mark several info cards as seen at once (idempotent). */
export function markInfoSeenMany(p: ProgressV1, ids: string[]): ProgressV1 {
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
  entry: QuestionProgress | undefined;
  nextReview: number;
  unseen: boolean;
  boxLevel: number;
}

function metaOf(p: ProgressV1, q: PracticeQuestion): Meta {
  const entry = p.questions[q.id];
  return {
    q,
    entry,
    nextReview: entry?.nextReview ?? 0,
    unseen: !entry,
    boxLevel: entry?.boxLevel ?? 1,
  };
}

function byId(a: Meta, b: Meta): number {
  return a.q.id < b.q.id ? -1 : a.q.id > b.q.id ? 1 : 0;
}

function sortDueFirstFactory(now: number) {
  return (a: Meta, b: Meta): number => {
    const ad = a.nextReview <= now ? 0 : 1;
    const bd = b.nextReview <= now ? 0 : 1;
    if (ad !== bd) return ad - bd;
    if (a.nextReview !== b.nextReview) return a.nextReview - b.nextReview;
    if (a.unseen !== b.unseen) return a.unseen ? -1 : 1;
    if (a.boxLevel !== b.boxLevel) return a.boxLevel - b.boxLevel;
    return byId(a, b);
  };
}

export interface SprintOptions {
  /** Number of practice questions to draw (default DEFAULT_SPRINT_SIZE). */
  size?: number;
  /** Restrict to these chapters (must be <= frontier). Default: all unlocked. */
  chapters?: number[];
}

/**
 * Build a chapter-weighted sprint around the user's frontier:
 * - Cards 1-3: unseen or low-box (1-2) practice questions from the frontier.
 * - Card 4: a derivation_order question from the frontier (or previous).
 * - Card 5: an overdue review (nextReview <= now) from any unlocked chapter.
 * Remaining slots are filled due-first. Only practice questions are drawn;
 * info cards are handled separately by the player.
 */
export function getSprintQueue(
  p: ProgressV1,
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

  const chosen: PracticeQuestion[] = [];
  const usedIds = new Set<string>();
  const push = (q: PracticeQuestion | undefined) => {
    if (!q || usedIds.has(q.id) || chosen.length >= target) return;
    usedIds.add(q.id);
    chosen.push(q);
  };

  // Cards 1-3: unseen or low-box from the frontier chapter (if allowed).
  const frontierOk = !allowed || allowed.has(frontier);
  if (frontierOk) {
    const poolA = unlocked
      .filter((q) => q.chapter === frontier)
      .map((q) => metaOf(p, q))
      .filter((m) => m.unseen || m.boxLevel <= 2)
      .sort((a, b) => {
        if (a.unseen !== b.unseen) return a.unseen ? -1 : 1;
        if (a.boxLevel !== b.boxLevel) return a.boxLevel - b.boxLevel;
        if (a.nextReview !== b.nextReview) return a.nextReview - b.nextReview;
        return byId(a, b);
      });
    for (const m of poolA) {
      if (chosen.length >= 3) break;
      push(m.q);
    }
  }

  // Card 4: a derivation_order question from the frontier, else previous.
  const derivationPool = (chapter: number) =>
    unlocked
      .filter((q) => q.chapter === chapter && q.type === 'derivation_order')
      .map((q) => metaOf(p, q))
      .sort((a, b) => {
        if (a.unseen !== b.unseen) return a.unseen ? -1 : 1;
        if (a.boxLevel !== b.boxLevel) return a.boxLevel - b.boxLevel;
        if (a.nextReview !== b.nextReview) return a.nextReview - b.nextReview;
        return byId(a, b);
      });
  if (chosen.length < 4) {
    const card4 =
      (frontierOk ? derivationPool(frontier)[0]?.q : undefined) ??
      derivationPool(frontier - 1)[0]?.q ??
      derivationPool(1)[0]?.q;
    push(card4);
  }

  // Card 5: an overdue review from any allowed unlocked chapter.
  if (chosen.length < 5) {
    const overdue = unlocked
      .map((q) => metaOf(p, q))
      .filter((m) => !m.unseen && m.nextReview <= now)
      .sort((a, b) => {
        if (a.nextReview !== b.nextReview) return a.nextReview - b.nextReview;
        if (a.boxLevel !== b.boxLevel) return a.boxLevel - b.boxLevel;
        return byId(a, b);
      });
    push(overdue[0]?.q);
  }

  // Fill any remaining slots due-first.
  if (chosen.length < target) {
    const fill = unlocked
      .filter((q) => !usedIds.has(q.id))
      .map((q) => metaOf(p, q))
      .sort(sortDueFirstFactory(now));
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
  p: ProgressV1,
  chapters: number[],
  size: number,
  now: number = Date.now(),
): PracticeQuestion[] {
  return getSprintQueue(p, now, { size, chapters });
}