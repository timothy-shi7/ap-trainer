import {
  emptyProgress,
  recordAttempt,
  evaluateUnlocks,
  unlockChapter,
  getSprintQueue,
  getChapterStats,
  MAX_AVAILABLE_CHAPTER,
} from '../src/lib/progress.ts';
import { QUESTIONS, CHAPTERS, practiceForChapter, infoForChapter } from '../src/lib/questions.ts';

let failures = 0;
function assert(name, cond, extra) {
  if (!cond) {
    console.error(`FAIL ${name}${extra ? ' :: ' + extra : ''}`);
    failures += 1;
  } else {
    console.log(`ok   ${name}`);
  }
}

console.log('Chapters:', CHAPTERS.map((c) => `${c.chapter}:${c.count}`).join(', '));
console.log('Max available chapter:', MAX_AVAILABLE_CHAPTER);

assert('chapters present', CHAPTERS.length >= 2);
assert('default frontier is 1', emptyProgress().highestUnlockedChapter === 1);

// ---- Unlock logic: answer 10 unique chapter-1 questions at >=75% ----
let p = emptyProgress();
const ch1 = practiceForChapter(1);
assert('chapter 1 has >= 10 practice questions', ch1.length >= 10, `got ${ch1.length}`);

// Simulate 10 unique correct answers in chapter 1.
for (const q of ch1.slice(0, 10)) {
  p = recordAttempt(p, q.id, true, 1000);
}
assert('frontier advances to 2 after 10 correct', p.highestUnlockedChapter >= 2, `got ${p.highestUnlockedChapter}`);

// ---- Accuracy gate: 10 unique but accuracy never reaches 75% ----
let p2 = emptyProgress();
// 7 correct first (never 10 unique yet), then 3 wrong => at the 10th unique
// answer accuracy is exactly 7/10 = 70% < 75%, so the gate never passes.
const pick = ch1.slice(0, 10);
pick.forEach((q, i) => {
  p2 = recordAttempt(p2, q.id, i < 7, 1000);
});
const stat1 = getChapterStats(p2).find((s) => s.chapter === 1);
console.log('  chapter1 accuracy:', (stat1.accuracy * 100).toFixed(1) + '%', 'unique:', stat1.uniqueAnswered);
assert('10 unique reached', stat1.uniqueAnswered >= 10);
assert('below 75% does not auto-unlock', p2.highestUnlockedChapter === 1, `accuracy=${(stat1.accuracy*100).toFixed(1)}% frontier=${p2.highestUnlockedChapter}`);

// ---- Unlock Early manual override ----
const early = unlockChapter(emptyProgress(), 3);
assert('unlock early sets frontier to 3', early.highestUnlockedChapter === 3);
assert('unlock early clamped to max available', unlockChapter(emptyProgress(), 99).highestUnlockedChapter === MAX_AVAILABLE_CHAPTER);

// ---- Sprint weighting ----
const sp = getSprintQueue(emptyProgress(), Date.now());
console.log('  sprint ids:', sp.map((q) => q.id).join(','));
assert('sprint size = min(5, unlocked bank)', sp.length === Math.min(5, 20), `got ${sp.length}`);
assert('sprint unique', new Set(sp.map((q) => q.id)).size === sp.length);
assert('all sprint cards unlocked (chapter <= frontier=1)', sp.every((q) => q.chapter <= 1));
// card 4 should be a derivation_order when available in chapter 1
const ch1deriv = practiceForChapter(1).filter((q) => q.type === 'derivation_order');
if (ch1deriv.length > 0) {
  // find if a derivation card is at index 3 (card 4)
  assert('card 4 is derivation_order (ch1 has them)', sp[3] && sp[3].type === 'derivation_order', sp[3]?.id);
}

// Sprint with a higher frontier pulls from multiple chapters
const sp3 = getSprintQueue({ ...emptyProgress(), highestUnlockedChapter: 3 }, Date.now());
assert('frontier=3 sprint still 5 cards', sp3.length === 5, `got ${sp3.length}`);
assert('frontier=3 cards all chapter<=3', sp3.every((q) => q.chapter <= 3));
assert('frontier=3 cards are unique', new Set(sp3.map((q) => q.id)).size === sp3.length);

// ---- Sprint size option ----
const spSize = getSprintQueue(emptyProgress(), Date.now(), { size: 3 });
assert('size option = 3 cards', spSize.length === 3, `got ${spSize.length}`);
const spReview = getSprintQueue({ ...emptyProgress(), highestUnlockedChapter: 3 }, Date.now(), { size: 5, chapters: [1, 2] });
assert('chapter review limited to selected chapters', spReview.every((q) => q.chapter === 1 || q.chapter === 2), spReview.map((q) => q.id).join(','));

// ---- Info cards excluded from practice queue ----
const infoIds = new Set(infoForChapter(1).map((c) => c.id));
assert('sprint contains no info cards', sp.every((q) => !infoIds.has(q.id)));

// ---- Card 5 overdue review across chapters ----
// Build progress where a chapter-1 question is due (nextReview in the past) and frontier=3
let pRev = { ...emptyProgress(), highestUnlockedChapter: 3 };
const someCh1 = practiceForChapter(1)[0];
const someCh2 = practiceForChapter(2)[0];
pRev = recordAttempt(pRev, someCh1.id, true, 1000); // schedules future review
// Force one question to be overdue
pRev = { ...pRev, questions: { ...pRev.questions, [someCh2.id]: { boxLevel: 2, nextReview: 1, attempts: 3, correct: 2 } } };
const spRev = getSprintQueue(pRev, Date.now());
const card5 = spRev[4];
console.log('  card5:', card5?.id, 'chapter', card5?.chapter);
assert('card 5 exists when overdue available', !!card5);
assert('card 5 is the overdue chapter-2 review', card5?.id === someCh2.id, `got ${card5?.id} expected ${someCh2.id}`);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll unlock/sprint checks passed.');