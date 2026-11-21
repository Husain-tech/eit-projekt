// The ONLY module that reads or writes stored data.
// Today it uses localStorage with made-up profiles. To move to a backend
// such as Supabase, replace the functions in this file and keep their names.

import type { Agreement, AppState, Connection, TestLog } from '../types';
import { demoProfiles } from './demoData';

const STATE_KEY = 'under-samme-tag.state.v1';
const DRAFT_PREFIX = 'under-samme-tag.draft.';
const LOG_KEY = 'under-samme-tag.testlog.v1';

export function freshState(): AppState {
  return {
    profiles: demoProfiles(),
    connections: [],
    currentUserId: null,
    textSize: 0,
    autoReplies: true,
    autoContinueAnswer: 'accepted',
    lang: 'da',
    blocks: [],
    timeOffsetDays: 0,
  };
}

function upgradeAgreement(a: Agreement | null): Agreement | null {
  if (!a) return a;
  const agreedAt = a.agreedAt ?? (a.studentConfirmed && a.hostConfirmed ? Date.now() : null);
  return { ...a, weekPlan: a.weekPlan ?? [], checkIns: a.checkIns ?? [], agreedAt };
}

/** Saved data from an older version lacks the newer fields. */
function upgradeConnection(c: Connection): Connection {
  return {
    ...c,
    studentContinue: c.studentContinue ?? null,
    hostContinue: c.hostContinue ?? null,
    agreement: upgradeAgreement(c.agreement),
    messages: c.messages ?? [],
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as AppState;
    if (!Array.isArray(parsed.profiles) || !Array.isArray(parsed.connections)) return freshState();
    return { ...freshState(), ...parsed, connections: parsed.connections.map(upgradeConnection) };
  } catch {
    // Storage can be blocked or broken. The app still works for this visit.
    return freshState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore: nothing useful to do without storage */
  }
}

/** Remove everything the tester did, including half-filled forms.
 * The test log is kept: resetting starts a new test session instead. */
export function resetAll(): AppState {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && (key === STATE_KEY || key.startsWith(DRAFT_PREFIX))) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  return freshState();
}

// Drafts keep what a user has typed, so a page reload does not lose it.

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// The test log for the test leader page. Kept apart from the app state, so
// "Nulstil demodata" can start a new session without losing the old ones.

export function loadTestLog(): TestLog {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const parsed = raw ? (JSON.parse(raw) as TestLog) : null;
    return parsed && Array.isArray(parsed.sessions) ? parsed : { sessions: [] };
  } catch {
    return { sessions: [] };
  }
}

export function saveTestLog(log: TestLog): void {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
}

export function clearTestLog(): void {
  try {
    localStorage.removeItem(LOG_KEY);
  } catch {
    /* ignore */
  }
}
