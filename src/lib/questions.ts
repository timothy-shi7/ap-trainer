import raw from '../data/questions.json';
import type { Question, UnitName } from '../types';
import { UNITS } from '../types';

const UNIT_SET = new Set<string>(UNITS);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function guardQuestion(q: unknown, index: number): Question {
  if (typeof q !== 'object' || q === null) {
    throw new Error(`questions[${index}] is not an object`);
  }
  const r = q as Record<string, unknown>;

  if (!isNonEmptyString(r.id)) throw new Error(`questions[${index}].id invalid`);
  if (typeof r.unit !== 'string' || !UNIT_SET.has(r.unit)) {
    throw new Error(`questions[${index}].unit "${String(r.unit)}" not a known unit`);
  }
  if (r.type !== 'mcq' && r.type !== 'derivation_order') {
    throw new Error(`questions[${index}].type "${String(r.type)}" invalid`);
  }
  if (!isNonEmptyString(r.skillTag)) throw new Error(`questions[${index}].skillTag invalid`);
  if (!isNonEmptyString(r.promptLatex)) throw new Error(`questions[${index}].promptLatex invalid`);
  if (!isNonEmptyString(r.explanationLatex)) {
    throw new Error(`questions[${index}].explanationLatex invalid`);
  }

  if (r.type === 'mcq') {
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
      id: r.id,
      unit: r.unit as UnitName,
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
    id: r.id,
    unit: r.unit as UnitName,
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

export const QUESTION_BY_ID: ReadonlyMap<string, Question> = new Map(
  QUESTIONS.map((q) => [q.id, q]),
);