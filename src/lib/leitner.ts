import type { MasteryLevel, QuestionState } from '../types';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

/** Highest mastery level (3 = Mastered). */
export const MASTERY_MAX = 3;

/** Review intervals (ms) indexed by mastery level 1..3. */
export const MASTERY_INTERVALS_MS: Record<1 | 2 | 3, number> = {
  1: 12 * 60 * 60 * 1000, // Familiar: +12h
  2: 3 * DAY_MS, // Proficient: +3d
  3: 10 * DAY_MS, // Mastered: +10d
};

/** Interval for a mastery level (level 0 is treated as level 1). */
export function intervalForLevel(level: MasteryLevel): number {
  return MASTERY_INTERVALS_MS[Math.max(1, level) as 1 | 2 | 3];
}

/**
 * Compute the next mastery state for a question after an attempt.
 * - correct: advance one level (unless already correct this sprint), due in the new interval.
 * - incorrect: drop one level, due immediately.
 */
export function nextMastery(
  prev: QuestionState | undefined,
  correct: boolean,
  now: number,
  alreadyCorrectInSprint: boolean,
): QuestionState {
  const prevLevel: MasteryLevel = prev?.masteryLevel ?? 0;
  if (correct) {
    let level: MasteryLevel = alreadyCorrectInSprint
      ? prevLevel
      : (Math.min(MASTERY_MAX, prevLevel + 1) as MasteryLevel);
    if (level === 0) level = 1;
    return {
      lastResult: 'correct',
      masteryLevel: level,
      lastAttemptAt: now,
      nextReviewAt: now + intervalForLevel(level),
    };
  }
  const level: MasteryLevel = Math.max(0, prevLevel - 1) as MasteryLevel;
  return {
    lastResult: 'incorrect',
    masteryLevel: level,
    lastAttemptAt: now,
    nextReviewAt: now,
  };
}