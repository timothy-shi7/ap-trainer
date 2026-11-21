export type QuestionType = 'mcq' | 'derivation_order';

export type UnitName =
  | "Kinematics & Newton's Laws"
  | 'Work/Energy/Momentum'
  | 'Rotation & Oscillations'
  | 'Electrostatics & Gauss’s Law'
  | 'Circuits & Magnetism';

export interface Question {
  id: string;
  unit: UnitName;
  type: QuestionType;
  skillTag: string;
  promptLatex: string;
  /** mcq only */
  optionsLatex?: string[];
  /** derivation_order only */
  stepsLatex?: string[];
  /** mcq only */
  correctIndex?: number;
  explanationLatex: string;
}

export const UNITS: UnitName[] = [
  "Kinematics & Newton's Laws",
  'Work/Energy/Momentum',
  'Rotation & Oscillations',
  'Electrostatics & Gauss’s Law',
  'Circuits & Magnetism',
];