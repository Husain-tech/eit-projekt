// One form for both roles, used when creating and when editing a profile.
// It is split into steps, one topic per screen, because the long form was
// too much on one screen for older users. The draft keeps both the text and
// the step, so a reload returns the user to the same place.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { newId } from '../data/store';
import type { Dict } from '../i18n';
import { AREAS, HELP_TYPES, MOTIVATIONS, formatMonth, monthFromNow, monthOptions, studyDomain } from '../labels';
import { useApp } from '../state/AppContext';
import { logEvent } from '../state/testLog';
import { useDraft } from '../state/useDraft';
import type { HelpType, HelperRelation, HostProfile, Motivation, Profile, Role, StudentProfile } from '../types';
import { CheckGroup, Field, Notice, YesNo, describe } from './ui';

// Numbers are kept as text while typing, so a field can be empty.
interface FormValues {
  firstName: string;
  intro: string;
  // student
  study: string;
  budget: string;
  moveIn: string;
  areas: string[];
  offers: HelpType[];
  hoursPerWeek: string;
  motivations: Motivation[];
  hasPet: boolean;
  smokes: boolean;
  /** Simulated check. Only the domain is kept, never the email. */
  verifiedDomain: string;
  // host
  area: string;
  roomDescription: string;
  rent: string;
  availableFrom: string;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  quietHours: string;
  wants: HelpType[];
  hoursWanted: string;
  /** Helper mode: a relative fills in the profile together with the host. */
  usesHelper: boolean;
  helper: HelperRelation | '';
  consent: boolean;
  // where the user is in the form
  step: number;
  /** When the current step was shown, for the test log. */
  stepStartedAt: number;
}

type FieldKey = keyof Dict['form']['errors'];
type Errors = Partial<Record<FieldKey, string>>;
export type StepKey = keyof Dict['form']['steps'];

/** The steps for each role. Consent is only asked when a profile is created. */
function stepsFor(role: Role, needConsent: boolean): StepKey[] {
  const steps: StepKey[] = role === 'student'
    ? ['about', 'home', 'help', 'rules', 'consent']
    : ['about', 'room', 'help', 'rules', 'consent'];
  return needConsent ? steps : steps.filter((s) => s !== 'consent');
}

/** The fields each step checks before the user can move on. */
const STEP_FIELDS: Record<Role, Record<StepKey, FieldKey[]>> = {
  student: {
    about: ['firstName', 'study', 'intro'],
    home: ['budget'],
    room: [],
    help: ['offers', 'hoursPerWeek', 'motivations'],
    rules: [],
    consent: ['consent'],
  },
  host: {
    about: ['helper', 'firstName', 'intro'],
    home: [],
    room: ['area', 'roomDescription', 'rent'],
    help: ['wants', 'hoursWanted'],
    rules: [],
    consent: ['consent'],
  },
};

function emptyValues(t: Dict): FormValues {
  return {
    firstName: '', intro: '',
    study: '', budget: '', moveIn: monthFromNow(1), areas: [], offers: [], hoursPerWeek: '',
    motivations: [], hasPet: false, smokes: false, verifiedDomain: '',
    area: '', roomDescription: '', rent: '', availableFrom: monthFromNow(1),
    petsAllowed: false, smokingAllowed: false, quietHours: t.form.quietHoursDefault, wants: [], hoursWanted: '',
    usesHelper: false, helper: '',
    consent: false,
    step: 0,
    stepStartedAt: Date.now(),
  };
}

function valuesFrom(profile: Profile, t: Dict): FormValues {
  const base = emptyValues(t);
  if (profile.role === 'student') {
    return {
      ...base, ...profile,
      budget: String(profile.budget), hoursPerWeek: String(profile.hoursPerWeek), consent: true,
      verifiedDomain: profile.verifiedDomain ?? '',
    };
  }
  return {
    ...base, ...profile,
    rent: String(profile.rent), hoursWanted: String(profile.hoursWanted), consent: true,
    usesHelper: !!profile.helper, helper: profile.helper ?? '',
  };
}

function toNumber(text: string): number {
  return Number(text.replace(/\./g, '').replace(',', '.').trim());
}

/** Checks every field. Each step only shows the errors for its own fields. */
function validate(role: Role, v: FormValues, needConsent: boolean, t: Dict): Errors {
  const msg = t.form.errors;
  const e: Errors = {};
  if (!v.firstName.trim()) e.firstName = msg.firstName;
  if (role === 'student') {
    if (!v.study.trim()) e.study = msg.study;
    const budget = toNumber(v.budget);
    if (!v.budget.trim() || !Number.isFinite(budget) || budget <= 0) e.budget = msg.budget;
    if (v.offers.length === 0) e.offers = msg.offers;
    const hours = toNumber(v.hoursPerWeek);
    if (!v.hoursPerWeek.trim() || !Number.isFinite(hours) || hours < 1 || hours > 20) e.hoursPerWeek = msg.hoursPerWeek;
    if (v.motivations.length === 0) e.motivations = msg.motivations;
  } else {
    if (!v.area) e.area = msg.area;
    if (!v.roomDescription.trim()) e.roomDescription = msg.roomDescription;
    const rent = toNumber(v.rent);
    if (!v.rent.trim() || !Number.isFinite(rent) || rent < 0) e.rent = msg.rent;
    if (v.wants.length === 0) e.wants = msg.wants;
    const hours = toNumber(v.hoursWanted);
    if (!v.hoursWanted.trim() || !Number.isFinite(hours) || hours < 1 || hours > 20) e.hoursWanted = msg.hoursWanted;
    if (v.usesHelper && !v.helper) e.helper = msg.helper;
  }
  if (!v.intro.trim()) e.intro = msg.intro;
  if (needConsent && !v.consent) e.consent = msg.consent;
  return e;
}

function only(errors: Errors, keys: FieldKey[]): Errors {
  const out: Errors = {};
  keys.forEach((k) => { if (errors[k]) out[k] = errors[k]; });
  return out;
}

interface ProfileFormProps {
  role: Role;
  /** Set when editing an existing profile. */
  existing?: Profile;
  onSave: (profile: Profile) => void;
  saveLabel: string;
  /** Start in helper mode, when a relative chose "Jeg hjælper en ældre". */
  startWithHelper?: boolean;
}

export function ProfileForm({ role, existing, onSave, saveLabel, startWithHelper = false }: ProfileFormProps) {
  const { t } = useApp();
  const f = t.form;
  const draftKey = existing ? `rediger.${existing.id}` : `opret.${role}`;
  const [v, set, forgetDraft] = useDraft<FormValues>(
    draftKey,
    existing ? valuesFrom(existing, t) : { ...emptyValues(t), usesHelper: startWithHelper && role === 'host' },
  );
  const [errors, setErrors] = useState<Errors>({});
  // The study email stays in memory only. It is not saved, not even in the draft.
  const [uniEmail, setUniEmail] = useState('');
  const summaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const movedRef = useRef(false);
  const needConsent = !existing;
  const mode = existing ? 'edit' : 'create';

  const steps = stepsFor(role, needConsent);
  const index = Math.min(Math.max(0, v.step), steps.length - 1);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  // After Next or Back: go to the top and put focus on the step heading, so
  // screen reader users hear which step they are on.
  useEffect(() => {
    if (!movedRef.current) return;
    movedRef.current = false;
    window.scrollTo(0, 0);
    headingRef.current?.focus();
  }, [index]);

  const goTo = (next: number) => {
    movedRef.current = true;
    setErrors({});
    set({ step: next, stepStartedAt: Date.now() });
  };

  const showErrors = (found: Errors, atStep: StepKey) => {
    setErrors(found);
    (Object.keys(found) as FieldKey[]).forEach((field) => {
      logEvent({ type: 'validation_error', step: atStep, field, role, value: mode });
    });
    window.setTimeout(() => summaryRef.current?.focus(), 0);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const all = validate(role, v, needConsent, t);
    const here = only(all, STEP_FIELDS[role][step]);
    const domain = step === 'about' && role === 'student' && uniEmail.trim() ? studyDomain(uniEmail) : null;
    if (step === 'about' && role === 'student' && uniEmail.trim() && !domain) here.uniEmail = f.errors.uniEmail;
    if (Object.keys(here).length > 0) {
      showErrors(here, step);
      return;
    }
    logEvent({ type: 'form_step_done', step, role, value: mode, durationMs: Date.now() - v.stepStartedAt });
    if (domain) {
      // Only the domain goes in the log and the profile. It names a place of study, not a person.
      logEvent({ type: 'verified', role, value: domain });
      set({ verifiedDomain: domain });
      setUniEmail('');
    }

    if (!isLast) {
      goTo(index + 1);
      return;
    }

    // Last step. If an earlier step is still incomplete, send the user back there.
    const firstBad = steps.findIndex((s) => Object.keys(only(all, STEP_FIELDS[role][s])).length > 0);
    if (firstBad >= 0) {
      goTo(firstBad);
      window.setTimeout(() => showErrors(only(all, STEP_FIELDS[role][steps[firstBad]]), steps[firstBad]), 0);
      return;
    }

    const id = existing?.id ?? newId();
    const profile: Profile = role === 'student'
      ? ({
        id, role: 'student', isDemo: existing?.isDemo ?? false,
        firstName: v.firstName.trim(), study: v.study.trim(), budget: toNumber(v.budget), moveIn: v.moveIn,
        areas: v.areas, offers: v.offers, hoursPerWeek: toNumber(v.hoursPerWeek), motivations: v.motivations,
        hasPet: v.hasPet, smokes: v.smokes, intro: v.intro.trim(),
        verifiedDomain: v.verifiedDomain || undefined,
      } satisfies StudentProfile)
      : ({
        id, role: 'host', isDemo: existing?.isDemo ?? false,
        firstName: v.firstName.trim(), area: v.area, roomDescription: v.roomDescription.trim(),
        rent: toNumber(v.rent), availableFrom: v.availableFrom, petsAllowed: v.petsAllowed,
        smokingAllowed: v.smokingAllowed, quietHours: v.quietHours.trim(), wants: v.wants,
        hoursWanted: toNumber(v.hoursWanted), intro: v.intro.trim(),
        helper: v.usesHelper && v.helper ? v.helper : undefined,
      } satisfies HostProfile);
    forgetDraft();
    logEvent({ type: existing ? 'profile_edited' : 'profile_saved', role });
    if (role === 'host' && v.usesHelper && v.helper) logEvent({ type: 'helper_used', role, value: v.helper });
    onSave(profile);
  };

  const back = () => {
    logEvent({ type: 'form_step_back', step, role, value: mode });
    goTo(index - 1);
  };

  const errorKeys = Object.keys(errors) as FieldKey[];
  const helpOptions = HELP_TYPES.map((h) => ({ value: h, label: t.help[h] }));

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <h2 className="formstep" ref={headingRef} tabIndex={-1}>
        <span className="formstep__count">{f.stepOf(index + 1, steps.length)}</span> {f.steps[step]}
      </h2>

      {errorKeys.length > 0 && (
        <div className="errorsummary" ref={summaryRef} tabIndex={-1} role="alert">
          <h3>{t.common.errorTitle}</h3>
          <p>{t.common.errorText}</p>
          <ul>
            {errorKeys.map((k) => (
              <li key={k}><a href={`#f-${k}`}>{f.fieldNames[k]}: {errors[k]}</a></li>
            ))}
          </ul>
        </div>
      )}

      {role === 'host' && v.usesHelper && (
        <Notice><p>{t.helper.tip}</p></Notice>
      )}

      <div className="form__step">
        {step === 'about' && role === 'host' && (
          <div id="f-helper">
            <YesNo legend={t.helper.question} name="usesHelper" value={v.usesHelper} onChange={(usesHelper) => set({ usesHelper })} />
            <p className="field__hint helper__hint">{t.helper.hint}</p>
            {v.usesHelper && (
              <Field id="f-helper-relation" label={t.helper.relation} error={errors.helper}>
                <select
                  id="f-helper-relation" value={v.helper} onChange={(e) => set({ helper: e.target.value as HelperRelation | '' })}
                  {...describe('f-helper-relation', undefined, errors.helper)}
                >
                  <option value="">{t.helper.choose}</option>
                  {(Object.keys(t.helper.relations) as HelperRelation[]).map((r) => (
                    <option key={r} value={r}>{t.helper.relations[r]}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        )}
        {step === 'about' && (
          <>
            <Field id="f-firstName" label={f.firstName} hint={f.firstNameHint} error={errors.firstName}>
              <input
                id="f-firstName" type="text" autoComplete="given-name" value={v.firstName}
                onChange={(e) => set({ firstName: e.target.value })}
                {...describe('f-firstName', 'hint', errors.firstName)}
              />
            </Field>

            {role === 'student' && (
              <Field id="f-study" label={f.study} hint={f.studyHint} error={errors.study}>
                <input
                  id="f-study" type="text" value={v.study}
                  onChange={(e) => set({ study: e.target.value })}
                  {...describe('f-study', 'hint', errors.study)}
                />
              </Field>
            )}

            {role === 'student' && (
              <div className="verify">
                {v.verifiedDomain && (
                  <Notice tone="good"><p><strong>{t.verify.badge}.</strong> {t.verify.done(v.verifiedDomain)}</p></Notice>
                )}
                <Field id="f-uniEmail" label={t.verify.label} hint={t.verify.hint} error={errors.uniEmail}>
                  <input
                    id="f-uniEmail" type="email" autoComplete="off" value={uniEmail}
                    onChange={(e) => setUniEmail(e.target.value)}
                    {...describe('f-uniEmail', 'hint', errors.uniEmail)}
                  />
                </Field>
                <p className="legal legal--small">{t.verify.simulation}</p>
              </div>
            )}

            <Field
              id="f-intro"
              label={f.intro}
              hint={role === 'student' ? f.introHintStudent : f.introHintHost}
              error={errors.intro}
            >
              <textarea
                id="f-intro" rows={4} value={v.intro}
                onChange={(e) => set({ intro: e.target.value })}
                {...describe('f-intro', 'hint', errors.intro)}
              />
            </Field>
          </>
        )}

        {step === 'home' && (
          <>
            <Field id="f-budget" label={f.budget} hint={f.budgetHint} error={errors.budget}>
              <input
                id="f-budget" type="text" inputMode="numeric" className="input--short" value={v.budget}
                onChange={(e) => set({ budget: e.target.value })}
                {...describe('f-budget', 'hint', errors.budget)}
              />
            </Field>
            <Field id="f-moveIn" label={f.moveIn}>
              <select id="f-moveIn" value={v.moveIn} onChange={(e) => set({ moveIn: e.target.value })}>
                {monthOptions(v.moveIn).map((m) => <option key={m} value={m}>{formatMonth(m, t)}</option>)}
              </select>
            </Field>
            <CheckGroup
              legend={f.areas}
              hint={f.areasHint}
              name="areas"
              options={AREAS.map((a) => ({ value: a, label: a }))}
              selected={v.areas}
              onChange={(areas) => set({ areas })}
            />
          </>
        )}

        {step === 'room' && (
          <>
            <Field id="f-area" label={f.area} hint={f.areaHint} error={errors.area}>
              <select
                id="f-area" value={v.area} onChange={(e) => set({ area: e.target.value })}
                {...describe('f-area', 'hint', errors.area)}
              >
                <option value="">{f.areaPlaceholder}</option>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field id="f-roomDescription" label={f.roomDescription} hint={f.roomDescriptionHint} error={errors.roomDescription}>
              <textarea
                id="f-roomDescription" rows={3} value={v.roomDescription}
                onChange={(e) => set({ roomDescription: e.target.value })}
                {...describe('f-roomDescription', 'hint', errors.roomDescription)}
              />
            </Field>
            <Field id="f-rent" label={f.rent} hint={f.rentHint} error={errors.rent}>
              <input
                id="f-rent" type="text" inputMode="numeric" className="input--short" value={v.rent}
                onChange={(e) => set({ rent: e.target.value })}
                {...describe('f-rent', 'hint', errors.rent)}
              />
            </Field>
            <Field id="f-availableFrom" label={f.availableFrom}>
              <select id="f-availableFrom" value={v.availableFrom} onChange={(e) => set({ availableFrom: e.target.value })}>
                {monthOptions(v.availableFrom).map((m) => <option key={m} value={m}>{formatMonth(m, t)}</option>)}
              </select>
            </Field>
          </>
        )}

        {step === 'help' && role === 'student' && (
          <>
            <div id="f-offers">
              <CheckGroup
                legend={f.offers} hint={f.offersHint}
                name="offers" options={helpOptions} selected={v.offers}
                onChange={(offers) => set({ offers })} error={errors.offers}
              />
            </div>
            <Field id="f-hoursPerWeek" label={f.hoursPerWeek} hint={f.hoursHint} error={errors.hoursPerWeek}>
              <input
                id="f-hoursPerWeek" type="text" inputMode="numeric" className="input--short" value={v.hoursPerWeek}
                onChange={(e) => set({ hoursPerWeek: e.target.value })}
                {...describe('f-hoursPerWeek', 'hint', errors.hoursPerWeek)}
              />
            </Field>
            <div id="f-motivations">
              <CheckGroup
                legend={f.motivations} hint={f.motivationsHint}
                name="motivations"
                options={MOTIVATIONS.map((m) => ({ value: m, label: t.motivation[m] }))}
                selected={v.motivations}
                onChange={(motivations) => set({ motivations })} error={errors.motivations}
              />
            </div>
          </>
        )}

        {step === 'help' && role === 'host' && (
          <>
            <div id="f-wants">
              <CheckGroup
                legend={f.wants}
                name="wants" options={helpOptions} selected={v.wants}
                onChange={(wants) => set({ wants })} error={errors.wants}
              />
            </div>
            <Field id="f-hoursWanted" label={f.hoursWanted} hint={f.hoursWantedHint} error={errors.hoursWanted}>
              <input
                id="f-hoursWanted" type="text" inputMode="numeric" className="input--short" value={v.hoursWanted}
                onChange={(e) => set({ hoursWanted: e.target.value })}
                {...describe('f-hoursWanted', 'hint', errors.hoursWanted)}
              />
            </Field>
          </>
        )}

        {step === 'rules' && role === 'student' && (
          <>
            <YesNo legend={f.hasPet} name="hasPet" value={v.hasPet} onChange={(hasPet) => set({ hasPet })} />
            <YesNo legend={f.smokes} name="smokes" value={v.smokes} onChange={(smokes) => set({ smokes })} />
          </>
        )}

        {step === 'rules' && role === 'host' && (
          <>
            <YesNo legend={f.petsAllowed} name="petsAllowed" value={v.petsAllowed} onChange={(petsAllowed) => set({ petsAllowed })} />
            <YesNo legend={f.smokingAllowed} name="smokingAllowed" value={v.smokingAllowed} onChange={(smokingAllowed) => set({ smokingAllowed })} />
            <Field id="f-quietHours" label={f.quietHours} hint={f.quietHoursHint}>
              <input
                id="f-quietHours" type="text" value={v.quietHours}
                onChange={(e) => set({ quietHours: e.target.value })}
                aria-describedby="f-quietHours-hint"
              />
            </Field>
          </>
        )}

        {step === 'consent' && (
          <div className={errors.consent ? 'field field--error' : 'field'} id="f-consent">
            <label className="check check--plain">
              <input
                type="checkbox" checked={v.consent} onChange={(e) => set({ consent: e.target.checked })}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? 'f-consent-error' : undefined}
              />
              <span>{f.consentText}</span>
            </label>
            {errors.consent && <p id="f-consent-error" className="field__error" role="alert">{t.common.errorPrefix} {errors.consent}</p>}
          </div>
        )}
      </div>

      <div className="actions">
        <button type="submit" className="btn btn--primary">{isLast ? saveLabel : f.next}</button>
        {index > 0 && <button type="button" className="btn btn--secondary" onClick={back}>{f.back}</button>}
      </div>
      <p className="quiet formstep__note">{f.stepsNote}</p>
    </form>
  );
}
