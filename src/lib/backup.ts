import {
  parseProgress,
  PROGRESS_VERSION,
  type ProgressV1,
} from './progress';
import { clampSprintLength, defaultSettings, type Settings } from './settings';

export const BACKUP_VERSION = 1 as const;

export interface BackupFile {
  backupVersion: 1;
  progressVersion: 1;
  exportedAt: string;
  settings: Settings;
  progress: ProgressV1;
}

/** Build a portable backup object bundling settings + progress. */
export function buildBackup(
  progress: ProgressV1,
  settings: Settings,
): BackupFile {
  return {
    backupVersion: BACKUP_VERSION,
    progressVersion: PROGRESS_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    progress,
  };
}

export function serializeBackup(
  progress: ProgressV1,
  settings: Settings,
): string {
  return JSON.stringify(buildBackup(progress, settings), null, 2);
}

export interface ParsedBackup {
  progress: ProgressV1;
  settings: Settings;
}

/** Parse + validate a backup (object or JSON string). Null if unusable. */
export function parseBackup(raw: unknown): ParsedBackup | null {
  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return null;
  }
  const rec = obj as Record<string, unknown>;

  // Accept a bare progress blob too (version:1) for forward-compat.
  const progressRaw = rec.progress ?? rec;
  const progress = parseProgress(progressRaw);
  if (!progress) return null;

  const settingsRaw =
    typeof rec.settings === 'object' && rec.settings !== null
      ? (rec.settings as Record<string, unknown>)
      : {};
  const settings: Settings = {
    sprintLength:
      typeof settingsRaw.sprintLength === 'number'
        ? clampSprintLength(settingsRaw.sprintLength)
        : defaultSettings().sprintLength,
  };

  return { progress, settings };
}

/** Trigger a browser download of the backup JSON. */
export function downloadBackup(
  progress: ProgressV1,
  settings: Settings,
): void {
  if (typeof document === 'undefined') return;
  const text = serializeBackup(progress, settings);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `apc-trainer-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}