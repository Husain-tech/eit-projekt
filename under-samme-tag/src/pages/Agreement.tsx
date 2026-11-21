import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { CheckGroup, Field, Notice, Steps, describe } from '../components/ui';
import type { Dict } from '../i18n';
import { HELP_TYPES, formatKr, formatMonth, helpList, monthOptions } from '../labels';
import { bothContinue, isAgreed, isEnded, isMutual, useApp, viewFor } from '../state/AppContext';
import { logEvent, otherLabel } from '../state/testLog';
import { useDraft } from '../state/useDraft';
import type { Agreement, HelpType, HostProfile, PlanDay, StudentProfile } from '../types';

interface TermsForm {
  rent: string;
  hoursPerWeek: string;
  tasks: HelpType[];
  rules: string;
  startMonth: string;
  trialWeeks: string;
  noticeWeeks: string;
  weekPlan: PlanDay[];
}

type Terms = Omit<Agreement, 'studentConfirmed' | 'hostConfirmed' | 'agreedAt' | 'checkIns'>;

const HOUR_CHOICES = [1, 2, 3, 4, 5];

/**
 * A first weekly plan: the agreed hours spread over a few days, with the
 * agreed tasks taking turns. Company goes last, so it lands in the evening days.
 */
export function suggestPlan(hours: number, tasks: HelpType[]): PlanDay[] {
  if (hours < 1 || tasks.length === 0) return [];
  // At most 5 hours a day, so up to 20 hours fits on four days.
  const days = hours <= 2 ? [2] : hours <= 5 ? [0, 3] : hours <= 15 ? [0, 2, 4] : [0, 1, 3, 4];
  const order = [...tasks.filter((x) => x !== 'samvaer'), ...tasks.filter((x) => x === 'samvaer')];
  const base = Math.floor(hours / days.length);
  let extra = hours % days.length;
  return days.map((day, i) => {
    const h = Math.min(5, base + (extra > 0 ? 1 : 0));
    if (extra > 0) extra -= 1;
    return { day, task: order[i % order.length], hours: Math.max(1, h) };
  });
}

/** A first suggestion built from the two profiles, so nobody starts from a blank page. */
function suggestTerms(student: StudentProfile, host: HostProfile, t: Dict): TermsForm {
  const r = t.agreement.ruleText;
  const shared = host.wants.filter((w) => student.offers.includes(w));
  const tasks = shared.length ? shared : host.wants;
  const hours = Math.min(student.hoursPerWeek, host.hoursWanted);
  const rules = [
    host.petsAllowed ? r.petsOk : r.noPets,
    host.smokingAllowed ? r.smokingOk : r.noSmoking,
    host.quietHours ? `${host.quietHours}.` : '',
    r.guests,
  ].filter(Boolean).join(' ').replace(/\.\./g, '.');
  return {
    rent: String(host.rent),
    hoursPerWeek: String(hours),
    tasks,
    rules,
    startMonth: student.moveIn > host.availableFrom ? student.moveIn : host.availableFrom,
    trialWeeks: '4',
    noticeWeeks: '2',
    weekPlan: suggestPlan(hours, tasks),
  };
}

function fromAgreement(a: Agreement): TermsForm {
  return {
    rent: String(a.rent), hoursPerWeek: String(a.hoursPerWeek), tasks: a.tasks, rules: a.rules,
    startMonth: a.startMonth, trialWeeks: String(a.trialWeeks), noticeWeeks: String(a.noticeWeeks),
    weekPlan: a.weekPlan,
  };
}

/** Step 3: write down what the two agree on. Both have to say yes. */
export function AgreementPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me, t, state, getProfile, isHidden, saveAgreement, confirmAgreement, decide } = useApp();
  const connection = state.connections.find((c) => c.id === id);
  const a = t.agreement;

  if (!me || !connection || !isMutual(connection)) return <Navigate to="/forslag" replace />;
  const view = viewFor(me.role, connection);
  const other = getProfile(view.otherId);
  if (!other || isHidden(other.id)) return <Navigate to="/forslag" replace />;
  if (isEnded(connection)) return <Navigate to={`/forloeb/${connection.id}/moede`} replace />;

  // The agreement is locked until the first meeting is agreed ...
  if (!connection.meeting?.confirmed) {
    return (
      <div className="narrow">
        <Steps current={2} />
        <h1 tabIndex={-1}>{a.lockedMeetTitle}</h1>
        <p className="lead">{a.lockedMeetText}</p>
        <div className="actions">
          <Link to={`/forloeb/${connection.id}/moede`} className="btn btn--primary">{a.lockedMeetLink}</Link>
        </div>
      </div>
    );
  }

  // ... and until both have said, after the meeting, that they want to go on.
  if (!bothContinue(connection)) {
    return (
      <div className="narrow">
        <Steps current={2} />
        <h1 tabIndex={-1}>{a.lockedAnswerTitle}</h1>
        <p className="lead">{a.lockedAnswerText}</p>
        <div className="actions">
          <Link to={`/forloeb/${connection.id}/moede`} className="btn btn--primary">{a.lockedAnswerLink}</Link>
        </div>
      </div>
    );
  }

  const student = (me.role === 'student' ? me : other) as StudentProfile;
  const host = (me.role === 'host' ? me : other) as HostProfile;
  const who = otherLabel(other);

  return (
    <AgreementBody
      key={connection.id}
      connectionId={connection.id}
      agreement={connection.agreement}
      agreed={isAgreed(connection)}
      iConfirmed={view.iConfirmed}
      student={student}
      host={host}
      otherId={other.id}
      otherName={other.firstName}
      onSave={(terms) => {
        logEvent({ type: 'agreement_saved', role: me.role, other: who, value: String(terms.weekPlan.length) });
        saveAgreement(connection.id, terms);
      }}
      onInvalid={(fields) => fields.forEach((field) => logEvent({ type: 'validation_error', step: 'agreement', field, role: me.role }))}
      onConfirm={() => {
        logEvent({ type: 'agreement_confirmed', role: me.role, other: who });
        confirmAgreement(connection.id);
      }}
      onEnd={() => {
        if (window.confirm(a.endConfirm(other.firstName))) {
          logEvent({ type: 'connection_stopped', role: me.role, other: who, step: 'agreement' });
          decide(other.id, 'declined');
          navigate('/forslag');
        }
      }}
    />
  );
}

interface BodyProps {
  connectionId: string;
  agreement: Agreement | null;
  agreed: boolean;
  iConfirmed: boolean;
  student: StudentProfile;
  host: HostProfile;
  otherId: string;
  otherName: string;
  onSave: (terms: Terms) => void;
  onInvalid: (fields: string[]) => void;
  onConfirm: () => void;
  onEnd: () => void;
}

/** Days with what and how long. Each chosen day gets its own two choices. */
function WeekPlan({ plan, tasks, hours, error, onChange }: {
  plan: PlanDay[]; tasks: HelpType[]; hours: number; error?: string; onChange: (plan: PlanDay[]) => void;
}) {
  const { t } = useApp();
  const a = t.agreement;
  const choices = tasks.length ? tasks : HELP_TYPES;
  const sum = plan.reduce((n, d) => n + d.hours, 0);
  const toggle = (day: number) => {
    const found = plan.find((d) => d.day === day);
    onChange(found
      ? plan.filter((d) => d.day !== day)
      : [...plan, { day, task: choices[0], hours: 1 }].sort((x, y) => x.day - y.day));
  };
  const change = (day: number, part: Partial<PlanDay>) => onChange(plan.map((d) => (d.day === day ? { ...d, ...part } : d)));

  return (
    <fieldset className={error ? 'field field--error' : 'field'} id="a-weekPlan">
      <legend className="field__label">{a.planLegend}</legend>
      <p className="field__hint" id="a-weekPlan-hint">{a.planHint}</p>
      <ul className="plan">
        {a.days.map((name, day) => {
          const entry = plan.find((d) => d.day === day);
          return (
            <li key={name} className={entry ? 'plan__day plan__day--on' : 'plan__day'}>
              <label className="check">
                <input type="checkbox" checked={!!entry} onChange={() => toggle(day)} />
                <span>{name}</span>
              </label>
              {entry && (
                <div className="plan__choices">
                  <div className="plan__choice">
                    <label htmlFor={`plan-what-${day}`}>{a.planWhat(name)}</label>
                    <select
                      id={`plan-what-${day}`} value={choices.includes(entry.task) ? entry.task : choices[0]}
                      onChange={(e) => change(day, { task: e.target.value as HelpType })}
                    >
                      {choices.map((h) => <option key={h} value={h}>{t.help[h]}</option>)}
                    </select>
                  </div>
                  <div className="plan__choice">
                    <label htmlFor={`plan-hours-${day}`}>{a.planHours(name)}</label>
                    <select
                      id={`plan-hours-${day}`} className="input--short" value={entry.hours}
                      onChange={(e) => change(day, { hours: Number(e.target.value) })}
                    >
                      {HOUR_CHOICES.map((n) => <option key={n} value={n}>{a.hoursOption(n)}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {plan.length > 0 && (
        <p className={sum === hours ? 'plan__sum' : 'plan__sum plan__sum--off'} aria-live="polite">
          {sum === hours ? a.planMatch(sum) : a.planSum(sum, hours)}
        </p>
      )}
      {error && <p className="field__error" role="alert">{t.common.errorPrefix} {error}</p>}
    </fieldset>
  );
}

function AgreementBody({
  connectionId, agreement, agreed, iConfirmed, student, host, otherId, otherName, onSave, onInvalid, onConfirm, onEnd,
}: BodyProps) {
  const { t, me, state } = useApp();
  const a = t.agreement;
  const [editing, setEditing] = useState(false);
  const [form, setForm, forgetDraft] = useDraft<TermsForm>(
    `aftale.${connectionId}`,
    agreement ? fromAgreement(agreement) : suggestTerms(student, host, t),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof TermsForm, string>>>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const showForm = !agreement || editing;
  const plan = form.weekPlan ?? [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found: typeof errors = {};
    const rent = Number(form.rent.replace(/\./g, ''));
    const hours = Number(form.hoursPerWeek);
    if (!form.rent.trim() || !Number.isFinite(rent) || rent < 0) found.rent = a.errors.rent;
    if (!form.hoursPerWeek.trim() || !Number.isFinite(hours) || hours < 1 || hours > 20) found.hoursPerWeek = a.errors.hoursPerWeek;
    if (form.tasks.length === 0) found.tasks = a.errors.tasks;
    if (!form.rules.trim()) found.rules = a.errors.rules;
    if (plan.length === 0) found.weekPlan = a.errors.weekPlan;
    setErrors(found);
    if (Object.keys(found).length > 0) {
      onInvalid(Object.keys(found));
      window.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    onSave({
      rent, hoursPerWeek: hours, tasks: form.tasks, rules: form.rules.trim(), startMonth: form.startMonth,
      trialWeeks: Number(form.trialWeeks), noticeWeeks: Number(form.noticeWeeks), weekPlan: plan,
    });
    forgetDraft();
    setEditing(false);
  };

  const legal = (
    <p className="legal">
      <strong>{a.legalStrong}</strong> {a.legalText}
    </p>
  );

  const weekOptions = [2, 4, 8].map((n) => <option key={n} value={String(n)}>{a.weeks(n)}</option>);
  const blockLink = (
    <p className="quiet noprint">
      <Link to={`/bloker/${otherId}`}>{t.block.link(otherName)}</Link>
    </p>
  );

  if (showForm) {
    const errorKeys = Object.keys(errors) as (keyof TermsForm)[];
    return (
      <div className="narrow">
        <Steps current={3} />
        <h1 tabIndex={-1}>{a.title(student.firstName, host.firstName)}</h1>
        <p className="lead">{a.lead}</p>
        <form className="form" onSubmit={submit} noValidate>
          {errorKeys.length > 0 && (
            <div className="errorsummary" ref={summaryRef} tabIndex={-1} role="alert">
              <h2>{t.common.errorTitle}</h2>
              <ul>{errorKeys.map((k) => <li key={k}><a href={`#a-${k}`}>{errors[k]}</a></li>)}</ul>
            </div>
          )}
          <Field id="a-rent" label={a.rent} hint={a.rentHint} error={errors.rent}>
            <input
              id="a-rent" type="text" inputMode="numeric" className="input--short" value={form.rent}
              onChange={(e) => setForm({ rent: e.target.value })} {...describe('a-rent', 'hint', errors.rent)}
            />
          </Field>
          <Field id="a-hoursPerWeek" label={a.hours} hint={a.hoursHint(student.firstName, student.hoursPerWeek, host.firstName, host.hoursWanted)} error={errors.hoursPerWeek}>
            <input
              id="a-hoursPerWeek" type="text" inputMode="numeric" className="input--short" value={form.hoursPerWeek}
              onChange={(e) => setForm({ hoursPerWeek: e.target.value })} {...describe('a-hoursPerWeek', 'hint', errors.hoursPerWeek)}
            />
          </Field>
          <div id="a-tasks">
            <CheckGroup
              legend={a.tasks(student.firstName)} name="tasks"
              options={HELP_TYPES.map((h) => ({ value: h, label: t.help[h] }))}
              selected={form.tasks} onChange={(tasks) => setForm({ tasks })} error={errors.tasks}
            />
          </div>
          <WeekPlan
            plan={plan} tasks={form.tasks} hours={Number(form.hoursPerWeek) || 0} error={errors.weekPlan}
            onChange={(weekPlan) => setForm({ weekPlan })}
          />
          <Field id="a-rules" label={a.rules} hint={a.rulesHint} error={errors.rules}>
            <textarea
              id="a-rules" rows={4} value={form.rules}
              onChange={(e) => setForm({ rules: e.target.value })} {...describe('a-rules', 'hint', errors.rules)}
            />
          </Field>
          <Field id="a-startMonth" label={a.startMonth}>
            <select id="a-startMonth" value={form.startMonth} onChange={(e) => setForm({ startMonth: e.target.value })}>
              {monthOptions(form.startMonth).map((m) => <option key={m} value={m}>{formatMonth(m, t)}</option>)}
            </select>
          </Field>
          <Field id="a-trialWeeks" label={a.trial} hint={a.trialHint}>
            <select id="a-trialWeeks" value={form.trialWeeks} onChange={(e) => setForm({ trialWeeks: e.target.value })} aria-describedby="a-trialWeeks-hint">
              {weekOptions}
            </select>
          </Field>
          <Field id="a-noticeWeeks" label={a.notice} hint={a.noticeHint}>
            <select id="a-noticeWeeks" value={form.noticeWeeks} onChange={(e) => setForm({ noticeWeeks: e.target.value })} aria-describedby="a-noticeWeeks-hint">
              {weekOptions}
            </select>
          </Field>
          <p className="leave"><strong>{a.factLeave}:</strong> {a.leaveText(Number(form.trialWeeks), Number(form.noticeWeeks))}</p>
          {legal}
          <div className="actions">
            <button type="submit" className="btn btn--primary">{a.save}</button>
            {agreement && <button type="button" className="btn btn--secondary" onClick={() => setEditing(false)}>{t.common.cancel}</button>}
          </div>
        </form>
        {blockLink}
      </div>
    );
  }

  const ag = agreement!;
  return (
    <div className="narrow">
      <Steps current={3} done={agreed} />
      <h1 tabIndex={-1}>{a.title(student.firstName, host.firstName)}</h1>
      <div className="printonly">
        <p>{t.print.between(student.firstName, host.firstName)}</p>
        <p>{t.print.printed(new Date().toLocaleDateString(state.lang === 'da' ? 'da-DK' : 'en-GB', { dateStyle: 'long' }))}</p>
      </div>

      {agreed && (
        <Notice tone="good">
          <p><strong>{a.agreedNotice}</strong> {a.agreedText}</p>
        </Notice>
      )}
      {!agreed && iConfirmed && (
        <Notice tone="waiting">
          <p><strong>{a.waiting}</strong> {a.waitingText(otherName)}</p>
        </Notice>
      )}
      {!agreed && !iConfirmed && (
        <Notice>
          <p><strong>{a.theyWrote(otherName)}</strong> {a.theyWroteText}</p>
        </Notice>
      )}

      {agreed && (
        <div className="actions noprint">
          <Link to={`/forloeb/${connectionId}/proeve`} className="btn btn--primary">{a.goTrial}</Link>
        </div>
      )}

      <dl className="facts facts--agreement">
        <div><dt>{a.factRent}</dt><dd>{t.summary.perMonth(formatKr(ag.rent, t))}</dd></div>
        <div><dt>{a.factHours}</dt><dd>{t.summary.hours(ag.hoursPerWeek)}</dd></div>
        <div><dt>{a.factTasks(student.firstName)}</dt><dd>{helpList(ag.tasks, t)}</dd></div>
        <div>
          <dt>{a.factPlan}</dt>
          <dd>
            {ag.weekPlan.length === 0 ? a.planNone : (
              <ul className="planlist">
                {ag.weekPlan.map((d) => (
                  <li key={d.day}>{a.planLine(a.days[d.day], t.help[d.task].toLowerCase(), a.hoursOption(d.hours))}</li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div><dt>{a.factRules}</dt><dd>{ag.rules}</dd></div>
        <div><dt>{a.factStart}</dt><dd>{formatMonth(ag.startMonth, t)}</dd></div>
        <div><dt>{a.factTrial}</dt><dd>{a.trialText(ag.trialWeeks)}</dd></div>
        <div><dt>{a.factNotice}</dt><dd>{a.noticeText(ag.noticeWeeks)}</dd></div>
        <div><dt>{a.factLeave}</dt><dd>{a.leaveText(ag.trialWeeks, ag.noticeWeeks)}</dd></div>
        <div><dt>{student.firstName}</dt><dd>{ag.studentConfirmed ? a.saidYes : a.notAnswered}</dd></div>
        <div><dt>{host.firstName}</dt><dd>{ag.hostConfirmed ? a.saidYes : a.notAnswered}</dd></div>
      </dl>

      {legal}

      {agreed && (
        <section className="printonly signatures" aria-hidden="true">
          <h2>{t.print.signTitle}</h2>
          {[student.firstName, host.firstName].map((name) => (
            <div key={name} className="signatures__row">
              <p className="signatures__line">{t.print.sign(name)}</p>
              <p className="signatures__line signatures__line--date">{t.print.date}</p>
            </div>
          ))}
        </section>
      )}

      <div className="actions noprint">
        {!iConfirmed && <button type="button" className="btn btn--primary" onClick={onConfirm}>{a.confirm}</button>}
        {agreed && (
          <button
            type="button" className="btn btn--secondary"
            onClick={() => {
              logEvent({ type: 'agreement_printed', role: me?.role });
              window.print();
            }}
          >
            {a.print}
          </button>
        )}
        <button type="button" className="btn btn--secondary" onClick={() => { setForm(fromAgreement(ag)); setEditing(true); }}>
          {iConfirmed ? a.edit : a.propose}
        </button>
      </div>

      <p className="quiet noprint">
        {a.endQuestion}{' '}
        <button type="button" className="linkbutton" onClick={onEnd}>{a.end(otherName)}</button>
      </p>
      {blockLink}
    </div>
  );
}
