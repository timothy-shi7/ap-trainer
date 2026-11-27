import {
  Flame,
  ShieldCheck,
  ShieldOff,
  Play,
  QrCode,
  Settings as SettingsIcon,
  Layers,
} from 'lucide-react';
import type { ProgressV2 } from '../lib/progress';
import { getChapterStats, unseenInfoCount } from '../lib/progress';
import { ChapterTile } from './ChapterTile';

interface Props {
  progress: ProgressV2;
  sprintSize: number;
  onStartSprint: () => void;
  onSync: () => void;
  onUnlock: (chapter: number) => void;
  onConceptBrief: (chapter: number) => void;
  onReview: () => void;
  onSettings: () => void;
}

export function Dashboard({
  progress,
  sprintSize,
  onStartSprint,
  onSync,
  onUnlock,
  onConceptBrief,
  onReview,
  onSettings,
}: Props) {
  const stats = getChapterStats(progress);
  const { streak } = progress;
  const frontier = progress.highestUnlockedChapter;

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
            <p className="mt-1 text-xs text-slate-400">Best: {streak.best}</p>
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

      {/* Frontier banner */}
      <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs">
        <span className="text-slate-400">Chapter frontier</span>
        <span className="font-semibold text-emerald-300">Ch. {frontier}</span>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onStartSprint}
        disabled={sprintSize === 0}
        className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-50"
      >
        <Play className="h-5 w-5" aria-hidden />
        Start {sprintSize}-Card Sprint
        <span className="text-sm font-normal opacity-70">· 3 min</span>
      </button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onReview}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <Layers className="h-4 w-4" aria-hidden />
          Review
        </button>
        <button
          type="button"
          onClick={onSync}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <QrCode className="h-4 w-4" aria-hidden />
          Sync
        </button>
      </div>

      {/* Chapter mastery */}
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Chapters
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500">{frontier} unlocked</span>
          <button
            type="button"
            onClick={onSettings}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <SettingsIcon className="h-3.5 w-3.5" aria-hidden />
            Settings
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2.5">
        {stats.map((stat) => (
          <ChapterTile
            key={stat.chapter}
            stat={stat}
            isFrontier={stat.chapter === frontier}
            onUnlock={onUnlock}
            onConceptBrief={onConceptBrief}
            unseenInfo={unseenInfoCount(progress, stat.chapter)}
          />
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-600">
        Progress is saved on this device. Use Sync or Settings to back it up.
      </p>
    </div>
  );
}