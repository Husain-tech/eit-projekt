import { describe, expect, it } from 'vitest';
import { studyDomain } from '../labels';
import { suggestPlan } from '../pages/Agreement';
import type { Agreement } from '../types';
import { WEEK_MS, trialStatus } from './AppContext';

describe('studyDomain (simulated student check)', () => {
  it('accepts Danish study emails, also on sub-domains', () => {
    expect(studyDomain('anna@student.sdu.dk')).toBe('student.sdu.dk');
    expect(studyDomain(' Anna@SDU.DK ')).toBe('sdu.dk');
    expect(studyDomain('ole@edu.ucl.dk')).toBe('edu.ucl.dk');
  });
  it('rejects other emails and text that is not an email', () => {
    expect(studyDomain('anna@gmail.com')).toBeNull();
    expect(studyDomain('anna@fakesdu.dk')).toBeNull();
    expect(studyDomain('sdu.dk')).toBeNull();
    expect(studyDomain('')).toBeNull();
  });
});

const agreement = (over: Partial<Agreement> = {}): Agreement => ({
  rent: 2000, hoursPerWeek: 6, tasks: ['indkob'], rules: '', startMonth: '2027-01', trialWeeks: 4, noticeWeeks: 2,
  weekPlan: [], studentConfirmed: true, hostConfirmed: true, agreedAt: 0, checkIns: [], ...over,
});

describe('trialStatus', () => {
  it('counts down the weeks and ends', () => {
    expect(trialStatus(agreement(), 0)).toMatchObject({ week: 1, weeksLeft: 4, over: false, checkInWeek: 1 });
    expect(trialStatus(agreement(), WEEK_MS * 1.5)).toMatchObject({ week: 2, weeksLeft: 3, over: false, checkInWeek: 2 });
    expect(trialStatus(agreement(), WEEK_MS * 4)).toMatchObject({ weeksLeft: 0, over: true });
  });
});

describe('suggestPlan', () => {
  it('spreads the agreed hours over a few days', () => {
    for (const hours of [1, 3, 6, 10, 15, 16, 20]) {
      const plan = suggestPlan(hours, ['indkob', 'samvaer']);
      expect(plan.reduce((n, d) => n + d.hours, 0)).toBe(hours);
      expect(new Set(plan.map((d) => d.day)).size).toBe(plan.length);
    }
  });
  it('makes no plan without tasks or hours', () => {
    expect(suggestPlan(0, ['indkob'])).toEqual([]);
    expect(suggestPlan(4, [])).toEqual([]);
  });
});
