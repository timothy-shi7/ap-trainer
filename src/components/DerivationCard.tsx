import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';
import type { DerivationQuestion } from '../types';
import { shuffle } from '../lib/shuffle';
import { RichMath } from './RichMath';
import { Scratchpad } from './Scratchpad';

interface Props {
  question: DerivationQuestion;
  disabled: boolean;
  onCheck: (correct: boolean, selectedText: string) => void;
}

interface Step {
  origIndex: number;
  latex: string;
}

export function DerivationCard({ question, disabled, onCheck }: Props) {
  const steps = question.stepsLatex ?? [];

  const pool = useMemo<Step[]>(() => {
    const all = steps.map((latex, origIndex) => ({ origIndex, latex }));
    return shuffle(all);
    // reshuffle only when the question changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const [placed, setPlaced] = useState<Step[]>([]);

  const place = useCallback(
    (step: Step) => {
      if (disabled) return;
      setPlaced((prev) => {
        if (prev.some((s) => s.origIndex === step.origIndex)) return prev;
        if (prev.length >= steps.length) return prev;
        return [...prev, step];
      });
    },
    [disabled, steps.length],
  );

  const undo = useCallback(() => {
    if (disabled) return;
    setPlaced((prev) => prev.slice(0, -1));
  }, [disabled]);

  const reset = useCallback(() => {
    if (disabled) return;
    setPlaced([]);
  }, [disabled]);

  const check = useCallback(() => {
    if (disabled) return;
    const complete = placed.length === steps.length;
    const correct =
      complete && placed.every((s, i) => s.origIndex === i);
    const selectedText = placed.map((s, i) => `${i + 1}. ${s.latex}`).join('  ');
    onCheck(correct, complete ? selectedText : '(incomplete)');
  }, [disabled, placed, steps.length, onCheck]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        check();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        undo();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, check, undo, reset]);

  const placedSet = new Set(placed.map((s) => s.origIndex));
  const remaining = pool.filter((s) => !placedSet.has(s.origIndex));

  return (
    <div>
      <div className="text-base leading-relaxed text-slate-100 sm:text-lg">
        <RichMath text={question.promptLatex} />
      </div>

      {/* Numbered slots */}
      <ol className="mt-4 space-y-2">
        {Array.from({ length: steps.length }).map((_, slot) => {
          const step = placed[slot];
          return (
            <li
              key={slot}
              className={`flex min-h-[52px] items-start gap-3 rounded-xl border px-3 py-2 ${
                step
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-dashed border-slate-700 bg-slate-900/40'
              }`}
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-200">
                {slot + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm leading-relaxed text-slate-100">
                {step ? <RichMath text={step.latex} /> : <span className="text-slate-500">Tap a step below…</span>}
              </span>
              {step && !disabled && (
                <button
                  type="button"
                  onClick={() => setPlaced((prev) => prev.filter((_, i) => i !== slot))}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  aria-label={`Remove step ${slot + 1}`}
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {/* Pool of shuffled steps */}
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          Steps
        </p>
        <div className="flex flex-col gap-2">
          {remaining.length === 0 && (
            <p className="text-sm text-slate-500">All steps placed.</p>
          )}
          {remaining.map((step) => (
            <button
              key={step.origIndex}
              type="button"
              disabled={disabled}
              onClick={() => place(step)}
              className="min-h-[52px] rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-left text-sm leading-relaxed text-slate-100 transition hover:border-slate-600 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60"
            >
              <RichMath text={step.latex} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || placed.length === 0}
          onClick={undo}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <Undo2 className="h-4 w-4" aria-hidden />
          Undo
        </button>
        <button
          type="button"
          disabled={disabled || placed.length === 0}
          onClick={reset}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reset
        </button>
        <button
          type="button"
          disabled={disabled || placed.length !== steps.length}
          onClick={check}
          className="ml-auto inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          Check
        </button>
      </div>

      <Scratchpad />
    </div>
  );
}