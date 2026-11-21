import { useRef } from 'react';
import { X, Download, Upload, Minus, Plus } from 'lucide-react';
import {
  MAX_SPRINT_SIZE,
  MIN_SPRINT_SIZE,
} from '../lib/progress';
import type { Settings } from '../lib/settings';

interface Props {
  settings: Settings;
  error: string | null;
  onChange: (s: Settings) => void;
  onExport: () => void;
  onImportFile: (file: File) => string | null;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  error,
  onChange,
  onExport,
  onImportFile,
  onClose,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const setLength = (n: number) => {
    const clamped = Math.max(MIN_SPRINT_SIZE, Math.min(MAX_SPRINT_SIZE, n));
    onChange({ ...settings, sprintLength: clamped });
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportFile(file);
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/85 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="w-full max-w-md rounded-t-2xl border border-slate-800 bg-slate-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Sprint length */}
        <div className="mt-5">
          <label className="text-sm font-medium text-slate-200">
            Sprint length
          </label>
          <p className="text-xs text-slate-500">
            Practice questions per sprint ({MIN_SPRINT_SIZE}–{MAX_SPRINT_SIZE}).
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLength(settings.sprintLength - 1)}
              disabled={settings.sprintLength <= MIN_SPRINT_SIZE}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 text-slate-200 transition hover:bg-slate-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Decrease sprint length"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <span className="min-w-[3rem] text-center text-2xl font-bold tabular-nums text-slate-50">
              {settings.sprintLength}
            </span>
            <button
              type="button"
              onClick={() => setLength(settings.sprintLength + 1)}
              disabled={settings.sprintLength >= MAX_SPRINT_SIZE}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 text-slate-200 transition hover:bg-slate-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Increase sprint length"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="my-5 h-px bg-slate-800" />

        {/* Data */}
        <div>
          <h3 className="text-sm font-medium text-slate-200">Your data</h3>
          <p className="text-xs text-slate-500">
            Export a backup file or restore from one.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onExport}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 text-sm text-slate-200 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Download className="h-4 w-4" aria-hidden />
              Export
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 text-sm text-slate-200 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Upload className="h-4 w-4" aria-hidden />
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              className="hidden"
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-rose-400" role="alert">
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-[48px] w-full rounded-xl bg-emerald-500 px-4 text-base font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          Done
        </button>
      </div>
    </div>
  );
}