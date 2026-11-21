import { Check, X } from 'lucide-react';
import type { Question } from '../types';
import { RichMath } from './RichMath';

interface Props {
  question: Question;
  correct: boolean;
  selectedText: string;
  onNext: () => void;
  isLast: boolean;
}

export function FeedbackBanner({
  question,
  correct,
  selectedText,
  onNext,
  isLast,
}: Props) {
  return (
    <div
      className={`mt-4 rounded-2xl border p-4 ${
        correct
          ? 'border-emerald-500/40 bg-emerald-500/10'
          : 'border-rose-500/40 bg-rose-500/10'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            correct ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
          }`}
        >
          {correct ? (
            <Check className="h-5 w-5" aria-hidden />
          ) : (
            <X className="h-5 w-5" aria-hidden />
          )}
        </span>
        <p
          className={`text-base font-semibold ${
            correct ? 'text-emerald-300' : 'text-rose-300'
          }`}
        >
          {correct ? 'Correct' : 'Not quite'}
        </p>
      </div>

      {!correct && selectedText && (
        <p className="mt-2 text-sm text-slate-400">
          Your answer: <span className="text-slate-200">{selectedText}</span>
        </p>
      )}

      <div className="mt-3 text-sm leading-relaxed text-slate-200">
        <RichMath text={question.explanationLatex} />
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-emerald-500 px-4 text-base font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        {isLast ? 'Finish Sprint' : 'Next'}
        <span className="ml-2 hidden text-xs font-normal opacity-70 sm:inline">
          (Enter)
        </span>
      </button>
    </div>
  );
}