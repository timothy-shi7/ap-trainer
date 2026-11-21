import { bumpStreak, dayDiff, localDateKey } from '../src/lib/streak.ts';
import { schedule, BOX_INTERVALS_DAYS } from '../src/lib/leitner.ts';

let failures = 0;
function eq(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`FAIL ${name}: got ${a}, expected ${e}`);
    failures += 1;
  } else {
    console.log(`ok   ${name}`);
  }
}

// dayDiff
eq('dayDiff same', dayDiff('2026-03-01', '2026-03-01'), 0);
eq('dayDiff next', dayDiff('2026-03-01', '2026-03-02'), 1);
eq('dayDiff gap2', dayDiff('2026-03-01', '2026-03-03'), 2);
// DST spring forward (US 2026-03-08)
eq('dayDiff across DST', dayDiff('2026-03-07', '2026-03-09'), 2);

// streak: first sprint
let s = { current: 0, best: 0, lastSprintDate: null, shieldAvailable: true };
s = bumpStreak(s, '2026-03-01');
eq('first sprint', s, { current: 1, best: 1, lastSprintDate: '2026-03-01', shieldAvailable: true });

// same day no change
eq('same day', bumpStreak(s, '2026-03-01'), s);

// consecutive -> +1, shield recharged
s = bumpStreak(s, '2026-03-02');
eq('consecutive', s, { current: 2, best: 2, lastSprintDate: '2026-03-02', shieldAvailable: true });

// skip one day (2 days ago) with shield -> +1, consume shield
s = bumpStreak(s, '2026-03-04');
eq('shield consumed', s, { current: 3, best: 3, lastSprintDate: '2026-03-04', shieldAvailable: false });

// next day still +1 and recharge
s = bumpStreak(s, '2026-03-05');
eq('recharge after consume', s, { current: 4, best: 4, lastSprintDate: '2026-03-05', shieldAvailable: true });

// skip 2 days again with shield -> +1 consume
s = bumpStreak(s, '2026-03-07');
eq('shield consume again', s, { current: 5, best: 5, lastSprintDate: '2026-03-07', shieldAvailable: false });

// skip 2 more days (3 total gap) without shield -> reset
s = bumpStreak(s, '2026-03-10');
eq('reset after double skip', s, { current: 1, best: 5, lastSprintDate: '2026-03-10', shieldAvailable: true });

// leap-year day math
eq('dayDiff leap', dayDiff('2024-02-28', '2024-03-01'), 2);

// leitner schedule
eq('schedule correct from box1', schedule(1, true, 0), { boxLevel: 2, nextReview: BOX_INTERVALS_DAYS[1] * 86400000 });
eq('schedule correct from box4', schedule(4, true, 0), { boxLevel: 4, nextReview: BOX_INTERVALS_DAYS[3] * 86400000 });
eq('schedule incorrect', schedule(3, false, 1000), { boxLevel: 1, nextReview: 1000 + 600000 });
eq('schedule correct from box3', schedule(3, true, 0), { boxLevel: 4, nextReview: BOX_INTERVALS_DAYS[3] * 86400000 });

console.log(localDateKey(new Date(2026, 2, 5)) === '2026-03-05' ? 'ok   localDateKey' : 'FAIL localDateKey');

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll streak/leitner checks passed.');