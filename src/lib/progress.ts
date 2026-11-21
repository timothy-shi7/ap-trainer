import { QUESTIONS } from './questions';
import { schedule } from './leitner';
import { bumpStreak, localDateKey, type StreakState } from './streak';
import { UNITS, type Question, type UnitName } from '../types';

export const STORAGE_KEY = 'apc_progress_v1';
export const PROGRESS_VERSION = 1 as const;
export const SPRINT_SIZE = 5;

export interface QuestionProgress {
  boxLevel: number;
  nextReview: number; // epoch ms; 0 = due now / unseen
  attempts: number;
  correct: number;
}

export interface ProgressV1 {
  version: 1;
  streak: StreakState;
  questions: Record<string, QuestionProgress>;
}

export function emptyProgress(): ProgressV1 {
  return {
    version: PROGRESS_VERSION,
    streak: {
      current: 0,
      best: 0,
      lastSprintDate: null,
      shieldAvailable: true,
    },
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

  const questions: Record<string, QuestionProgress> = {};
  if (isRecord(raw.questions)) {
    for (const [id, entry] of Object.entries(raw.questions)) {
      const norm = normalizeQuestionEntry(entry);
      if (norm) questions[id] = norm;
    }
  }

  return { version: PROGRESS_VERSION, streak, questions };
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
  return {
    ...p,
    questions: { ...p.questions, [id]: entry },
  };
}

export function completeSprintIfNeeded(
  p: ProgressV1,
  todayKey: string = localDateKey(),
): ProgressV1 {
  return { ...p, streak: bumpStreak(p.streak, todayKey) };
}

export interface UnitStat {
  attempts: number;
  correct: number;
  accuracy: number; // 0..1
}

export function getUnitStats(p: ProgressV1): Record<UnitName, UnitStat> {
  const totals = new Map<UnitName, { attempts: number; correct: number }>();
  for (const unit of UNITS) totals.set(unit, { attempts: 0, correct: 0 });

  for (const q of QUESTIONS) {
    const entry = p.questions[q.id];
    const t = totals.get(q.unit);
    if (!t || !entry) continue;
    t.attempts += entry.attempts;
    t.correct += entry.correct;
  }

  const out = {} as Record<UnitName, UnitStat>;
  for (const unit of UNITS) {
    const t = totals.get(unit)!;
    out[unit] = {
      attempts: t.attempts,
      correct: t.correct,
      accuracy: t.attempts > 0 ? t.correct / t.attempts : 0,
    };
  }
  return out;
}

/**
 * Build a unique sprint queue: due questions first (Leitner priority),
 * then fill with not-yet-due questions so the sprint reaches min(5, bank).
 */
export function getDueQueue(
  p: ProgressV1,
  questions: Question[] = QUESTIONS,
  now: number = Date.now(),
): Question[] {
  const withMeta = questions.map((q) => {
    const entry = p.questions[q.id];
    return {
      q,
      nextReview: entry?.nextReview ?? 0,
      unseen: !entry,
      boxLevel: entry?.boxLevel ?? 1,
    };
  });

  const due = withMeta
    .filter((m) => m.nextReview <= now)
    .sort((a, b) => {
      if (a.nextReview !== b.nextReview) return a.nextReview - b.nextReview;
      if (a.unseen !== b.unseen) return a.unseen ? -1 : 1;
      if (a.boxLevel !== b.boxLevel) return a.boxLevel - b.boxLevel;
      return a.q.id < b.q.id ? -1 : a.q.id > b.q.id ? 1 : 0;
    })
    .map((m) => m.q);

  const notDue = withMeta
    .filter((m) => m.nextReview > now)
    .sort((a, b) => {
      if (a.nextReview !== b.nextReview) return a.nextReview - b.nextReview;
      return a.q.id < b.q.id ? -1 : a.q.id > b.q.id ? 1 : 0;
    })
    .map((m) => m.q);

  const target = Math.min(SPRINT_SIZE, questions.length);
  const ordered = [...due, ...notDue];

  const seen = new Set<string>();
  const queue: Question[] = [];
  for (const q of ordered) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    queue.push(q);
    if (queue.length >= target) break;
  }
  return queue;
}