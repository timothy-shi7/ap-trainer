import { Lock, LockOpen, Sparkles, BookOpen } from 'lucide-react';
import type { ChapterStat } from '../lib/progress';

interface Props {
  stat: ChapterStat;
  /** Chapter is the user's current frontier. */
  isFrontier: boolean;
  onUnlock: (chapter: number) => void;
  /** Open the concept brief for this chapter. */
  onConceptBrief: (chapter: number) => void;
  /** Number of unseen info cards, to badge the brief button. */
  unseenInfo: number;
}

function tone(accuracy: number, attempts: number): {
  bar: string;
  text: string;
  label: string;
} {
  if (attempts === 0) {
    return { bar: 'bg-slate-700', text: 'text-slate-400', label: '—' };
  }
  if (accuracy >= 0.85) {
    return { bar: 'bg-amber-400', text: 'text-amber-300', label: 'Mastered' };
  }
  if (accuracy >= 0.7) {
    return { bar: 'bg-emerald-400', text: 'text-emerald-300', label: 'Proficient' };
  }
  return { bar: 'bg-sky-500', text: 'text-sky-300', label: 'Learning' };
}

export function ChapterTile({
  stat,
  isFrontier,
  onUnlock,
  onConceptBrief,
  unseenInfo,
}: Props) {
  const t = tone(stat.accuracy, stat.attempts);
  const pct = stat.attempts > 0 ? Math.round(stat.accuracy * 100) : 0;
  const locked = !stat.unlocked;

  return (
    <div
      className={`rounded-xl border p-3 ${
        locked
          ? 'border-slate-800 bg-slate-900/40'
          : isFrontier
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-slate-800 bg-slate-900/70'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
              locked
                ? 'bg-slate-800 text-slate-500'
                : isFrontier
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-700 text-slate-200'
            }`}
          >
            {stat.chapter}
          </span>
          <div className="min-w-0">
            <p
              className={`truncate text-sm font-medium leading-tight ${
                locked ? 'text-slate-400' : 'text-slate-200'
              }`}
            >
              {stat.title}
            </p>
            {isFrontier && !locked && (
              <p className="text-[11px] font-medium text-emerald-400">
                Current frontier
              </p>
            )}
          </div>
        </div>
        {locked ? (
          <Lock className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
        ) : (
          <span className={`shrink-0 text-sm font-semibold ${t.text}`}>
            {stat.attempts > 0 ? `${pct}%` : '0%'}
          </span>
        )}
      </div>

      {locked ? (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500">
            {stat.total} question{stat.total === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => onUnlock(stat.chapter)}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-700 px-2.5 text-xs font-medium text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Unlock Early
          </button>
        </div>
      ) : (
        <>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${t.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <LockOpen className="h-3 w-3" aria-hidden />
              {t.label}
            </span>
            <span>
              {stat.uniqueAnswered}/{stat.total} seen
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onConceptBrief(stat.chapter)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 text-xs font-medium text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              Concept Brief
              {unseenInfo > 0 && (
                <span className="ml-0.5 rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-slate-950">
                  {unseenInfo}
                </span>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}