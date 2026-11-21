// One place for all interface text. Danish is the default.

import { da, type Dict } from './da';
import { en } from './en';

import type { Lang } from '../types';

export type { Lang };
export type { Dict };

export const DICTS: Record<Lang, Dict> = { da, en };

/** Each language is named in its own language, so everyone can find theirs. */
export const LANGS: { value: Lang; name: string }[] = [
  { value: 'da', name: 'Dansk' },
  { value: 'en', name: 'English' },
];

export { da, en };
