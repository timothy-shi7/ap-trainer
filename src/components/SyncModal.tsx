import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Link2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ProgressV1 } from '../lib/progress';
import { buildSyncUrl, decodeSyncPayload } from '../lib/sync';

interface Props {
  progress: ProgressV1;
  onClose: () => void;
  onImported: (p: ProgressV1) => void;
}

export function SyncModal({ progress, onClose, onImported }: Props) {
  const url = buildSyncUrl(progress);
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      inputRef.current?.select();
    }
  };

  const applyPaste = () => {
    setError(null);
    const res = decodeSyncPayload(paste);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onImported(res.progress);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sync devices"
    >
      <div className="w-full max-w-md rounded-t-2xl border border-slate-800 bg-slate-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-700 sm:hidden" />
        <h2 className="text-lg font-semibold text-slate-100">Sync Devices</h2>
        <p className="mt-1 text-sm text-slate-400">
          Scan this code on another device, or copy the link.
        </p>

        <div className="mt-4 flex justify-center rounded-xl bg-white p-3">
          <QRCodeSVG
            value={url}
            size={220}
            level="L"
            bgColor="#ffffff"
            fgColor="#020617"
            marginSize={1}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Copy className="h-4 w-4" aria-hidden />
            )}
            {copied ? 'Copied' : 'Copy Sync Link'}
          </button>
        </div>

        <div className="my-4 h-px bg-slate-800" />

        <label
          htmlFor="sync-paste"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-300"
        >
          <Link2 className="h-4 w-4" aria-hidden />
          Paste a sync link from another device
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="sync-paste"
            ref={inputRef}
            value={paste}
            onChange={(e) => {
              setPaste(e.target.value);
              setError(null);
            }}
            placeholder="https://…#sync=…"
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={applyPaste}
            disabled={paste.trim().length === 0}
            className="min-h-[44px] shrink-0 rounded-xl bg-slate-700 px-4 text-sm font-medium text-slate-100 transition hover:bg-slate-600 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            Apply
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-rose-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-[44px] w-full rounded-xl border border-slate-700 text-sm text-slate-300 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          Close
        </button>
      </div>
    </div>
  );
}