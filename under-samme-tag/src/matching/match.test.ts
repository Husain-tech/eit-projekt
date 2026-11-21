import { describe, expect, it } from 'vitest';
import { en } from '../i18n';
import { rankHostsForStudent, scoreMatch } from './match';
import type { HostProfile, StudentProfile } from '../types';

const student = (over: Partial<StudentProfile> = {}): StudentProfile => ({
  id: 's', role: 'student', isDemo: true, firstName: 'Anna', study: 'Test',
  budget: 2500, moveIn: '2027-02', areas: ['Dalum'],
  offers: ['indkob', 'samvaer'], hoursPerWeek: 6,
  motivations: ['selskab', 'husleje'], hasPet: false, smokes: false, intro: '',
  ...over,
});

const host = (over: Partial<HostProfile> = {}): HostProfile => ({
  id: 'h', role: 'host', isDemo: true, firstName: 'Bent', area: 'Dalum',
  roomDescription: '', rent: 2000, availableFrom: '2027-01',
  petsAllowed: false, smokingAllowed: false, quietHours: '',
  wants: ['indkob', 'samvaer'], hoursWanted: 6, intro: '',
  ...over,
});

describe('scoreMatch', () => {
  it('gives a full score when everything fits', () => {
    const r = scoreMatch(student(), host());
    expect(r.score).toBe(100);
    expect(r.level).toBe('good');
    expect(r.toDiscuss).toHaveLength(0);
    expect(r.reasons.length).toBeGreaterThan(3);
  });

  it('rewards a student who offers company over one who only wants low rent', () => {
    const caring = scoreMatch(student(), host());
    const rentOnly = scoreMatch(student({ offers: ['indkob'], motivations: ['husleje'] }), host());
    expect(caring.score - rentOnly.score).toBe(18);
    expect(rentOnly.toDiscuss.some((t) => t.includes('samvær'))).toBe(true);
    expect(rentOnly.toDiscuss.some((t) => t.includes('lavere husleje'))).toBe(true);
  });

  it('never calls it a good match when a house rule is broken', () => {
    const r = scoreMatch(student({ hasPet: true }), host({ petsAllowed: false }));
    expect(r.score).toBeLessThanOrEqual(45);
    expect(r.level).toBe('weak');
    expect(r.toDiscuss.some((t) => t.includes('kæledyr'))).toBe(true);
  });

  it('accepts a pet when the host allows pets', () => {
    const r = scoreMatch(student({ hasPet: true }), host({ petsAllowed: true }));
    expect(r.score).toBe(100);
  });

  it('gives partial points when the rent is a little above the budget', () => {
    const ok = scoreMatch(student({ budget: 2000 }), host({ rent: 2000 }));
    const little = scoreMatch(student({ budget: 2000 }), host({ rent: 2200 }));
    const tooMuch = scoreMatch(student({ budget: 2000 }), host({ rent: 3000 }));
    expect(ok.score - little.score).toBe(10);
    expect(ok.score - tooMuch.score).toBe(20);
  });

  it('treats an empty area list as "everywhere"', () => {
    const anywhere = scoreMatch(student({ areas: [] }), host({ area: 'Næsby' }));
    const elsewhere = scoreMatch(student({ areas: ['Dalum'] }), host({ area: 'Næsby' }));
    expect(anywhere.score - elsewhere.score).toBe(15);
  });

  it('notes it when the student offers fewer hours than the host wants', () => {
    const r = scoreMatch(student({ hoursPerWeek: 3 }), host({ hoursWanted: 8 }));
    expect(r.toDiscuss.some((t) => t.includes('timer'))).toBe(true);
  });

  it('does not punish a student for not offering company when the host does not want it', () => {
    const r = scoreMatch(student({ offers: ['indkob'] }), host({ wants: ['indkob'] }));
    expect(r.toDiscuss.some((t) => t.includes('samvær'))).toBe(false);
    expect(r.level).toBe('good');
  });

  it('loses points when the room is free later than the student needs it', () => {
    const r = scoreMatch(student({ moveIn: '2027-01' }), host({ availableFrom: '2027-05' }));
    expect(r.score).toBe(88);
  });
});

describe('rankHostsForStudent', () => {
  it('puts the best match first', () => {
    const ranked = rankHostsForStudent(student(), [
      host({ id: 'far', area: 'Næsby', rent: 4000 }),
      host({ id: 'best' }),
    ]);
    expect(ranked[0].other.id).toBe('best');
  });
});

describe('scoreMatch in English', () => {
  it('gives the same score and English reasons', () => {
    const daResult = scoreMatch(student(), host());
    const enResult = scoreMatch(student(), host(), en);
    expect(enResult.score).toBe(daResult.score);
    expect(enResult.reasons).toHaveLength(daResult.reasons.length);
    expect(enResult.reasons.join(' ')).toContain('house rules');
  });
});
