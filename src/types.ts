export type QuestionType = 'mcq' | 'derivation_order' | 'info';

/** Highest chapter index supported by the schema. */
export const MAX_CHAPTER = 9;

interface BaseQuestion {
  id: string;
  /** Chapter this question belongs to (1..MAX_CHAPTER). */
  chapter: number;
  /** Human-readable chapter title, e.g. "Ch. 1: Background & Vectors". */
  unit: string;
  type: QuestionType;
}

export interface McqQuestion extends BaseQuestion {
  type: 'mcq';
  skillTag: string;
  promptLatex: string;
  optionsLatex: string[];
  correctIndex: number;
  explanationLatex: string;
}

export interface DerivationQuestion extends BaseQuestion {
  type: 'derivation_order';
  skillTag: string;
  promptLatex: string;
  stepsLatex: string[];
  explanationLatex: string;
}

/** Conceptual "brief" card shown before practicing a chapter. */
export interface InfoQuestion extends BaseQuestion {
  type: 'info';
  title: string;
  formulaLatex: string;
  bulletsLatex: string[];
  trapLatex: string;
}

export type Question = McqQuestion | DerivationQuestion | InfoQuestion;

/** Questions that can be answered and scored in a sprint. */
export type PracticeQuestion = McqQuestion | DerivationQuestion;

export interface ChapterMeta {
  chapter: number;
  title: string;
  /** Number of practice (answerable) questions in the bank for this chapter. */
  count: number;
  /** Number of info cards in this chapter. */
  infoCount: number;
}