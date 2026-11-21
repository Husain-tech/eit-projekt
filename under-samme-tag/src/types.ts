// Shared types for the whole prototype.

export type Role = 'student' | 'host';

/** Kinds of help a student can offer and a host can ask for. */
export type HelpType = 'indkob' | 'teknologi' | 'rengoring' | 'have' | 'samvaer';

/** Why a student wants to live this way. Used by the matching. */
export type Motivation = 'husleje' | 'selskab' | 'oplevelse' | 'hjaelpe';

export interface StudentProfile {
  id: string;
  role: 'student';
  firstName: string;
  study: string;
  /** Highest rent per month in kr. */
  budget: number;
  /** Wanted move-in month, 'YYYY-MM'. */
  moveIn: string;
  /** Areas the student wants to live in. Empty means everywhere. */
  areas: string[];
  offers: HelpType[];
  hoursPerWeek: number;
  motivations: Motivation[];
  hasPet: boolean;
  smokes: boolean;
  intro: string;
  isDemo: boolean;
  /**
   * Simulated check: the domain of a study email, for example 'student.sdu.dk'.
   * Empty or missing means not verified. The email itself is never stored.
   */
  verifiedDomain?: string;
}

export interface HostProfile {
  id: string;
  role: 'host';
  firstName: string;
  /** Area only. The prototype never stores an exact address. */
  area: string;
  roomDescription: string;
  /** Rent per month in kr. */
  rent: number;
  /** Month the room is free from, 'YYYY-MM'. */
  availableFrom: string;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  quietHours: string;
  wants: HelpType[];
  hoursWanted: number;
  intro: string;
  isDemo: boolean;
  /** Helper mode: who filled in the profile together with the host. Never a name. */
  helper?: HelperRelation;
}

export type HelperRelation = 'child' | 'grandchild' | 'family' | 'friend' | 'other';

/** A message in a pair's thread. Kept in this browser only, never in the test log. */
export interface Message {
  from: Role;
  text: string;
  at: number;
}

export type Profile = StudentProfile | HostProfile;

export type Decision = 'accepted' | 'declined';

export interface Meeting {
  proposedBy: Role;
  /** 'YYYY-MM-DD' */
  date: string;
  /** 'HH:MM' */
  time: string;
  place: string;
  confirmed: boolean;
}

/** One day in the weekly plan. `day` is 0 for Monday to 6 for Sunday. */
export interface PlanDay {
  day: number;
  task: HelpType;
  hours: number;
}

export type CheckInAnswer = 'good' | 'mixed' | 'bad';

/** A private answer to "Hvordan går det?" for one week of the trial period. */
export interface CheckIn {
  role: Role;
  week: number;
  answer: CheckInAnswer;
}

export interface Agreement {
  rent: number;
  hoursPerWeek: number;
  tasks: HelpType[];
  rules: string;
  startMonth: string;
  trialWeeks: number;
  noticeWeeks: number;
  weekPlan: PlanDay[];
  studentConfirmed: boolean;
  hostConfirmed: boolean;
  /** When both had said yes (demo time). The trial period starts here. */
  agreedAt: number | null;
  checkIns: CheckIn[];
}

export type BlockReason = 'rude' | 'fake' | 'unsafe' | 'other';

/** One person has blocked another. They no longer see each other. */
export interface Block {
  byId: string;
  blockedId: string;
  reason: BlockReason | null;
}

/** One student and one host, and how far they have come. */
export interface Connection {
  id: string;
  studentId: string;
  hostId: string;
  studentDecision: Decision | null;
  hostDecision: Decision | null;
  meeting: Meeting | null;
  /** After the first meeting, each side answers privately: go on or not. */
  studentContinue: Decision | null;
  hostContinue: Decision | null;
  agreement: Agreement | null;
  messages: Message[];
}

export type TextSize = 0 | 1 | 2;

export type Lang = 'da' | 'en';

export interface AppState {
  profiles: Profile[];
  connections: Connection[];
  currentUserId: string | null;
  textSize: TextSize;
  /** Prototype only: the other side answers by itself after a moment. */
  autoReplies: boolean;
  /** Prototype only: what the automatic reply says after the first meeting. Set on /test. */
  autoContinueAnswer: Decision;
  lang: Lang;
  blocks: Block[];
  /** Prototype only: days the test leader has moved time forward on /test. */
  timeOffsetDays: number;
}

// ---------- Test log (the test leader page at /test) ----------
// Only codes, step names, timings and made-up names. Never text a tester typed.

export type LogEventType =
  | 'session_start' | 'page_view' | 'profile_picked'
  | 'form_step_done' | 'form_step_back' | 'validation_error'
  | 'profile_saved' | 'profile_edited'
  | 'match_accepted' | 'match_declined' | 'match_undo'
  | 'meeting_proposed' | 'meeting_confirmed'
  | 'continue_yes' | 'continue_no'
  | 'agreement_saved' | 'agreement_confirmed' | 'connection_stopped'
  | 'text_size' | 'language'
  | 'verified' | 'blocked' | 'unblocked' | 'checkin' | 'time_skipped'
  | 'filter_used' | 'helper_used' | 'message_sent' | 'agreement_printed';

export interface LogEvent {
  /** Milliseconds since 1970, from Date.now(). */
  at: number;
  type: LogEventType;
  /** Which role the tester is using when it happened. */
  role?: Role;
  /** A form step key or a page route, for example 'about' or '/forslag'. */
  step?: string;
  /** A form field key, for example 'budget'. */
  field?: string;
  /** The other person: a made-up first name, or '#own' for a profile a tester made. */
  other?: string;
  fit?: 'good' | 'partly' | 'weak';
  /** Place in the suggestion list, 1 is the top. */
  rank?: number;
  /** A short code, for example 'create', 'edit', 'da' or '1'. */
  value?: string;
  durationMs?: number;
}

export interface TestSession {
  id: string;
  startedAt: number;
  events: LogEvent[];
}

export interface TestLog {
  sessions: TestSession[];
}
