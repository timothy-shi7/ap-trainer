import {
  emptyProgress,
  markInfoSeen,
  markInfoSeenMany,
  parseProgress,
  unseenInfoCount,
  getChapterStats,
} from '../src/lib/progress.ts';
import {
  infoForChapter,
  practiceForChapter,
  CHAPTERS,
  PRACTICE_QUESTIONS,
  QUESTIONS,
} from '../src/lib/questions.ts';
import { parseBackup, serializeBackup } from '../src/lib/backup.ts';
import { clampSprintLength, defaultSettings } from '../src/lib/settings.ts';

let failures = 0;
function assert(name, cond, extra) {
  if (!cond) {
    console.error(`FAIL ${name}${extra ? ' :: ' + extra : ''}`);
    failures += 1;
  } else {
    console.log(`ok   ${name}`);
  }
}

// ---- Info cards present in every chapter ----
for (const c of CHAPTERS) {
  const info = infoForChapter(c.chapter);
  assert(`chapter ${c.chapter} has info cards`, info.length >= 1, `got ${info.length}`);
  for (const card of info) {
    assert(
      `  ${card.id} has required fields`,
      typeof card.title === 'string' &&
        typeof card.formulaLatex === 'string' &&
        Array.isArray(card.bulletsLatex) &&
        card.bulletsLatex.length >= 1 &&
        typeof card.trapLatex === 'string',
    );
  }
}

// ---- Info cards never appear in practice pool ----
assert(
  'no info cards in PRACTICE_QUESTIONS',
  PRACTICE_QUESTIONS.every((q) => q.type !== 'info'),
);
assert(
  'practiceForChapter excludes info',
  practiceForChapter(1).every((q) => q.type !== 'info'),
);
assert(
  'QUESTIONS = practice + info',
  QUESTIONS.length === PRACTICE_QUESTIONS.length + QUESTIONS.filter((q) => q.type === 'info').length,
);

// ---- seenInfo tracking ----
let p = emptyProgress();
const ch1Info = infoForChapter(1);
assert('chapter 1 starts with unseen info', unseenInfoCount(p, 1) === ch1Info.length, `got ${unseenInfoCount(p, 1)}`);

p = markInfoSeen(p, ch1Info[0].id);
assert('markInfoSeen decrements unseen', unseenInfoCount(p, 1) === ch1Info.length - 1);
assert('markInfoSeen is idempotent', markInfoSeen(p, ch1Info[0].id).seenInfo.length === p.seenInfo.length);

p = markInfoSeenMany(p, [ch1Info[1].id, ch1Info[0].id]);
assert('markInfoSeenMany marks all', unseenInfoCount(p, 1) === 0);

// ---- seenInfo round-trips through parseProgress ----
const round = parseProgress(JSON.parse(JSON.stringify(p)));
assert('seenInfo persists through parse', round && round.seenInfo.length === 2);

// ---- Missing seenInfo defaults to [] (older payloads) ----
const legacy = parseProgress({ version: 1, streak: {}, questions: {} });
assert('legacy payload gets empty seenInfo', legacy && Array.isArray(legacy.seenInfo) && legacy.seenInfo.length === 0);

// ---- Backup round-trip ----
const settings = { sprintLength: 7 };
const backupStr = serializeBackup(p, settings);
const parsed = parseBackup(backupStr);
assert('backup parses', !!parsed);
assert('backup preserves seenInfo', parsed && parsed.progress.seenInfo.length === 2);
assert('backup preserves settings', parsed && parsed.settings.sprintLength === 7);

// ---- Backup accepts bare progress blob (forward-compat) ----
const bareBackup = parseBackup(JSON.stringify(p));
assert('bare progress blob parses as backup', !!bareBackup);

// ---- Invalid backup rejected ----
assert('garbage rejected', parseBackup('not json') === null);
assert('wrong version rejected', parseBackup(JSON.stringify({ version: 99 })) === null);

// ---- Sprint length clamp ----
assert('clamp min', clampSprintLength(0) === 1);
assert('clamp max', clampSprintLength(999) === 10);
assert('clamp normal', clampSprintLength(6) === 6);
assert('default settings', defaultSettings().sprintLength === 5);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll info/backup/settings checks passed.');