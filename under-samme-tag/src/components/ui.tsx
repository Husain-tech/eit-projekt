// Small building blocks shared by the pages.

import type { ReactNode } from 'react';
import { useApp } from '../state/AppContext';

/** The house with two lit windows: two people under the same roof. */
export function HouseMark({ size = 40, animate = false }: { size?: number; animate?: boolean }) {
  return (
    <svg
      className={animate ? 'house house--animate' : 'house'}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <path className="house__body" d="M10 58 60 14l50 44v50a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" />
      <path className="house__roof" d="M4 60 60 11l56 49" fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <rect className="house__window house__window--one" x="26" y="64" width="26" height="28" rx="2" />
      <rect className="house__window house__window--two" x="68" y="64" width="26" height="28" rx="2" />
      <path className="house__bars" d="M39 64v28M26 78h26M81 64v28M68 78h26" fill="none" strokeWidth="2.5" />
    </svg>
  );
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Label, optional help text, the input itself and an error message. */
export function Field({ id, label, hint, error, children }: FieldProps) {
  const { t } = useApp();
  return (
    <div className={error ? 'field field--error' : 'field'}>
      <label htmlFor={id} className="field__label">{label}</label>
      {hint && <p id={`${id}-hint`} className="field__hint">{hint}</p>}
      {children}
      {error && <p id={`${id}-error`} className="field__error" role="alert">{t.common.errorPrefix} {error}</p>}
    </div>
  );
}

/** aria attributes that connect an input to its hint and error. */
export function describe(id: string, hint?: string, error?: string) {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ');
  return { 'aria-describedby': ids || undefined, 'aria-invalid': error ? true : undefined } as const;
}

interface CheckGroupProps<T extends string> {
  legend: string;
  hint?: string;
  error?: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
  name: string;
}

/** A group of large checkboxes. */
export function CheckGroup<T extends string>({ legend, hint, error, options, selected, onChange, name }: CheckGroupProps<T>) {
  const { t } = useApp();
  const toggle = (value: T) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };
  return (
    <fieldset className={error ? 'field field--error' : 'field'}>
      <legend className="field__label">{legend}</legend>
      {hint && <p className="field__hint">{hint}</p>}
      <div className="checks">
        {options.map((o) => (
          <label key={o.value} className="check">
            <input
              type="checkbox"
              name={name}
              checked={selected.includes(o.value)}
              onChange={() => toggle(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="field__error" role="alert">{t.common.errorPrefix} {error}</p>}
    </fieldset>
  );
}

interface YesNoProps {
  legend: string;
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function YesNo({ legend, name, value, onChange }: YesNoProps) {
  const { t } = useApp();
  return (
    <fieldset className="field">
      <legend className="field__label">{legend}</legend>
      <div className="checks checks--row">
        <label className="check">
          <input type="radio" name={name} checked={value} onChange={() => onChange(true)} />
          <span>{t.common.yes}</span>
        </label>
        <label className="check">
          <input type="radio" name={name} checked={!value} onChange={() => onChange(false)} />
          <span>{t.common.no}</span>
        </label>
      </div>
    </fieldset>
  );
}

/** Shows where a pair is in the four steps. `current` is 1 to 4. */
export function Steps({ current, done = false }: { current: 1 | 2 | 3 | 4; done?: boolean }) {
  const { t } = useApp();
  return (
    <ol className="steps" aria-label={t.steps.label}>
      {t.steps.names.map((name, i) => {
        const n = i + 1;
        const state = n < current || (done && n === current) ? 'done' : n === current ? 'now' : 'later';
        return (
          <li key={name} className={`steps__item steps__item--${state}`} aria-current={state === 'now' ? 'step' : undefined}>
            <span className="steps__num" aria-hidden="true">{state === 'done' ? '✓' : n}</span>
            <span>
              {name}
              <span className="visually-hidden">{state === 'done' ? t.steps.done : state === 'now' ? t.steps.now : t.steps.later}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// Calm colours that all keep white text readable (contrast 7:1 or more).
const AVATAR_COLOURS = ['#1e4d40', '#9c2f1c', '#2d5682', '#5f4590', '#6e521b', '#1f5752'];

/**
 * A friendly drawn avatar: the first letter of the name under a small roof.
 * No photos. Hidden from screen readers, because the name is always next to it.
 */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const letter = (name.trim()[0] ?? '?').toUpperCase();
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const colour = AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
  return (
    <svg className={`avatar avatar--${size}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="31" fill={colour} />
      <path d="M17 27 32 15l15 12" fill="none" stroke="#f4b942" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="32" y="49" textAnchor="middle" fontFamily="'Young Serif', Georgia, serif" fontSize="23" fill="#fff">{letter}</text>
    </svg>
  );
}

/** "Verificeret studerende" or "Ikke verificeret", always in words. */
export function HelperBadge() {
  const { t } = useApp();
  return <p className="badge badge--yes">{t.helper.badge}</p>;
}

export function VerifiedBadge({ domain }: { domain?: string }) {
  const { t } = useApp();
  return domain
    ? <p className="badge badge--yes"><span aria-hidden="true">✓ </span>{t.verify.badge}</p>
    : <p className="badge badge--no">{t.verify.notBadge}</p>;
}

/** A plain notice box. `tone` changes the icon word, not only the colour. */
export function Notice({ tone = 'info', children }: { tone?: 'info' | 'waiting' | 'good'; children: ReactNode }) {
  return (
    <div className={`notice notice--${tone}`} role="status">
      {children}
    </div>
  );
}
