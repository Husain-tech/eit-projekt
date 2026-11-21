// The test log: what a tester does in this browser, for the test leader page.
//
// Rule: never log text a tester typed. Only event codes, form step and field
// keys, made-up demo names, match levels, timings and settings.
//
// Storage goes through data/store.ts. The summary and CSV functions are pure,
// so they can be unit tested.

import { loadTestLog, newId, saveTestLog } from '../data/store';
import type { Dict } from '../i18n';
import type { LogEvent, LogEventType, Profile, TestLog, TestSession } from '../types';

function newSession(now = Date.now()): TestSession {
  return { id: newId().slice(0, 8), startedAt: now, events: [{ at: now, type: 'session_start' }] };
}

/** Adds one event to the current session. Starts a session if there is none. */
export function logEvent(event: Omit<LogEvent, 'at'>): void {
  const log = loadTestLog();
  if (log.sessions.length === 0) log.sessions.push(newSession());
  const session = log.sessions[log.sessions.length - 1];
  const last = session.events[session.events.length - 1];
  const entry: LogEvent = { at: Date.now(), ...event };
  // React runs some effects twice in development. Skip exact repeats within a second.
  if (last && last.type === entry.type && last.step === entry.step && last.value === entry.value
    && last.field === entry.field && last.other === entry.other && entry.at - last.at < 1000
    && (entry.type === 'page_view' || entry.type === 'text_size' || entry.type === 'language')) {
    return;
  }
  session.events.push(entry);
  saveTestLog(log);
}

/** Called when the demo is reset: the next tester gets a fresh session. */
export function startNewSession(): void {
  const log = loadTestLog();
  log.sessions.push(newSession());
  saveTestLog(log);
}

export function readLog(): TestLog {
  return loadTestLog();
}

/** How the log names another person. A tester's own profile is never named. */
export function otherLabel(p: Profile): string {
  return p.isDemo ? p.firstName : '#own';
}

/** Route patterns, so ids never end up in the log. */
export function routePattern(path: string): string {
  return path.replace(/^\/forloeb\/[^/]+/, '/forloeb/:id');
}

// ---------- Summary ----------

export interface StepRow { step: string; count: number; totalMs: number; errors: number }
export interface MatchRow { other: string; fit?: string; rank?: number; at: number }
export interface ErrorRow { step: string; field: string; count: number }
export interface Milestone { type: LogEventType; at: number; other?: string; value?: string }
export interface AnswerRow { other: string; value: string; step?: string; at: number }

export interface SessionSummary {
  startedAt: number;
  lastAt: number;
  role?: string;
  profile?: { kind: 'own' } | { kind: 'demo'; name: string };
  steps: StepRow[];
  accepted: MatchRow[];
  declined: MatchRow[];
  errors: ErrorRow[];
  choices: { type: 'text_size' | 'language'; value: string; at: number }[];
  milestones: Milestone[];
  /** Study email domain, if the tester verified (simulated). */
  verified?: string;
  checkins: AnswerRow[];
  blocks: AnswerRow[];
}

const MILESTONES: LogEventType[] = [
  'session_start', 'profile_picked', 'profile_saved', 'profile_edited',
  'match_accepted', 'match_declined', 'match_undo',
  'meeting_proposed', 'meeting_confirmed', 'continue_yes', 'continue_no',
  'agreement_saved', 'agreement_confirmed', 'connection_stopped',
  'verified', 'blocked', 'unblocked', 'checkin', 'time_skipped',
  'filter_used', 'helper_used', 'message_sent', 'agreement_printed',
];

export const STEP_ORDER = ['about', 'home', 'room', 'help', 'rules', 'consent'];

export function summarise(session: TestSession): SessionSummary {
  const steps = new Map<string, StepRow>();
  const errors = new Map<string, ErrorRow>();
  const sum: SessionSummary = {
    startedAt: session.startedAt,
    lastAt: session.events[session.events.length - 1]?.at ?? session.startedAt,
    steps: [], accepted: [], declined: [], errors: [], choices: [], milestones: [], checkins: [], blocks: [],
  };
  const stepRow = (step: string) => {
    if (!steps.has(step)) steps.set(step, { step, count: 0, totalMs: 0, errors: 0 });
    return steps.get(step)!;
  };

  for (const e of session.events) {
    if (e.role && (e.type === 'profile_saved' || e.type === 'profile_picked')) sum.role = e.role;
    if (e.type === 'profile_saved') sum.profile = { kind: 'own' };
    if (e.type === 'profile_picked' && e.other) sum.profile = { kind: 'demo', name: e.other };
    if (e.type === 'form_step_done' && e.step) {
      const row = stepRow(e.step);
      row.count += 1;
      row.totalMs += e.durationMs ?? 0;
    }
    if (e.type === 'validation_error' && e.step && e.field) {
      if (STEP_ORDER.includes(e.step)) stepRow(e.step).errors += 1;
      const key = `${e.step}|${e.field}`;
      const row = errors.get(key) ?? { step: e.step, field: e.field, count: 0 };
      row.count += 1;
      errors.set(key, row);
    }
    if (e.type === 'match_accepted') sum.accepted.push({ other: e.other ?? '', fit: e.fit, rank: e.rank, at: e.at });
    if (e.type === 'match_declined') sum.declined.push({ other: e.other ?? '', fit: e.fit, rank: e.rank, at: e.at });
    if ((e.type === 'text_size' || e.type === 'language') && e.value !== undefined) {
      sum.choices.push({ type: e.type, value: e.value, at: e.at });
    }
    if (e.type === 'verified') sum.verified = e.value;
    if (e.type === 'checkin') sum.checkins.push({ other: e.other ?? '', value: e.value ?? '', step: e.step, at: e.at });
    if (e.type === 'blocked') sum.blocks.push({ other: e.other ?? '', value: e.value ?? '', at: e.at });
    if (MILESTONES.includes(e.type)) sum.milestones.push({ type: e.type, at: e.at, other: e.other, value: e.value });
  }

  sum.steps = [...steps.values()].sort((a, b) => STEP_ORDER.indexOf(a.step) - STEP_ORDER.indexOf(b.step));
  sum.errors = [...errors.values()];
  return sum;
}

// ---------- CSV ----------

function cell(value: string | number | undefined): string {
  if (value === undefined) return '';
  const text = String(value);
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One row per event. Semicolons, so Danish Excel opens it in columns. */
export function toCsv(sessions: TestSession[], t: Dict): string {
  const c = t.test.csv;
  const header = [c.session, c.time, c.seconds, c.event, c.eventText, c.role, c.step, c.field, c.person, c.fit, c.rank, c.value, c.duration];
  const rows = [header.join(';')];
  for (const s of sessions) {
    for (const e of s.events) {
      rows.push([
        cell(s.id),
        cell(new Date(e.at).toISOString()),
        cell(Math.round((e.at - s.startedAt) / 1000)),
        cell(e.type),
        cell(t.test.events[e.type]),
        cell(e.role),
        cell(e.step),
        cell(e.field),
        cell(e.other === '#own' ? t.test.ownOther : e.other),
        cell(e.fit),
        cell(e.rank),
        cell(e.value),
        cell(e.durationMs === undefined ? undefined : Math.round(e.durationMs / 1000)),
      ].join(';'));
    }
  }
  // A byte order mark makes Excel read æ, ø and å correctly.
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
