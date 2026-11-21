// Matching logic. Pure functions, no storage and no React, so it is easy
// to test and to explain in the report.
//
// A student and a host get a score from 0 to 100, made of six parts:
//   area 15, time 12, rent 20, house rules 15, practical help 20, company 18.
// Company and motivation weigh heavily on purpose: our interviews showed
// that hosts worry about students who only come for the low rent.
//
// Every score comes with reasons in plain words, so the user can see why.
// The words come from src/i18n (Danish unless another dictionary is passed).

import { da, type Dict } from '../i18n';
import { formatKr, formatMonth } from '../labels';
import type { HostProfile, StudentProfile } from '../types';

export type FitLevel = 'good' | 'partly' | 'weak';

export interface MatchResult {
  score: number;
  level: FitLevel;
  /** What fits. Shown as "Derfor passer I sammen". */
  reasons: string[];
  /** What does not fit yet. Shown as "Tal om det, når I mødes". */
  toDiscuss: string[];
}

function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

export function scoreMatch(student: StudentProfile, host: HostProfile, t: Dict = da): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  const toDiscuss: string[] = [];
  let ruleConflict = false;
  const m = t.match;
  const s = student.firstName;
  const h = host.firstName;
  const month = (x: string) => formatMonth(x, t);
  const kr = (x: number) => formatKr(x, t);

  // 1. Area (15)
  if (student.areas.length === 0) {
    score += 15;
    reasons.push(m.everywhere(s, host.area));
  } else if (student.areas.includes(host.area)) {
    score += 15;
    reasons.push(m.areaFits(host.area, s));
  } else {
    toDiscuss.push(m.areaOther(host.area, s));
  }

  // 2. Time (12). Positive gap = the room is free before the student moves in.
  const gap = monthsBetween(host.availableFrom, student.moveIn);
  if (gap >= 0 && gap <= 2) {
    score += 12;
    reasons.push(m.timeFits(month(host.availableFrom)));
  } else if (gap > 2) {
    score += 6;
    toDiscuss.push(m.timeEarly(month(host.availableFrom), s, month(student.moveIn)));
  } else if (gap === -1) {
    score += 6;
    toDiscuss.push(m.timeOneLate(month(host.availableFrom), s));
  } else {
    toDiscuss.push(m.timeLate(month(host.availableFrom), s, month(student.moveIn)));
  }

  // 3. Rent against budget (20)
  const sp = t.fmt.possessive(s);
  if (host.rent <= student.budget) {
    score += 20;
    reasons.push(m.rentFits(kr(host.rent), sp));
  } else if (host.rent <= student.budget * 1.15) {
    score += 10;
    toDiscuss.push(m.rentLittle(kr(host.rent), sp, kr(student.budget)));
  } else {
    toDiscuss.push(m.rentHigh(kr(host.rent), sp, kr(student.budget)));
  }

  // 4. House rules (15)
  if (student.hasPet && !host.petsAllowed) {
    ruleConflict = true;
    toDiscuss.push(m.petConflict(s, h));
  }
  if (student.smokes && !host.smokingAllowed) {
    ruleConflict = true;
    toDiscuss.push(m.smokeConflict(s, h));
  }
  if (!ruleConflict) {
    score += 15;
    reasons.push(m.rulesFit);
  }

  // 5. Practical help (20): how much of what the host wants does the student offer?
  const wanted = host.wants.filter((w) => w !== 'samvaer');
  const offered = wanted.filter((w) => student.offers.includes(w));
  if (wanted.length === 0) {
    score += 14;
  } else {
    let helpScore = (offered.length / wanted.length) * 14;
    if (student.hoursPerWeek >= host.hoursWanted) {
      helpScore += 6;
    } else {
      toDiscuss.push(m.hoursShort(h, host.hoursWanted, s, student.hoursPerWeek));
    }
    score += helpScore;
    if (offered.length > 0) {
      const names = t.fmt.list(offered.map((o) => t.help[o].toLowerCase()));
      reasons.push(m.helpFits(s, h, names));
    } else {
      toDiscuss.push(m.helpMissing(s, h));
    }
  }

  // 6. Company and motivation (18)
  const hostWantsCompany = host.wants.includes('samvaer');
  const studentOffersCompany = student.offers.includes('samvaer');
  const caresAboutPeople = student.motivations.includes('selskab') || student.motivations.includes('hjaelpe');
  if (hostWantsCompany) {
    if (studentOffersCompany) {
      score += 12;
      reasons.push(m.bothCompany);
      if (caresAboutPeople) score += 6;
    } else {
      toDiscuss.push(m.noCompany(h, s));
    }
    if (student.motivations.length === 1 && student.motivations[0] === 'husleje') {
      toDiscuss.push(m.rentOnly(s));
    }
  } else {
    score += 9;
    if (!studentOffersCompany) {
      reasons.push(m.neitherCompany);
    }
  }

  // A broken house rule is serious, so it can never be a good match.
  if (ruleConflict) score = Math.min(score, 45);

  const rounded = Math.round(score);
  const level: FitLevel = rounded >= 75 ? 'good' : rounded >= 50 ? 'partly' : 'weak';
  return { score: rounded, level, reasons, toDiscuss };
}


export interface RankedMatch<T> {
  other: T;
  result: MatchResult;
}

export function rankHostsForStudent(student: StudentProfile, hosts: HostProfile[], t: Dict = da): RankedMatch<HostProfile>[] {
  return hosts
    .map((host) => ({ other: host, result: scoreMatch(student, host, t) }))
    .sort((a, b) => b.result.score - a.result.score);
}

export function rankStudentsForHost(host: HostProfile, students: StudentProfile[], t: Dict = da): RankedMatch<StudentProfile>[] {
  return students
    .map((student) => ({ other: student, result: scoreMatch(student, host, t) }))
    .sort((a, b) => b.result.score - a.result.score);
}
