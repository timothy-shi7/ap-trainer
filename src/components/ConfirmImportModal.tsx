import type { ProgressV1 } from '../lib/progress';
import { attemptedQuestionCount, totalAttempts } from '../lib/sync';

interface Props {
  incoming: ProgressV1;
  local: ProgressV1;
  onConfirm: () => void;
  onCancel: () => void;
}

function Row({ label, incoming, local }: { label: string; incoming: string; local: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-slate-800 py-2 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="w-16 text-right font-medium text-emerald-300">{incoming}</span>
      <span className="w-16 text-right font-medium text-slate-300">{local}</span>
    </div>
  );
}

export function ConfirmImportModal({ incoming, local, onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm import"
    >
      <div className="w-full max-w-md rounded-t-2xl border border-slate-800 bg-slate-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-slate-100">
          Replace local progress?
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Importing this snapshot overwrites progress on this device.
        </p>

        <div className="mt-4 grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-slate-800 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span />
          <span className="w-16 text-right">Incoming</span>
          <span className="w-16 text-right">Local</span>
        </div>
        <Row
          label="Chapter frontier"
          incoming={`Ch. ${incoming.highestUnlockedChapter}`}
          local={`Ch. ${local.highestUnlockedChapter}`}
        />
        <Row
          label="Streak (days)"
          incoming={String(incoming.streak.current)}
          local={String(local.streak.current)}
        />
        <Row
          label="Best streak"
          incoming={String(incoming.streak.best)}
          local={String(local.streak.best)}
        />
        <Row
          label="Questions seen"
          incoming={String(attemptedQuestionCount(incoming))}
          local={String(attemptedQuestionCount(local))}
        />
        <Row
          label="Total attempts"
          incoming={String(totalAttempts(incoming))}
          local={String(totalAttempts(local))}
        />

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] flex-1 rounded-xl border border-slate-700 text-sm text-slate-300 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[48px] flex-1 rounded-xl bg-emerald-500 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Overwrite & Import
          </button>
        </div>
      </div>
    </div>
  );
}