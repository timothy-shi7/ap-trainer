import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Question } from '../types';
import { RichMath } from './RichMath';
import { Scratchpad } from './Scratchpad';

interface Props {
  question: Question;
  disabled: boolean;
  onCheck: (correct: boolean, selectedText: string) => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function McqCard({ question, disabled, onCheck }: Props) {
  const options = useMemo(() => question.optionsLatex ?? [], [question.optionsLatex]);
  const [selected, setSelected] = useState<number | null>(null);

  const submit = useCallback(
    (idx: number) => {
      if (disabled) return;
      setSelected(idx);
      const correct = idx === question.correctIndex;
      onCheck(correct, options[idx] ?? '');
    },
    [disabled, onCheck, options, question.correctIndex],
  );

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
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault();
        submit(n - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, options.length, submit]);

  return (
    <div>
      <div className="text-base leading-relaxed text-slate-100 sm:text-lg">
        <RichMath text={question.promptLatex} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {options.map((opt, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => submit(i)}
              className={`flex min-h-[56px] items-center gap-3 rounded-xl border px-4 py-3 text-left text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60 ${
                isSelected
                  ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100'
                  : 'border-slate-700 bg-slate-800/60 text-slate-100 hover:border-slate-600 hover:bg-slate-800'
              }`}
              aria-pressed={isSelected}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-700 text-xs font-bold text-slate-300">
                {LETTERS[i] ?? i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <RichMath text={opt} />
              </span>
              <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">
                {i + 1}
              </span>
            </button>
          );
        })}
      </div>

      <Scratchpad />
    </div>
  );
}