// App state for the whole prototype. Components read state and call the
// actions below. Storage itself lives in data/store.ts.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadState, newId, resetAll, saveState } from '../data/store';
import { DICTS, da, type Dict } from '../i18n';
import type {
  Agreement, AppState, BlockReason, CheckInAnswer, Connection, Decision, HostProfile, Lang, Meeting, Profile, Role,
  StudentProfile, TextSize,
} from '../types';
import { startNewSession } from './testLog';

type AgreementTerms = Omit<Agreement, 'studentConfirmed' | 'hostConfirmed' | 'agreedAt' | 'checkIns'>;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

/** Demo time: the real time plus what the test leader has moved forward on /test. */
function demoNow(s: AppState): number {
  return Date.now() + s.timeOffsetDays * DAY_MS;
}

/** When both have said yes, the trial period starts. */
function stampAgreed(a: Agreement, now: number): Agreement {
  return a.studentConfirmed && a.hostConfirmed && a.agreedAt === null ? { ...a, agreedAt: now } : a;
}

/** Trial period status for an agreement both have said yes to. */
export function trialStatus(a: Agreement, now: number) {
  const passed = Math.max(0, Math.floor((now - (a.agreedAt ?? now)) / WEEK_MS));
  return {
    week: Math.min(passed + 1, a.trialWeeks),
    weeksLeft: Math.max(0, a.trialWeeks - passed),
    over: passed >= a.trialWeeks,
    /** Which week a check-in now counts for. */
    checkInWeek: passed + 1,
  };
}

interface AppActions {
  selectProfile: (id: string) => void;
  signOut: () => void;
  saveProfile: (profile: Profile) => void;
  deleteProfile: (id: string) => void;
  /** The current user says yes or no to another profile. */
  decide: (otherId: string, decision: Decision | null) => void;
  proposeMeeting: (connectionId: string, meeting: Omit<Meeting, 'proposedBy' | 'confirmed'>) => void;
  confirmMeeting: (connectionId: string) => void;
  /** After the first meeting: does the current user want to go on? */
  answerContinue: (connectionId: string, decision: Decision) => void;
  saveAgreement: (connectionId: string, terms: AgreementTerms) => void;
  confirmAgreement: (connectionId: string) => void;
  setTextSize: (size: TextSize) => void;
  setLang: (lang: Lang) => void;
  setAutoReplies: (on: boolean) => void;
  setAutoContinueAnswer: (answer: Decision) => void;
  /** Block another person. They disappear from suggestions and connections, both ways. */
  block: (otherId: string, reason: BlockReason | null) => void;
  unblock: (otherId: string) => void;
  /** Private answer to "Hvordan går det?" for the current week of the trial period. */
  checkIn: (connectionId: string, answer: CheckInAnswer) => void;
  /** Prototype only: move demo time forward, or back to now. */
  skipTime: (days: number) => void;
  resetTime: () => void;
  /** Send a message in a pair's thread. Only after a mutual match. */
  sendMessage: (connectionId: string, text: string) => void;
  resetDemo: () => void;
}

interface AppContextValue extends AppActions {
  state: AppState;
  /** All interface text in the chosen language. */
  t: Dict;
  me: Profile | null;
  students: StudentProfile[];
  hosts: HostProfile[];
  getProfile: (id: string) => Profile | undefined;
  /** The connection between the current user and another profile, if any. */
  connectionWith: (otherId: string) => Connection | undefined;
  /** True if the current user and the other person have blocked each other, in either direction. */
  isHidden: (otherId: string) => boolean;
  /** People the current user has blocked. */
  myBlocks: { profile: Profile; reason: BlockReason | null }[];
  /** Demo time in milliseconds. */
  now: number;
}

const AppContext = createContext<AppContextValue | null>(null);

function sideKeys(role: Role) {
  return role === 'student'
    ? ({
      mine: 'studentDecision', theirs: 'hostDecision', myConfirm: 'studentConfirmed', theirConfirm: 'hostConfirmed',
      myContinue: 'studentContinue', theirContinue: 'hostContinue',
    } as const)
    : ({
      mine: 'hostDecision', theirs: 'studentDecision', myConfirm: 'hostConfirmed', theirConfirm: 'studentConfirmed',
      myContinue: 'hostContinue', theirContinue: 'studentContinue',
    } as const);
}

/** A connection is mutual when both sides said yes. */
export function isMutual(c: Connection): boolean {
  return c.studentDecision === 'accepted' && c.hostDecision === 'accepted';
}

/** Both said yes to going on after the first meeting. Only then can they write an agreement. */
export function bothContinue(c: Connection): boolean {
  return c.studentContinue === 'accepted' && c.hostContinue === 'accepted';
}

/** One of them said no after the first meeting, so the connection is over. */
export function isEnded(c: Connection): boolean {
  return c.studentContinue === 'declined' || c.hostContinue === 'declined';
}

export function isAgreed(c: Connection): boolean {
  return !!c.agreement && c.agreement.studentConfirmed && c.agreement.hostConfirmed;
}

/**
 * Demo profiles are stored with Danish texts. Show them in the chosen
 * language, unless someone has edited a text by hand.
 */
function localize(p: Profile, t: Dict): Profile {
  const source = da.demo[p.id];
  const target = t.demo[p.id];
  if (!p.isDemo || !source || !target || t === da) return p;
  const pick = (current: string, field: keyof typeof source) => (current === source[field] ? target[field] ?? current : current);
  if (p.role === 'student') {
    return { ...p, study: pick(p.study, 'study'), intro: pick(p.intro, 'intro') };
  }
  return {
    ...p,
    intro: pick(p.intro, 'intro'),
    roomDescription: pick(p.roomDescription, 'roomDescription'),
    quietHours: pick(p.quietHours, 'quietHours'),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const t = DICTS[state.lang] ?? da;

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Text size applies to the whole page through the root font size.
  useEffect(() => {
    document.documentElement.dataset.textSize = String(state.textSize);
  }, [state.textSize]);

  useEffect(() => {
    document.documentElement.lang = state.lang;
  }, [state.lang]);

  const profiles = useMemo(() => state.profiles.map((p) => localize(p, t)), [state.profiles, t]);

  const me = useMemo(
    () => profiles.find((p) => p.id === state.currentUserId) ?? null,
    [profiles, state.currentUserId],
  );

  const updateConnection = useCallback((id: string, change: (c: Connection) => Connection) => {
    setState((s) => ({ ...s, connections: s.connections.map((c) => (c.id === id ? change(c) : c)) }));
  }, []);

  // Prototype behaviour: the other side answers by itself after a moment,
  // so one tester can walk through the whole flow alone. It says yes, except
  // after the first meeting, where the test leader can choose the answer on
  // /test. Turn it off in the footer to play both sides by hand.
  useEffect(() => {
    if (!state.autoReplies || !me) return undefined;
    const k = sideKeys(me.role);
    const mine = state.connections.filter((c) => (me.role === 'student' ? c.studentId : c.hostId) === me.id);

    let job: (() => void) | null = null;
    const hidden = (id: string) => state.blocks.some((b) => (b.byId === me.id && b.blockedId === id) || (b.byId === id && b.blockedId === me.id));
    for (const c of mine) {
      if (c[k.mine] !== 'accepted' || c[k.theirs] === 'declined' || isEnded(c)) continue;
      if (hidden(me.role === 'student' ? c.hostId : c.studentId)) continue;
      if (c[k.theirs] === null) {
        job = () => updateConnection(c.id, (x) => ({ ...x, [k.theirs]: 'accepted' }));
      } else if (c.meeting && !c.meeting.confirmed && c.meeting.proposedBy === me.role) {
        job = () => updateConnection(c.id, (x) => (x.meeting ? { ...x, meeting: { ...x.meeting, confirmed: true } } : x));
      } else if (c.meeting?.confirmed && c[k.myContinue] === 'accepted' && c[k.theirContinue] === null) {
        const answer = state.autoContinueAnswer;
        job = () => updateConnection(c.id, (x) => ({ ...x, [k.theirContinue]: answer }));
      } else if (c.agreement && c.agreement[k.myConfirm] && !c.agreement[k.theirConfirm]) {
        job = () => setState((s) => ({
          ...s,
          connections: s.connections.map((x) => (x.id === c.id && x.agreement
            ? { ...x, agreement: stampAgreed({ ...x.agreement, [k.theirConfirm]: true }, demoNow(s)) }
            : x)),
        }));
      }
      if (job) break;
    }
    if (!job) return undefined;
    const timer = window.setTimeout(job, 1800);
    return () => window.clearTimeout(timer);
  }, [state.autoReplies, state.autoContinueAnswer, state.connections, state.blocks, me, updateConnection]);

  // Messages get the same automatic reply: a ready-made, friendly answer
  // after a moment, when the last message is from the current user.
  useEffect(() => {
    if (!state.autoReplies || !me) return undefined;
    const theirRole: Role = me.role === 'student' ? 'host' : 'student';
    const waiting = state.connections.find((c) => {
      if ((me.role === 'student' ? c.studentId : c.hostId) !== me.id) return false;
      if (!isMutual(c) || isEnded(c) || !c.messages?.length) return false;
      const otherId = me.role === 'student' ? c.hostId : c.studentId;
      if (state.blocks.some((b) => (b.byId === me.id && b.blockedId === otherId) || (b.byId === otherId && b.blockedId === me.id))) return false;
      return c.messages[c.messages.length - 1].from === me.role;
    });
    if (!waiting) return undefined;
    const replies = t.messages.replies;
    const count = waiting.messages.filter((m) => m.from === theirRole).length;
    const text = replies[Math.min(count, replies.length - 1)];
    const timer = window.setTimeout(() => setState((s) => ({
      ...s,
      connections: s.connections.map((c) => (c.id === waiting.id
        ? { ...c, messages: [...c.messages, { from: theirRole, text, at: demoNow(s) }] }
        : c)),
    })), 1800);
    return () => window.clearTimeout(timer);
  }, [state.autoReplies, state.connections, state.blocks, me, t]);

  const actions: AppActions = useMemo(() => ({
    selectProfile: (id) => setState((s) => ({ ...s, currentUserId: id })),
    signOut: () => setState((s) => ({ ...s, currentUserId: null })),

    saveProfile: (profile) => setState((s) => {
      const exists = s.profiles.some((p) => p.id === profile.id);
      return {
        ...s,
        profiles: exists ? s.profiles.map((p) => (p.id === profile.id ? profile : p)) : [...s.profiles, profile],
        currentUserId: profile.id,
      };
    }),

    deleteProfile: (id) => setState((s) => ({
      ...s,
      profiles: s.profiles.filter((p) => p.id !== id),
      connections: s.connections.filter((c) => c.studentId !== id && c.hostId !== id),
      currentUserId: s.currentUserId === id ? null : s.currentUserId,
    })),

    decide: (otherId, decision) => setState((s) => {
      const self = s.profiles.find((p) => p.id === s.currentUserId);
      if (!self) return s;
      const k = sideKeys(self.role);
      const studentId = self.role === 'student' ? self.id : otherId;
      const hostId = self.role === 'host' ? self.id : otherId;
      const existing = s.connections.find((c) => c.studentId === studentId && c.hostId === hostId);
      if (existing) {
        // Saying no (or taking back a yes) also clears the meeting, the answers after it and the agreement.
        const cleared = decision === 'accepted' ? {} : { meeting: null, agreement: null, studentContinue: null, hostContinue: null };
        return {
          ...s,
          connections: s.connections.map((c) => (c.id === existing.id ? { ...c, ...cleared, [k.mine]: decision } : c)),
        };
      }
      const created: Connection = {
        id: newId(), studentId, hostId, studentDecision: null, hostDecision: null, meeting: null,
        studentContinue: null, hostContinue: null, agreement: null, messages: [],
        [k.mine]: decision,
      };
      return { ...s, connections: [...s.connections, created] };
    }),

    proposeMeeting: (connectionId, meeting) => setState((s) => {
      const self = s.profiles.find((p) => p.id === s.currentUserId);
      if (!self) return s;
      return {
        ...s,
        connections: s.connections.map((c) => (c.id === connectionId
          // A new time means the answers after the meeting start over.
          ? { ...c, meeting: { ...meeting, proposedBy: self.role, confirmed: false }, studentContinue: null, hostContinue: null }
          : c)),
      };
    }),

    confirmMeeting: (connectionId) => updateConnection(connectionId, (c) => (
      c.meeting ? { ...c, meeting: { ...c.meeting, confirmed: true } } : c
    )),

    answerContinue: (connectionId, decision) => setState((s) => {
      const self = s.profiles.find((p) => p.id === s.currentUserId);
      if (!self) return s;
      const k = sideKeys(self.role);
      return {
        ...s,
        connections: s.connections.map((c) => (c.id === connectionId ? { ...c, [k.myContinue]: decision } : c)),
      };
    }),

    // Saving new terms counts as a yes from the one who wrote them, and the
    // other side has to confirm again.
    saveAgreement: (connectionId, terms) => setState((s) => {
      const self = s.profiles.find((p) => p.id === s.currentUserId);
      if (!self) return s;
      return {
        ...s,
        connections: s.connections.map((c) => (c.id === connectionId
          ? {
            ...c,
            agreement: {
              ...terms, studentConfirmed: self.role === 'student', hostConfirmed: self.role === 'host', agreedAt: null, checkIns: [],
            },
          }
          : c)),
      };
    }),

    confirmAgreement: (connectionId) => setState((s) => {
      const self = s.profiles.find((p) => p.id === s.currentUserId);
      if (!self) return s;
      const k = sideKeys(self.role);
      return {
        ...s,
        connections: s.connections.map((c) => (c.id === connectionId && c.agreement
          ? { ...c, agreement: stampAgreed({ ...c.agreement, [k.myConfirm]: true }, demoNow(s)) }
          : c)),
      };
    }),

    setTextSize: (size) => setState((s) => ({ ...s, textSize: size })),
    setLang: (lang) => setState((s) => ({ ...s, lang })),
    setAutoReplies: (on) => setState((s) => ({ ...s, autoReplies: on })),
    setAutoContinueAnswer: (answer) => setState((s) => ({ ...s, autoContinueAnswer: answer })),

    block: (otherId, reason) => setState((s) => {
      if (!s.currentUserId || s.blocks.some((b) => b.byId === s.currentUserId && b.blockedId === otherId)) return s;
      return { ...s, blocks: [...s.blocks, { byId: s.currentUserId, blockedId: otherId, reason }] };
    }),

    unblock: (otherId) => setState((s) => ({
      ...s,
      blocks: s.blocks.filter((b) => !(b.byId === s.currentUserId && b.blockedId === otherId)),
    })),

    checkIn: (connectionId, answer) => setState((s) => {
      const self = s.profiles.find((p) => p.id === s.currentUserId);
      if (!self) return s;
      return {
        ...s,
        connections: s.connections.map((c) => {
          if (c.id !== connectionId || !c.agreement) return c;
          const week = trialStatus(c.agreement, demoNow(s)).checkInWeek;
          const others = c.agreement.checkIns.filter((x) => !(x.role === self.role && x.week === week));
          return { ...c, agreement: { ...c.agreement, checkIns: [...others, { role: self.role, week, answer }] } };
        }),
      };
    }),

    skipTime: (days) => setState((s) => ({ ...s, timeOffsetDays: s.timeOffsetDays + days })),
    resetTime: () => setState((s) => ({ ...s, timeOffsetDays: 0 })),

    sendMessage: (connectionId, text) => setState((s) => {
      const self = s.profiles.find((p) => p.id === s.currentUserId);
      if (!self || !text.trim()) return s;
      return {
        ...s,
        connections: s.connections.map((c) => (c.id === connectionId && isMutual(c) && !isEnded(c)
          ? { ...c, messages: [...(c.messages ?? []), { from: self.role, text: text.trim(), at: demoNow(s) }] }
          : c)),
      };
    }),
    resetDemo: () => {
      startNewSession();
      setState((s) => ({
        ...resetAll(), textSize: s.textSize, lang: s.lang, autoContinueAnswer: s.autoContinueAnswer,
      }));
    },
  }), [updateConnection]);

  const value: AppContextValue = useMemo(() => {
    const isHidden = (otherId: string) => !!me && state.blocks.some((b) => (
      (b.byId === me.id && b.blockedId === otherId) || (b.byId === otherId && b.blockedId === me.id)
    ));
    const visible = profiles.filter((p) => !isHidden(p.id));
    const students = visible.filter((p): p is StudentProfile => p.role === 'student');
    const hosts = visible.filter((p): p is HostProfile => p.role === 'host');
    const myBlocks = me
      ? state.blocks
        .filter((b) => b.byId === me.id)
        .map((b) => ({ profile: profiles.find((p) => p.id === b.blockedId), reason: b.reason }))
        .filter((b): b is { profile: Profile; reason: BlockReason | null } => !!b.profile)
      : [];
    return {
      state,
      t,
      me,
      students,
      hosts,
      isHidden,
      myBlocks,
      now: Date.now() + state.timeOffsetDays * DAY_MS,
      getProfile: (id) => profiles.find((p) => p.id === id),
      connectionWith: (otherId) => (me
        ? state.connections.find((c) => (me.role === 'student'
          ? c.studentId === me.id && c.hostId === otherId
          : c.hostId === me.id && c.studentId === otherId))
        : undefined),
      ...actions,
    };
  }, [state, t, profiles, me, actions]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

/** Helpers that read a connection from the current user's side. */
export function viewFor(role: Role, c: Connection) {
  const k = sideKeys(role);
  return {
    myDecision: c[k.mine],
    theirDecision: c[k.theirs],
    myContinue: c[k.myContinue],
    theirContinue: c[k.theirContinue],
    otherId: role === 'student' ? c.hostId : c.studentId,
    iConfirmed: c.agreement ? c.agreement[k.myConfirm] : false,
    theyConfirmed: c.agreement ? c.agreement[k.theirConfirm] : false,
  };
}
