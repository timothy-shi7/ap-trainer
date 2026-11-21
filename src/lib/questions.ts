import raw from '../data/questions.json';
import type {
  ChapterMeta,
  InfoQuestion,
  PracticeQuestion,
  Question,
  QuestionType,
} from '../types';
import { MAX_CHAPTER } from '../types';

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function guardChapter(v: unknown, index: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v)) {
    throw new Error(`questions[${index}].chapter must be an integer`);
  }
  if (v < 1 || v > MAX_CHAPTER) {
    throw new Error(
      `questions[${index}].chapter ${v} out of range (1..${MAX_CHAPTER})`,
    );
  }
  return v;
}

function guardQuestion(q: unknown, index: number): Question {
  if (typeof q !== 'object' || q === null) {
    throw new Error(`questions[${index}] is not an object`);
  }
  const r = q as Record<string, unknown>;

  if (!isNonEmptyString(r.id)) throw new Error(`questions[${index}].id invalid`);
  const chapter = guardChapter(r.chapter, index);
  if (!isNonEmptyString(r.unit)) {
    throw new Error(`questions[${index}].unit invalid`);
  }
  if (
    r.type !== 'mcq' &&
    r.type !== 'derivation_order' &&
    r.type !== 'info'
  ) {
    throw new Error(`questions[${index}].type "${String(r.type)}" invalid`);
  }
  const type: QuestionType = r.type;

  const base = { id: r.id, chapter, unit: r.unit, type };

  if (type === 'info') {
    if (!isNonEmptyString(r.title)) {
      throw new Error(`questions[${index}] (info) title invalid`);
    }
    if (!isNonEmptyString(r.formulaLatex)) {
      throw new Error(`questions[${index}] (info) formulaLatex invalid`);
    }
    if (!isStringArray(r.bulletsLatex) || r.bulletsLatex.length < 1) {
      throw new Error(`questions[${index}] (info) needs >= 1 bulletsLatex`);
    }
    if (!isNonEmptyString(r.trapLatex)) {
      throw new Error(`questions[${index}] (info) trapLatex invalid`);
    }
    const info: InfoQuestion = {
      ...base,
      type: 'info',
      title: r.title,
      formulaLatex: r.formulaLatex,
      bulletsLatex: r.bulletsLatex,
      trapLatex: r.trapLatex,
    };
    return info;
  }

  if (!isNonEmptyString(r.skillTag)) throw new Error(`questions[${index}].skillTag invalid`);
  if (!isNonEmptyString(r.promptLatex)) throw new Error(`questions[${index}].promptLatex invalid`);
  if (!isNonEmptyString(r.explanationLatex)) {
    throw new Error(`questions[${index}].explanationLatex invalid`);
  }

  if (type === 'mcq') {
    if (!isStringArray(r.optionsLatex) || r.optionsLatex.length < 2) {
      throw new Error(`questions[${index}] (mcq) needs >= 2 optionsLatex`);
    }
    if (
      typeof r.correctIndex !== 'number' ||
      !Number.isInteger(r.correctIndex) ||
      r.correctIndex < 0 ||
      r.correctIndex >= r.optionsLatex.length
    ) {
      throw new Error(`questions[${index}] (mcq) correctIndex out of range`);
    }
    return {
      ...base,
      type: 'mcq',
      skillTag: r.skillTag,
      promptLatex: r.promptLatex,
      explanationLatex: r.explanationLatex,
      optionsLatex: r.optionsLatex,
      correctIndex: r.correctIndex,
    };
  }

  if (!isStringArray(r.stepsLatex) || r.stepsLatex.length < 2) {
    throw new Error(`questions[${index}] (derivation_order) needs >= 2 stepsLatex`);
  }
  if (r.correctIndex !== undefined) {
    throw new Error(`questions[${index}] (derivation_order) must not have correctIndex`);
  }
  return {
    ...base,
    type: 'derivation_order',
    skillTag: r.skillTag,
    promptLatex: r.promptLatex,
    explanationLatex: r.explanationLatex,
    stepsLatex: r.stepsLatex,
  };
}

function buildBank(): Question[] {
  const list = raw as unknown[];
  const seen = new Set<string>();
  const out: Question[] = [];
  list.forEach((item, i) => {
    const q = guardQuestion(item, i);
    if (seen.has(q.id)) throw new Error(`duplicate question id "${q.id}"`);
    seen.add(q.id);
    out.push(q);
  });
  return out;
}

export const QUESTIONS: Question[] = buildBank();

/** Only answerable (practice) questions, in bank order. */
export const PRACTICE_QUESTIONS: PracticeQuestion[] = QUESTIONS.filter(
  (q): q is PracticeQuestion => q.type === 'mcq' || q.type === 'derivation_order',
);

export const QUESTION_BY_ID: ReadonlyMap<string, Question> = new Map(
  QUESTIONS.map((q) => [q.id, q]),
);

/** All chapters that actually have at least one question, ascending. */
export const AVAILABLE_CHAPTERS: number[] = Array.from(
  new Set(QUESTIONS.map((q) => q.chapter)),
).sort((a, b) => a - b);

const titleByChapter = new Map<number, string>();
for (const q of QUESTIONS) {
  if (!titleByChapter.has(q.chapter)) titleByChapter.set(q.chapter, q.unit);
}

/** Metadata (chapter, title, practice count, info count) per available chapter. */
export const CHAPTERS: ChapterMeta[] = AVAILABLE_CHAPTERS.map((chapter) => {
  let count = 0;
  let infoCount = 0;
  for (const q of QUESTIONS) {
    if (q.chapter !== chapter) continue;
    if (q.type === 'info') infoCount += 1;
    else count += 1;
  }
  return {
    chapter,
    title: titleByChapter.get(chapter) ?? `Chapter ${chapter}`,
    count,
    infoCount,
  };
});

/** All questions (practice + info) belonging to a chapter. */
export function questionsForChapter(chapter: number): Question[] {
  return QUESTIONS.filter((q) => q.chapter === chapter);
}

/** Info cards belonging to a chapter. */
export function infoForChapter(chapter: number): InfoQuestion[] {
  return QUESTIONS.filter(
    (q): q is InfoQuestion => q.chapter === chapter && q.type === 'info',
  );
}

/** Practice (answerable) questions belonging to a chapter. */
export function practiceForChapter(chapter: number): PracticeQuestion[] {
  return PRACTICE_QUESTIONS.filter((q) => q.chapter === chapter);
}

export function isPractice(q: Question): q is PracticeQuestion {
  return q.type === 'mcq' || q.type === 'derivation_order';
}