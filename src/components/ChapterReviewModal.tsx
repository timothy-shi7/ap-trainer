import { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { ChapterStat } from '../lib/progress';

interface Props {
  stats: ChapterStat[];
  onStart: (chapters: number[]) => void;
  onClose: () => void;
}

export function ChapterReviewModal({ stats, onStart, onClose }: Props) {
  const unlocked = stats.filter((s) => s.unlocked);
  const [selected, setSelected] = useState<number[]>(
    unlocked.length > 0 ? [unlocked[unlocked.length - 1].chapter] : [],
  );

  const toggle = (chapter: number) => {
    setSelected((prev) =>
      prev.includes(chapter)
        ? prev.filter((c) => c !== chapter)
        : [...prev, chapter].sort((a, b) => a - b),
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/85 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Select chapters to review"
    >
      <div className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-2xl border border-slate-800 bg-slate-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Review Chapters</h2>
            <p className="text-sm text-slate-400">
              Pick one or more unlocked chapters.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
          {stats.map((s) => {
            const active = selected.includes(s.chapter);
            return (
              <button
                key={s.chapter}
                type="button"
                disabled={!s.unlocked}
                onClick={() => toggle(s.chapter)}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-40 ${
                  active
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                }`}
                aria-pressed={active}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                    active
                      ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                      : 'border-slate-600 text-transparent'
                  }`}
                >
                  <Check className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-100">
                    Ch. {s.chapter} · {s.title}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {s.total} question{s.total === 1 ? '' : 's'}
                    {s.total > 0
                      ? ` · ${s.latestCorrect}/${s.total} correct (${Math.round(s.accuracy * 100)}%)`
                      : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] flex-1 rounded-xl border border-slate-700 text-sm text-slate-300 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => onStart(selected)}
            className="min-h-[48px] flex-1 rounded-xl bg-emerald-500 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Review {selected.length > 0 ? `(${selected.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}