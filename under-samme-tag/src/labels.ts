// Fixed lists and small formatting helpers. The words themselves live in
// src/i18n, so they exist in both Danish and English.

import type { Dict } from './i18n';
import type { HelpType, Motivation } from './types';

export const HELP_TYPES: HelpType[] = ['indkob', 'teknologi', 'rengoring', 'have', 'samvaer'];

export const MOTIVATIONS: Motivation[] = ['husleje', 'selskab', 'oplevelse', 'hjaelpe'];

/** Place names are the same in both languages. */
export const AREAS: string[] = [
  'Odense C',
  'Bolbro',
  'Dalum',
  'Fruens Bøge',
  'Hjallese',
  'Næsby',
  'Tarup',
  'Vollsmose',
  'Sanderum',
  'Højby',
];

export type MeetingPlace = keyof Dict['places'];
export const MEETING_PLACES: MeetingPlace[] = ['home', 'cafe', 'library', 'phone'];

/** Meeting places are stored as keys. Older saved data used the Danish text. */
export function placeLabel(place: string, t: Dict): string {
  return place in t.places ? t.places[place as MeetingPlace] : place;
}

// Simulated student check. These are the email domains of Danish places of
// study. Sub-domains count too, so 'student.sdu.dk' matches 'sdu.dk'.
export const STUDY_DOMAINS: string[] = [
  'sdu.dk', 'ucl.dk', 'ku.dk', 'au.dk', 'dtu.dk', 'aau.dk', 'ruc.dk', 'cbs.dk', 'itu.dk',
  'kp.dk', 'via.dk', 'ucn.dk', 'phabsalon.dk', 'ucsyd.dk', 'easv.dk', 'eal.dk', 'zealand.dk',
  'iba.dk', 'sde.dk', 'kea.dk', 'cphbusiness.dk', 'baaa.dk', 'eamv.dk', 'dania.dk',
];

/** The domain of a study email, or null if it is not one. Nothing is sent anywhere. */
export function studyDomain(email: string): string | null {
  const match = /^[^\s@]+@([a-z0-9-]+(\.[a-z0-9-]+)+)$/i.exec(email.trim());
  if (!match) return null;
  const domain = match[1].toLowerCase();
  return STUDY_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`)) ? domain : null;
}

/** 'YYYY-MM' for the month that is `offset` months after `from`. */
export function monthFromNow(offset: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** The next 12 months, plus `include` if it is outside that range. */
export function monthOptions(include?: string): string[] {
  const list = Array.from({ length: 12 }, (_, i) => monthFromNow(i));
  if (include && !list.includes(include)) list.unshift(include);
  return list;
}

/** '2027-02' becomes 'februar 2027' or 'February 2027'. */
export function formatMonth(month: string, t: Dict): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return t.fmt.month(m, y);
}

/** '2026-11-20' becomes '20. november 2026' or '20 November 2026'. */
export function formatDate(date: string, t: Dict): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return t.fmt.date(d, m, y);
}

export function formatKr(amount: number, t: Dict): string {
  return t.fmt.kr(amount);
}

export function helpList(items: HelpType[], t: Dict): string {
  return items.map((i) => t.help[i]).join(', ');
}

export function motivationList(items: Motivation[], t: Dict): string {
  return items.map((m) => t.motivation[m]).join(', ');
}
