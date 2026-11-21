import type { UnitStat } from '../lib/progress';

interface Props {
  unit: string;
  stat: UnitStat;
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

export function MasteryCard({ unit, stat }: Props) {
  const t = tone(stat.accuracy, stat.attempts);
  const pct = stat.attempts > 0 ? Math.round(stat.accuracy * 100) : 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight text-slate-200">{unit}</p>
        <span className={`shrink-0 text-sm font-semibold ${t.text}`}>
          {stat.attempts > 0 ? `${pct}%` : '0%'}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${t.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
        <span>{t.label}</span>
        <span>
          {stat.correct}/{stat.attempts}
        </span>
      </div>
    </div>
  );
}