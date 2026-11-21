import { useCallback, useEffect, useState } from 'react';
import {
  emptyProgress,
  loadProgress,
  saveProgress,
  type ProgressV1,
} from './lib/progress';
import { QUESTIONS } from './lib/questions';
import { decodeSyncPayload, readHashPayload, stripSyncHash } from './lib/sync';
import { Dashboard } from './components/Dashboard';
import { SprintPlayer } from './components/SprintPlayer';
import { SyncModal } from './components/SyncModal';
import { ConfirmImportModal } from './components/ConfirmImportModal';

type View = 'home' | 'sprint' | 'sync';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [progress, setProgress] = useState<ProgressV1>(() => loadProgress());
  const [incoming, setIncoming] = useState<ProgressV1 | null>(null);

  // Handle an incoming #sync= hash on load.
  useEffect(() => {
    const payload = readHashPayload();
    if (!payload) return;
    const res = decodeSyncPayload(payload);
    if (res.ok) {
      setIncoming(res.progress);
    } else {
      // Invalid hash: strip it so a reload does not retry forever.
      stripSyncHash();
      window.alert(`Sync failed: ${res.error}`);
    }
  }, []);

  const applyProgress = useCallback((p: ProgressV1) => {
    setProgress(p);
    saveProgress(p);
  }, []);

  const confirmImport = () => {
    if (!incoming) return;
    applyProgress(incoming);
    setIncoming(null);
    stripSyncHash();
    setView('home');
  };

  const cancelImport = () => {
    setIncoming(null);
    stripSyncHash();
  };

  return (
    <div className="min-h-[100dvh] bg-ink-950">
      <header className="safe-top sticky top-0 z-20 border-b border-slate-800/60 bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-2">
          <h1 className="text-base font-semibold tracking-tight text-slate-100">
            AP Physics C
          </h1>
          {view !== 'home' && (
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
              {view === 'sprint' ? 'Sprint' : 'Sync'}
            </span>
          )}
        </div>
      </header>

      <main className="safe-bottom">
        {view === 'home' && (
          <Dashboard
            progress={progress}
            bankSize={QUESTIONS.length}
            onStartSprint={() => setView('sprint')}
            onSync={() => setView('sync')}
          />
        )}
        {view === 'sprint' && (
          <SprintPlayer
            progress={progress}
            onProgressChange={applyProgress}
            onExit={() => setView('home')}
          />
        )}
      </main>

      {view === 'sync' && (
        <SyncModal
          progress={progress}
          onClose={() => setView('home')}
          onImported={(p) => {
            setIncoming(p);
            setView('home');
          }}
        />
      )}

      {incoming && (
        <ConfirmImportModal
          incoming={incoming}
          local={progress ?? emptyProgress()}
          onConfirm={confirmImport}
          onCancel={cancelImport}
        />
      )}
    </div>
  );
}