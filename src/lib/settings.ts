import {
  DEFAULT_SPRINT_SIZE,
  MAX_SPRINT_SIZE,
  MIN_SPRINT_SIZE,
} from './progress';

export interface Settings {
  /** Number of practice questions per sprint. */
  sprintLength: number;
}

export const SETTINGS_KEY = 'apc_settings_v1';

export function defaultSettings(): Settings {
  return { sprintLength: DEFAULT_SPRINT_SIZE };
}

export function clampSprintLength(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_SPRINT_SIZE;
  return Math.max(MIN_SPRINT_SIZE, Math.min(MAX_SPRINT_SIZE, Math.round(n)));
}

export function loadSettings(): Settings {
  if (typeof localStorage === 'undefined') return defaultSettings();
  try {
    const text = localStorage.getItem(SETTINGS_KEY);
    if (!text) return defaultSettings();
    const raw = JSON.parse(text) as Record<string, unknown>;
    return {
      sprintLength:
        typeof raw.sprintLength === 'number'
          ? clampSprintLength(raw.sprintLength)
          : DEFAULT_SPRINT_SIZE,
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(s: Settings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}