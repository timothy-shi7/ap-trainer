import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  emptyProgress,
  getChapterStats,
  getSprintQueue,
  loadProgress,
  markInfoSeenMany,
  saveProgress,
  unlockChapter,
  unlockedQuestionCount,
  type ProgressV2,
} from './lib/progress';
import { CHAPTERS, infoForChapter, QUESTIONS } from './lib/questions';
import {
  clampSprintLength,
  loadSettings,
  saveSettings,
  type Settings,
} from './lib/settings';
import { downloadBackup, parseBackup } from './lib/backup';
import { decodeSyncPayload, readHashPayload, stripSyncHash } from './lib/sync';
import type { InfoQuestion, PracticeQuestion } from './types';
import { Dashboard } from './components/Dashboard';
import { SprintPlayer } from './components/SprintPlayer';
import { SyncModal } from './components/SyncModal';
import { ConfirmImportModal } from './components/ConfirmImportModal';
import { ConceptBrief } from './components/ConceptBrief';
import { ChapterReviewModal } from './components/ChapterReviewModal';
import { SettingsModal } from './components/SettingsModal';

type View = 'home' | 'sprint';

interface SprintConfig {
  queue: PracticeQuestion[];
  introInfo: InfoQuestion[];
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [progress, setProgress] = useState<ProgressV2>(() => loadProgress());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [incoming, setIncoming] = useState<ProgressV2 | null>(null);

  const [syncOpen, setSyncOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [briefChapter, setBriefChapter] = useState<number | null>(null);
  const [sprint, setSprint] = useState<SprintConfig | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Handle an incoming #sync= hash on load.
  useEffect(() => {
    const payload = readHashPayload();
    if (!payload) return;
    const res = decodeSyncPayload(payload);
    if (res.ok) {
      setIncoming(res.progress);
    } else {
      stripSyncHash();
      window.alert(`Sync failed: ${res.error}`);
    }
  }, []);

  const applyProgress = useCallback((p: ProgressV2) => {
    setProgress(p);
    saveProgress(p);
  }, []);

  const applySettings = useCallback((s: Settings) => {
    const next = { ...s, sprintLength: clampSprintLength(s.sprintLength) };
    setSettings(next);
    saveSettings(next);
  }, []);

  const handleUnlock = useCallback((chapter: number) => {
    setProgress((prev) => {
      const next = unlockChapter(prev, chapter);
      if (next !== prev) saveProgress(next);
      return next;
    });
  }, []);

  // ---- Sprint launching ----

  const launchSprint = useCallback(
    (chapters?: number[]) => {
      const size = settings.sprintLength;
      const queue = chapters
        ? getSprintQueue(progress, Date.now(), { size, chapters })
        : getSprintQueue(progress, Date.now(), { size });

      // Show unseen info cards for the frontier chapter on a normal sprint.
      const frontier = progress.highestUnlockedChapter;
      const seen = new Set(progress.seenInfo);
      const introInfo = chapters
        ? []
        : infoForChapter(frontier).filter((c) => !seen.has(c.id));

      setSprint({ queue, introInfo });
      setReviewOpen(false);
      setView('sprint');
    },
    [progress, settings.sprintLength],
  );

  const handleSprintExit = useCallback(() => {
    setSprint(null);
    setView('home');
  }, []);

  // ---- Concept brief ----

  const briefCards = useMemo<InfoQuestion[]>(() => {
    if (briefChapter === null) return [];
    return infoForChapter(briefChapter);
  }, [briefChapter]);

  const markBriefSeen = useCallback((id: string) => {
    setProgress((prev) => {
      if (prev.seenInfo.includes(id)) return prev;
      const next = markInfoSeenMany(prev, [id]);
      saveProgress(next);
      return next;
    });
  }, []);

  // ---- Settings: export / import ----

  const handleExport = useCallback(() => {
    downloadBackup(progress, settings);
  }, [progress, settings]);

  const handleImportFile = useCallback(
    (file: File): string | null => {
      const reader = new FileReader();
      reader.onload = () => {
        const parsed = parseBackup(reader.result);
        if (!parsed) {
          setSettingsError(
            'Import failed: not a valid APC Trainer backup file.',
          );
          return;
        }
        applyProgress(parsed.progress);
        applySettings(parsed.settings);
        setSettingsError(null);
        window.alert('Backup imported successfully.');
      };
      reader.onerror = () => {
        setSettingsError('Import failed: could not read the file.');
      };
      reader.readAsText(file);
      return null;
    },
    [applyProgress, applySettings],
  );

  // ---- Import confirm (from QR sync) ----

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

  const sprintSize = Math.min(
    settings.sprintLength,
    unlockedQuestionCount(progress, QUESTIONS),
  );

  return (
    <div className="min-h-[100dvh] bg-ink-950">
      <header className="safe-top sticky top-0 z-20 border-b border-slate-800/60 bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-2">
          <h1 className="text-base font-semibold tracking-tight text-slate-100">
            AP Physics C
          </h1>
          {view !== 'home' && (
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
              Sprint
            </span>
          )}
        </div>
      </header>

      <main className="safe-bottom">
        {view === 'home' && (
          <Dashboard
            progress={progress}
            sprintSize={sprintSize}
            onStartSprint={() => launchSprint()}
            onSync={() => setSyncOpen(true)}
            onUnlock={handleUnlock}
            onConceptBrief={(chapter) => setBriefChapter(chapter)}
            onReview={() => setReviewOpen(true)}
            onSettings={() => setSettingsOpen(true)}
          />
        )}
        {view === 'sprint' && sprint && (
          <SprintPlayer
            queue={sprint.queue}
            introInfo={sprint.introInfo}
            progress={progress}
            onProgressChange={applyProgress}
            onExit={handleSprintExit}
          />
        )}
      </main>

      {syncOpen && (
        <SyncModal
          progress={progress}
          onClose={() => setSyncOpen(false)}
          onImported={(p) => {
            setIncoming(p);
            setSyncOpen(false);
          }}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          error={settingsError}
          onChange={(s) => {
            applySettings(s);
            setSettingsError(null);
          }}
          onExport={handleExport}
          onImportFile={handleImportFile}
          onClose={() => {
            setSettingsOpen(false);
            setSettingsError(null);
          }}
        />
      )}

      {reviewOpen && (
        <ChapterReviewModal
          stats={getChapterStats(progress)}
          onStart={(chapters) => launchSprint(chapters)}
          onClose={() => setReviewOpen(false)}
        />
      )}

      {briefChapter !== null && (
        <ConceptBrief
          chapterTitle={
            CHAPTERS.find((c) => c.chapter === briefChapter)?.title ??
            `Chapter ${briefChapter}`
          }
          cards={briefCards}
          onClose={() => setBriefChapter(null)}
          onView={markBriefSeen}
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