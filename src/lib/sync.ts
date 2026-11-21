import LZString from 'lz-string';
import { parseProgress, type ProgressV1 } from './progress';

const HASH_PREFIX = '#sync=';

export function buildSyncUrl(progress: ProgressV1): string {
  const payload = LZString.compressToEncodedURIComponent(
    JSON.stringify(progress),
  );
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return `${base}${HASH_PREFIX}${payload}`;
}

function extractPayload(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const hashIdx = trimmed.indexOf(HASH_PREFIX);
  if (hashIdx >= 0) {
    return trimmed.slice(hashIdx + HASH_PREFIX.length);
  }
  // Bare payload (no URL wrapper)
  return trimmed;
}

export interface DecodeResult {
  ok: true;
  progress: ProgressV1;
}
export interface DecodeError {
  ok: false;
  error: string;
}

/** Decode a full sync URL or bare lz-string payload into progress. */
export function decodeSyncPayload(input: string): DecodeResult | DecodeError {
  const payload = extractPayload(input);
  if (!payload) return { ok: false, error: 'Empty sync data.' };

  let json: string | null = null;
  try {
    json = LZString.decompressFromEncodedURIComponent(payload);
  } catch {
    return { ok: false, error: 'Could not decompress sync data.' };
  }
  if (!json) return { ok: false, error: 'Sync data is corrupt or incomplete.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Sync data is not valid JSON.' };
  }

  const progress = parseProgress(parsed);
  if (!progress) {
    return { ok: false, error: 'Unsupported or invalid progress format.' };
  }
  return { ok: true, progress };
}

/** Read a `#sync=` hash from the current URL, if present. */
export function readHashPayload(): string | null {
  if (typeof window === 'undefined') return null;
  const { hash } = window.location;
  if (hash.startsWith(HASH_PREFIX)) {
    return hash.slice(HASH_PREFIX.length);
  }
  return null;
}

export function stripSyncHash(): void {
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  window.history.replaceState(null, '', pathname + search);
}

export function totalAttempts(progress: ProgressV1): number {
  return Object.values(progress.questions).reduce(
    (sum, q) => sum + q.attempts,
    0,
  );
}

export function attemptedQuestionCount(progress: ProgressV1): number {
  return Object.values(progress.questions).filter((q) => q.attempts > 0).length;
}