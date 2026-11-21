import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Field, Notice, Steps } from '../components/ui';
import { MEETING_PLACES, formatDate, placeLabel } from '../labels';
import { scoreMatch } from '../matching/match';
import { bothContinue, isEnded, isMutual, useApp, viewFor } from '../state/AppContext';
import { logEvent, otherLabel } from '../state/testLog';
import { useDraft } from '../state/useDraft';
import type { HostProfile, StudentProfile } from '../types';

const TIMES = ['10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '19:00'];

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Step 2: agree on a short first meeting before anyone decides anything. */
export function MeetingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me, t, state, getProfile, isHidden, proposeMeeting, confirmMeeting, answerContinue, decide } = useApp();
  const connection = state.connections.find((c) => c.id === id);
  const [editing, setEditing] = useState(false);
  const [form, setForm, forgetDraft] = useDraft(`moede.${id}`, { date: '', time: '14:00', place: MEETING_PLACES[1] as string });
  const [error, setError] = useState('');
  const m = t.meeting;

  if (!me || !connection || !isMutual(connection)) return <Navigate to="/forslag" replace />;
  const view = viewFor(me.role, connection);
  const other = getProfile(view.otherId);
  if (!other || isHidden(other.id)) return <Navigate to="/forslag" replace />;
  const who = otherLabel(other);

  // One of them said no after the meeting. Kind and neutral, the same for both.
  if (isEnded(connection)) {
    return (
      <div className="narrow">
        <h1 tabIndex={-1}>{t.ended.title}</h1>
        <p className="lead">{view.myContinue === 'declined' ? t.ended.byMe(other.firstName) : t.ended.neutral(other.firstName)}</p>
        <div className="actions">
          <Link to="/forslag" className="btn btn--primary">{t.ended.seeOthers}</Link>
        </div>
      </div>
    );
  }

  const student = (me.role === 'student' ? me : other) as StudentProfile;
  const host = (me.role === 'host' ? me : other) as HostProfile;
  const talkAbout = scoreMatch(student, host, t).toDiscuss;
  const meeting = connection.meeting;
  const showForm = !meeting || editing;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.date || form.date < today()) {
      setError(!form.date ? m.errNoDate : m.errPast);
      logEvent({ type: 'validation_error', step: 'meeting', field: 'date', role: me.role });
      return;
    }
    setError('');
    proposeMeeting(connection.id, form);
    logEvent({ type: 'meeting_proposed', role: me.role, other: who, value: form.place });
    forgetDraft();
    setEditing(false);
  };

  const stop = () => {
    if (window.confirm(m.stopConfirm(other.firstName))) {
      logEvent({ type: 'connection_stopped', role: me.role, other: who, step: 'meeting' });
      decide(other.id, 'declined');
      navigate('/forslag');
    }
  };

  const sayContinue = (yes: boolean) => {
    if (!yes && !window.confirm(m.continueNoConfirm(other.firstName))) return;
    logEvent({ type: yes ? 'continue_yes' : 'continue_no', role: me.role, other: who });
    answerContinue(connection.id, yes ? 'accepted' : 'declined');
  };

  const when = meeting ? t.fmt.when(formatDate(meeting.date, t), meeting.time) : '';
  const place = meeting ? placeLabel(meeting.place, t) : '';
  const both = bothContinue(connection);

  return (
    <div className="narrow">
      <Steps current={2} done={both} />
      <h1 tabIndex={-1}>{m.title(other.firstName)}</h1>

      {showForm && (
        <>
          <p className="lead">{m.lead}</p>
          <form className="form" onSubmit={submit} noValidate>
            <Field id="m-date" label={m.date} error={error}>
              <input
                id="m-date" type="date" min={today()} value={form.date}
                onChange={(e) => setForm({ date: e.target.value })}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'm-date-error' : undefined}
              />
            </Field>
            <Field id="m-time" label={m.time}>
              <select id="m-time" value={form.time} onChange={(e) => setForm({ time: e.target.value })}>
                {TIMES.map((time) => <option key={time} value={time}>{t.fmt.time(time)}</option>)}
              </select>
            </Field>
            <p><Link to="/tryghed">{t.safety.meetingLink}</Link></p>
            <Field id="m-place" label={m.place} hint={m.placeHint}>
              <select id="m-place" value={form.place} onChange={(e) => setForm({ place: e.target.value })} aria-describedby="m-place-hint">
                {MEETING_PLACES.map((p) => <option key={p} value={p}>{t.places[p]}</option>)}
              </select>
            </Field>
            <div className="actions">
              <button type="submit" className="btn btn--primary">{m.send(other.firstName)}</button>
              {meeting && (
                <button type="button" className="btn btn--secondary" onClick={() => setEditing(false)}>{t.common.cancel}</button>
              )}
            </div>
          </form>
        </>
      )}

      {meeting && !showForm && !meeting.confirmed && meeting.proposedBy === me.role && (
        <>
          <Notice tone="waiting">
            <p><strong>{m.waiting}</strong> {m.youProposed(when)} {m.placeIs(place)}</p>
            <p>{m.waitingFor(other.firstName)}</p>
          </Notice>
          <div className="actions">
            <button type="button" className="btn btn--secondary" onClick={() => setEditing(true)}>{m.proposeOther}</button>
          </div>
        </>
      )}

      {meeting && !showForm && !meeting.confirmed && meeting.proposedBy !== me.role && (
        <>
          <Notice>
            <p><strong>{m.theyPropose(other.firstName, when)}</strong></p>
            <p>{m.placeIs(place)}</p>
          </Notice>
          <div className="actions">
            <button
              type="button" className="btn btn--primary"
              onClick={() => {
                logEvent({ type: 'meeting_confirmed', role: me.role, other: who });
                confirmMeeting(connection.id);
              }}
            >
              {m.yesFits}
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => setEditing(true)}>{m.proposeOther}</button>
          </div>
        </>
      )}

      {meeting && !showForm && meeting.confirmed && (
        <>
          <Notice tone="good">
            <p><strong>{m.agreed}</strong> {m.meetAt(when)}</p>
            <p>{m.placeIs(place)}</p>
          </Notice>

          <p><Link to="/tryghed">{t.safety.meetingLink}</Link></p>

          <section className="block">
            <h2>{m.talkTitle}</h2>
            <ul className="dots">
              {talkAbout.map((item) => <li key={item}>{item}</li>)}
              {m.talk.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className="block" aria-labelledby="after-title">
            <h2 id="after-title">{m.afterTitle}</h2>

            {view.myContinue === null && (
              <>
                <h3 className="question">{m.continueQuestion(other.firstName)}</h3>
                <p>{m.continueHelp}</p>
                <div className="actions">
                  <button type="button" className="btn btn--primary" onClick={() => sayContinue(true)}>{m.continueYes}</button>
                  <button type="button" className="btn btn--secondary" onClick={() => sayContinue(false)}>{m.continueNo}</button>
                </div>
              </>
            )}

            {view.myContinue === 'accepted' && !both && (
              <Notice tone="waiting">
                <p><strong>{m.youSaidYes}</strong> {m.waitingContinue(other.firstName)}</p>
              </Notice>
            )}

            {both && (
              <>
                <Notice tone="good">
                  <p><strong>{m.bothYes}</strong> {m.bothYesText}</p>
                </Notice>
                <div className="actions">
                  <Link to={`/forloeb/${connection.id}/aftale`} className="btn btn--primary">{m.makeAgreement}</Link>
                </div>
              </>
            )}

            {!both && (
              <div className="actions">
                <button type="button" className="btn btn--secondary" onClick={() => setEditing(true)}>{m.move}</button>
              </div>
            )}
          </section>
        </>
      )}

      <p className="quiet">
        {m.stopQuestion}{' '}
        <button type="button" className="linkbutton" onClick={stop}>{m.stop(other.firstName)}</button>
      </p>
      <p className="quiet"><Link to={`/forloeb/${connection.id}/beskeder`}>{t.messages.link(other.firstName)}</Link></p>
      <p className="quiet"><Link to={`/bloker/${other.id}`}>{t.block.link(other.firstName)}</Link></p>
    </div>
  );
}
