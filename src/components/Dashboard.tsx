import { Flame, ShieldCheck, ShieldOff, Play, QrCode } from 'lucide-react';
import type { ProgressV1 } from '../lib/progress';
import { getUnitStats } from '../lib/progress';
import { UNITS } from '../types';
import { MasteryCard } from './MasteryCard';

interface Props {
  progress: ProgressV1;
  bankSize: number;
  onStartSprint: () => void;
  onSync: () => void;
}

export function Dashboard({
  progress,
  bankSize,
  onStartSprint,
  onSync,
}: Props) {
  const stats = getUnitStats(progress);
  const sprintSize = Math.min(5, bankSize);
  const { streak } = progress;

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-8">
      {/* Streak header */}
      <div className="mt-2 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15">
            <Flame className="h-6 w-6 text-amber-400" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-bold leading-none text-slate-50">
              {streak.current}
              <span className="ml-1 text-sm font-normal text-slate-400">
                day{streak.current === 1 ? '' : 's'}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Best: {streak.best}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          {streak.shieldAvailable ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 font-medium text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Shield ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 font-medium text-slate-400">
              <ShieldOff className="h-3.5 w-3.5" aria-hidden />
              No shield
            </span>
          )}
          <span className="text-slate-500">
            {streak.lastSprintDate ? `Last: ${streak.lastSprintDate}` : 'No sprints yet'}
          </span>
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onStartSprint}
        disabled={bankSize === 0}
        className="mt-4 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-50"
      >
        <Play className="h-5 w-5" aria-hidden />
        Start {sprintSize}-Card Sprint
        <span className="text-sm font-normal opacity-70">· 3 min</span>
      </button>

      <button
        type="button"
        onClick={onSync}
        className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 text-base font-medium text-slate-200 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        <QrCode className="h-5 w-5" aria-hidden />
        Sync Devices
      </button>

      {/* Unit mastery */}
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Unit Mastery
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {UNITS.map((unit) => (
          <MasteryCard key={unit} unit={unit} stat={stats[unit]} />
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-600">
        Progress is saved on this device. Use Sync to move it.
      </p>
    </div>
  );
}