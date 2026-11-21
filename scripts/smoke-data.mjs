import { QUESTIONS } from '../src/lib/questions.ts';
import { getDueQueue, emptyProgress, recordAttempt, getUnitStats } from '../src/lib/progress.ts';

let failures = 0;
function assert(name, cond) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    failures += 1;
  } else {
    console.log(`ok   ${name}`);
  }
}

assert('bank has 3 questions', QUESTIONS.length === 3);
assert('ids unique', new Set(QUESTIONS.map((q) => q.id)).size === 3);
assert('types valid', QUESTIONS.every((q) => q.type === 'mcq' || q.type === 'derivation_order'));
const mcq = QUESTIONS.find((q) => q.type === 'mcq');
assert('mcq has options', Array.isArray(mcq.optionsLatex) && mcq.optionsLatex.length >= 2);
const deriv = QUESTIONS.find((q) => q.type === 'derivation_order');
assert('derivation has steps', Array.isArray(deriv.stepsLatex) && deriv.stepsLatex.length >= 2);

// Queue: empty progress -> all 3 unseen due, sprint size min(5,3)=3
const p0 = emptyProgress();
const q0 = getDueQueue(p0, QUESTIONS, Date.now());
assert('queue size = min(5,3)=3', q0.length === 3);
assert('queue unique', new Set(q0.map((q) => q.id)).size === q0.length);

// Record a correct attempt on the first question -> it should no longer be due (nextReview future).
// With 3-question bank: 2 remain due, queue fills to 3 by appending the answered one last.
const now = Date.now();
const p1 = recordAttempt(p0, QUESTIONS[0].id, true, now);
const q1 = getDueQueue(p1, QUESTIONS, now + 1000);
assert('queue still 3 (fill to bank)', q1.length === 3);
assert('answered q is last (fill), not in due prefix', q1[2].id === QUESTIONS[0].id);
assert('due prefix is the two unseen', q1[0].id !== QUESTIONS[0].id && q1[1].id !== QUESTIONS[0].id);

// Unit stats
const stats = getUnitStats(p1);
assert('unit stats has 5 units', Object.keys(stats).length === 5);
const kinStat = stats["Kinematics & Newton's Laws"];
assert('kin attempts=1 correct=1', kinStat.attempts === 1 && kinStat.correct === 1);
assert('kin accuracy=1', kinStat.accuracy === 1);
const emptyUnit = stats['Work/Energy/Momentum'];
assert('empty unit accuracy=0 (no NaN)', emptyUnit.accuracy === 0 && emptyUnit.attempts === 0);

// Incorrect resets box to 1
const p2 = recordAttempt(p1, QUESTIONS[0].id, false, now + 5000);
assert('incorrect resets box to 1', p2.questions[QUESTIONS[0].id].boxLevel === 1);
assert('incorrect attempts=2 correct=1', p2.questions[QUESTIONS[0].id].attempts === 2 && p2.questions[QUESTIONS[0].id].correct === 1);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll data/queue checks passed.');