import { useEffect, useRef, useState } from 'react';
import { Eraser, Pencil, X } from 'lucide-react';

const HEIGHT = 190;

/**
 * Collapsible scratchpad drawer with a pointer-event canvas.
 * Drawing is ephemeral (not persisted).
 */
export function Scratchpad() {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = wrap.clientWidth;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${HEIGHT}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#e2e8f0';
    }
  };

  useEffect(() => {
    if (!open) return;
    setupCanvas();
    const onResize = () => {
      // preserve drawing across resize by snapshotting
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const snapshot =
        canvas.width > 0 ? canvas.toDataURL() : null;
      setupCanvas();
      if (snapshot) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, wrap.clientWidth, HEIGHT);
        };
        img.src = snapshot;
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.clientWidth,
      y: ((e.clientY - rect.top) / rect.height) * canvas.clientHeight,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = getPos(e);
    // draw a dot
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && last.current) {
      ctx.beginPath();
      ctx.arc(last.current.x, last.current.y, 1, 0, Math.PI * 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    const pos = getPos(e);
    if (ctx && last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    last.current = pos;
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer may already be released
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const wrap = wrapRef.current;
    if (canvas && ctx && wrap) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        aria-expanded={open}
      >
        <Pencil className="h-4 w-4" aria-hidden />
        Scratchpad
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-slate-700 bg-slate-950/60 p-2">
          <div
            ref={wrapRef}
            className="relative w-full overflow-hidden rounded-lg bg-slate-900"
          >
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onPointerLeave={endStroke}
              className="block w-full touch-none"
              style={{ height: `${HEIGHT}px`, cursor: 'crosshair' }}
              aria-label="Drawing scratchpad"
            />
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={clear}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Eraser className="h-4 w-4" aria-hidden />
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Close scratchpad"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}