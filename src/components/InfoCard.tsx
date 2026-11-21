import { Lightbulb, AlertTriangle } from 'lucide-react';
import type { InfoQuestion } from '../types';
import { RichMath } from './RichMath';

export function InfoCard({ card }: { card: InfoQuestion }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden />
          Concept Brief
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug text-slate-50">
        {card.title}
      </h3>

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-center text-base text-slate-100">
        <RichMath text={card.formulaLatex} />
      </div>

      {card.bulletsLatex.length > 0 && (
        <ul className="mt-4 space-y-2">
          {card.bulletsLatex.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-200">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <span className="min-w-0">
                <RichMath text={b} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {card.trapLatex.trim().length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Common Trap
          </p>
          <div className="mt-1.5 text-sm leading-relaxed text-amber-100">
            <RichMath text={card.trapLatex} />
          </div>
        </div>
      )}
    </div>
  );
}