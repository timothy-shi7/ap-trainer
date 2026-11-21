import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import type { InfoQuestion, PracticeQuestion } from '../types';
import {
  completeSprintIfNeeded,
  markInfoSeenMany,
  recordAttempt,
  type ProgressV1,
} from '../lib/progress';
import { McqCard } from './McqCard';
import { DerivationCard } from './DerivationCard';
import { InfoCard } from './InfoCard';
import { FeedbackBanner } from './FeedbackBanner';

interface Props {
  /** Practice questions for this sprint. */
  queue: PracticeQuestion[];
  /** Unseen info cards to show first (newly unlocked chapter). */
  introInfo?: InfoQuestion[];
  progress: ProgressV1;
  onProgressChange: (p: ProgressV1) => void;
  onExit: () => void;
}

type Phase = 'info' | 'question' | 'feedback' | 'summary';

export function SprintPlayer({
  queue,
  introInfo = [],
  progress,
  onProgressChange,
  onExit,
}: Props) {
  const [infoIndex, setInfoIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(introInfo.length > 0 ? 'info' : 'question');
  const [working, setWorking] = useState<ProgressV1>(progress);
  const [result, setResult] = useState<{
    correct: boolean;
    selectedText: string;
  } | null>(null);
  const [results, setResults] = useState<boolean[]>([]);

  const current = queue[index];

  // Track which info cards were viewed so we can mark them seen on exit.
  const viewedInfo = useRef<string[]>([]);

  const finishInfo = useCallback(() => {
    if (viewedInfo.current.length > 0) {
      const next = markInfoSeenMany(working, viewedInfo.current);
      setWorking(next);
      onProgressChange(next);
      viewedInfo.current = [];
    }
    setPhase(queue.length > 0 ? 'question' : 'summary');
  }, [working, onProgressChange, queue.length]);

  const advanceInfo = useCallback(() => {
    const card = introInfo[infoIndex];
    if (card && !viewedInfo.current.includes(card.id)) {
      viewedInfo.current.push(card.id);
    }
    if (infoIndex >= introInfo.length - 1) {
      finishInfo();
    } else {
      setInfoIndex((i) => i + 1);
    }
  }, [infoIndex, introInfo, finishInfo]);

  const handleCheck = useCallback(
    (correct: boolean, selectedText: string) => {
      if (!current) return;
      const next = recordAttempt(working, current.id, correct);
      setWorking(next);
      onProgressChange(next);
      setResult({ correct, selectedText });
      setResults((r) => [...r, correct]);
      setPhase('feedback');
    },
    [current, working, onProgressChange],
  );

  const handleNext = useCallback(() => {
    if (index >= queue.length - 1) {
      const done = completeSprintIfNeeded(working);
      setWorking(done);
      onProgressChange(done);
      setPhase('summary');
      return;
    }
    setIndex((i) => i + 1);
    setResult(null);
    setPhase('question');
  }, [index, queue.length, working, onProgressChange]);

  // Keyboard: Enter advances info cards and feedback.
  useEffect(() => {
    if (phase !== 'feedback' && phase !== 'info') return;
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
      if (e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'info') advanceInfo();
        else handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, advanceInfo, handleNext]);

  const dots = useMemo(() => {
    return queue.map((_q, i) => {
      if (i < results.length) {
        return results[i] ? 'correct' : 'incorrect';
      }
      if (i === index) return 'current';
      return 'upcoming';
    });
  }, [queue, results, index]);

  if (queue.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-medium text-slate-200">No questions available</p>
        <p className="mt-1 text-sm text-slate-500">
          Try unlocking another chapter or check your chapter selection.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="mt-4 min-h-[44px] rounded-xl bg-emerald-500 px-4 font-semibold text-slate-950"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (phase === 'summary') {
    const correctCount = results.filter(Boolean).length;
    return (
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-400">
            Sprint Complete
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-50">
            {correctCount}
            <span className="text-xl font-normal text-slate-400">
              /{queue.length}
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {Math.round((correctCount / queue.length) * 100)}% correct
          </p>

          <div className="mt-5 space-y-1.5 text-left">
            {queue.map((q, i) => (
              <div
                key={q.id}
                className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2 text-sm"
              >
                {results[i] ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden />
                )}
                <span className="min-w-0 flex-1 truncate text-slate-300">
                  {q.skillTag}
                </span>
                <span className="shrink-0 text-xs text-slate-500">{q.id}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onExit}
            className="mt-6 min-h-[48px] w-full rounded-xl bg-emerald-500 px-4 text-base font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Info intro phase
  if (phase === 'info' && introInfo.length > 0) {
    const card = introInfo[infoIndex];
    const isLast = infoIndex === introInfo.length - 1;
    return (
      <div className="mx-auto w-full max-w-md px-4 pb-8">
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onExit}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Exit sprint"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="flex flex-1 items-center gap-1.5">
            {introInfo.map((c, i) => (
              <span
                key={c.id}
                className={`h-2 flex-1 rounded-full ${
                  i < infoIndex
                    ? 'bg-sky-400'
                    : i === infoIndex
                      ? 'bg-sky-300'
                      : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="w-10 text-right text-sm tabular-nums text-slate-400">
            {infoIndex + 1}/{introInfo.length}
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-2">
            <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300">
              {card.unit}
            </span>
          </div>
          <InfoCard card={card} />
          <button
            type="button"
            onClick={advanceInfo}
            className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-500 px-4 text-base font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            {isLast ? 'Got it — Start Questions' : 'Got it — Next'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onExit}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="Exit sprint"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex flex-1 items-center gap-1.5">
          {dots.map((state, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${
                state === 'correct'
                  ? 'bg-emerald-400'
                  : state === 'incorrect'
                    ? 'bg-rose-500'
                    : state === 'current'
                      ? 'bg-slate-300'
                      : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
        <span className="w-10 text-right text-sm tabular-nums text-slate-400">
          {index + 1}/{queue.length}
        </span>
      </div>

      {/* Card */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
            {current.unit}
          </span>
          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            {current.skillTag}
          </span>
        </div>

        {current.type === 'mcq' ? (
          <McqCard
            key={current.id}
            question={current}
            disabled={phase === 'feedback'}
            onCheck={handleCheck}
          />
        ) : (
          <DerivationCard
            key={current.id}
            question={current}
            disabled={phase === 'feedback'}
            onCheck={handleCheck}
          />
        )}

        {phase === 'feedback' && result && (
          <FeedbackBanner
            question={current}
            correct={result.correct}
            selectedText={result.selectedText}
            onNext={handleNext}
            isLast={index === queue.length - 1}
          />
        )}
      </div>
    </div>
  );
}