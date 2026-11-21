import { describe, expect, it } from 'vitest';
import { da, en } from '../i18n';
import type { TestSession } from '../types';
import { routePattern, summarise, toCsv } from './testLog';

const session: TestSession = {
  id: 'abc12345',
  startedAt: 1_000_000,
  events: [
    { at: 1_000_000, type: 'session_start' },
    { at: 1_005_000, type: 'validation_error', step: 'about', field: 'firstName', role: 'student' },
    { at: 1_020_000, type: 'form_step_done', step: 'about', role: 'student', durationMs: 20_000 },
    { at: 1_050_000, type: 'form_step_done', step: 'home', role: 'student', durationMs: 30_000 },
    { at: 1_060_000, type: 'profile_saved', role: 'student' },
    { at: 1_070_000, type: 'match_accepted', role: 'student', other: 'Inger', fit: 'good', rank: 1 },
    { at: 1_080_000, type: 'match_declined', role: 'student', other: '#own', fit: 'weak', rank: 6 },
    { at: 1_090_000, type: 'text_size', value: '2' },
  ],
};

describe('summarise', () => {
  it('adds up steps, errors, matches and choices', () => {
    const s = summarise(session);
    expect(s.role).toBe('student');
    expect(s.profile).toEqual({ kind: 'own' });
    expect(s.steps.map((r) => r.step)).toEqual(['about', 'home']);
    expect(s.steps[0]).toMatchObject({ count: 1, totalMs: 20_000, errors: 1 });
    expect(s.errors).toEqual([{ step: 'about', field: 'firstName', count: 1 }]);
    expect(s.accepted).toHaveLength(1);
    expect(s.declined[0]).toMatchObject({ other: '#own', fit: 'weak', rank: 6 });
    expect(s.choices).toEqual([{ type: 'text_size', value: '2', at: 1_090_000 }]);
  });
});

describe('toCsv', () => {
  it('writes one row per event and never names a tester profile', () => {
    const csv = toCsv([session], da);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(session.events.length + 1);
    expect(csv.startsWith('\uFEFFtest;tidspunkt;')).toBe(true);
    expect(lines[0]).toContain(';rolle;');
    expect(csv).toContain('egen profil');
    expect(csv).not.toContain('#own');
    expect(lines[3]).toContain(';20');
  });

  it('uses English headers in English', () => {
    expect(toCsv([session], en)).toContain('seconds_from_start');
  });
});

describe('routePattern', () => {
  it('removes connection ids from routes', () => {
    expect(routePattern('/forloeb/1234-abcd/moede')).toBe('/forloeb/:id/moede');
    expect(routePattern('/forslag')).toBe('/forslag');
  });
});
