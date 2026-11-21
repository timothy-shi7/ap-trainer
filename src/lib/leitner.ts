export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

/** Intervals in days indexed by box level 1..4. */
export const BOX_INTERVALS_DAYS = [1, 3, 7, 16] as const;

export const MAX_BOX = 4;
export const INCORRECT_BOX = 1;
export const INCORRECT_INTERVAL_MS = 10 * MINUTE_MS;

export interface ScheduleResult {
  boxLevel: number;
  nextReview: number;
}

/**
 * Compute the next Leitner schedule for a question.
 * - correct: advance one box (max 4), interval from the *new* box.
 * - incorrect: reset to box 1, review again in 10 minutes.
 */
export function schedule(
  oldBoxLevel: number,
  correct: boolean,
  now: number,
): ScheduleResult {
  if (correct) {
    const newBox = Math.min(MAX_BOX, Math.max(1, oldBoxLevel) + 1);
    const days = BOX_INTERVALS_DAYS[newBox - 1];
    return { boxLevel: newBox, nextReview: now + days * DAY_MS };
  }
  return {
    boxLevel: INCORRECT_BOX,
    nextReview: now + INCORRECT_INTERVAL_MS,
  };
}