import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { InfoQuestion } from '../types';
import { InfoCard } from './InfoCard';

interface Props {
  chapterTitle: string;
  cards: InfoQuestion[];
  onClose: () => void;
  /** Called for each card as it is viewed (to mark seen). */
  onView?: (id: string) => void;
}

/**
 * Full-screen-ish overlay to swipe through a chapter's info cards.
 * Supports buttons, keyboard arrows, and touch swipe.
 */
export function ConceptBrief({ chapterTitle, cards, onClose, onView }: Props) {
  const [index, setIndex] = useState(0);
  const total = cards.length;

  useEffect(() => {
    const card = cards[index];
    if (card && onView) onView(card.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setIndex((i) => Math.min(total - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, total]);

  // Touch swipe
  const touchStartX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (dx > 50) setIndex((i) => Math.max(0, i - 1));
    else if (dx < -50) setIndex((i) => Math.min(total - 1, i + 1));
  };

  if (total === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/85 backdrop-blur-sm sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Concept brief"
      >
        <div className="w-full max-w-md rounded-t-2xl border border-slate-800 bg-slate-900 p-5 text-center shadow-2xl sm:rounded-2xl">
          <p className="text-sm text-slate-300">No concept briefs for this chapter yet.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 min-h-[44px] w-full rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const card = cards[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/85 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Concept brief"
    >
      <div className="w-full max-w-md rounded-t-2xl border border-slate-800 bg-slate-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">
              {chapterTitle}
            </p>
            <p className="text-xs text-slate-500">
              Concept brief · {index + 1}/{total}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Close concept brief"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div
          className="mt-3"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <InfoCard card={card} />
        </div>

        {/* Dots */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {cards.map((c, i) => (
            <span
              key={c.id}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-emerald-400' : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-700 px-3 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Previous card"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            {index === total - 1 ? 'Done' : 'Got it — Next'}
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-700 px-3 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Next card"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}