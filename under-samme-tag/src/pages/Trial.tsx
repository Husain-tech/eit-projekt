import { Link, Navigate, useParams } from 'react-router-dom';
import { Notice, Steps } from '../components/ui';
import { isAgreed, trialStatus, useApp, viewFor } from '../state/AppContext';
import { logEvent, otherLabel } from '../state/testLog';
import type { CheckInAnswer } from '../types';

const ANSWERS: CheckInAnswer[] = ['good', 'mixed', 'bad'];

/** Step 4: the trial period. Weeks left, and a private weekly check-in. */
export function TrialPage() {
  const { id } = useParams();
  const { me, t, state, now, getProfile, isHidden, checkIn } = useApp();
  const connection = state.connections.find((c) => c.id === id);
  const x = t.trial;

  if (!me || !connection) return <Navigate to="/forslag" replace />;
  if (!isAgreed(connection) || !connection.agreement) return <Navigate to={`/forloeb/${connection.id}/aftale`} replace />;
  const view = viewFor(me.role, connection);
  const other = getProfile(view.otherId);
  if (!other || isHidden(other.id)) return <Navigate to="/forslag" replace />;

  const a = connection.agreement;
  const status = trialStatus(a, now);
  const mine = a.checkIns.filter((c) => c.role === me.role).sort((p, q) => p.week - q.week);
  const thisWeek = mine.find((c) => c.week === status.checkInWeek);
  const studentName = me.role === 'student' ? me.firstName : other.firstName;
  const hostName = me.role === 'host' ? me.firstName : other.firstName;
  const done = Math.min(a.trialWeeks, a.trialWeeks - status.weeksLeft);

  const answer = (value: CheckInAnswer) => {
    logEvent({ type: 'checkin', role: me.role, other: otherLabel(other), value, step: `week-${status.checkInWeek}` });
    checkIn(connection.id, value);
  };

  return (
    <div className="narrow">
      <Steps current={4} done={status.over} />
      <h1 tabIndex={-1}>{x.title(studentName, hostName)}</h1>

      {status.over ? (
        <Notice tone="good">
          <p><strong>{x.over}</strong> {x.overText(a.noticeWeeks)}</p>
        </Notice>
      ) : (
        <div className="trial">
          <p className="trial__big">{x.weeksLeft(status.weeksLeft)}</p>
          <p>{x.weekOf(status.week, a.trialWeeks)}</p>
          {/* The bar repeats the sentence above. The words carry the meaning. */}
          <div className="trial__bar" aria-hidden="true">
            {Array.from({ length: a.trialWeeks }, (_, i) => (
              <span key={i} className={i < done ? 'trial__week trial__week--done' : i === done ? 'trial__week trial__week--now' : 'trial__week'} />
            ))}
          </div>
        </div>
      )}
      <p className="field__hint">{x.startNote}</p>

      {!status.over && (
        <section className="block" aria-labelledby="checkin-title">
          <h2 id="checkin-title">{x.checkTitle}</h2>
          {!thisWeek ? (
            <>
              <p>{x.checkHelp}</p>
              <div className="actions">
                {ANSWERS.map((value) => (
                  <button key={value} type="button" className="btn btn--secondary" onClick={() => answer(value)}>
                    {x.answers[value]}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <Notice tone={thisWeek.answer === 'good' ? 'good' : 'info'}>
              <p><strong>{x.answered(x.answers[thisWeek.answer])}</strong> {x.replies[thisWeek.answer]}</p>
              <p>{x.nextWeek}</p>
            </Notice>
          )}
          {thisWeek && thisWeek.answer !== 'good' && (
            <p><Link to="/tryghed">{x.readAdvice}</Link></p>
          )}
        </section>
      )}

      {mine.length > 0 && (
        <section className="block" aria-labelledby="history-title">
          <h2 id="history-title">{x.historyTitle}</h2>
          <ul className="dots">
            {mine.map((c) => <li key={c.week}>{x.historyLine(c.week, x.answers[c.answer])}</li>)}
          </ul>
        </section>
      )}

      <div className="actions">
        <Link to={`/forloeb/${connection.id}/aftale`} className="btn btn--secondary">{x.seeAgreement}</Link>
      </div>
      <p className="quiet">
        <Link to="/tryghed">{t.safety.link}</Link>
        {' · '}
        <Link to={`/bloker/${other.id}`}>{t.block.link(other.firstName)}</Link>
      </p>
    </div>
  );
}
