import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ProfileSummary, profileTagline } from '../components/ProfileSummary';
import { Avatar, HelperBadge, Notice, VerifiedBadge } from '../components/ui';
import type { Dict } from '../i18n';
import { AREAS, formatDate, formatKr } from '../labels';
import { rankHostsForStudent, rankStudentsForHost, type MatchResult } from '../matching/match';
import { bothContinue, isAgreed, isEnded, isMutual, trialStatus, useApp, viewFor } from '../state/AppContext';
import { logEvent, otherLabel } from '../state/testLog';
import type { Connection, Profile } from '../types';

type Sort = 'fit' | 'money';
interface Filters { area: string; money: number; company: boolean; sort: Sort }
const NO_FILTERS: Filters = { area: '', money: 0, company: false, sort: 'fit' };
const MONEY_STEPS = [1500, 2000, 2500, 3000];

/** Area, rent and company filters for the new suggestions, read from the current user's side. */
function passes(other: Profile, f: Filters): boolean {
  if (other.role === 'host') {
    if (f.area && other.area !== f.area) return false;
    if (f.money && other.rent > f.money) return false;
    if (f.company && !other.wants.includes('samvaer')) return false;
    return true;
  }
  if (f.area && other.areas.length > 0 && !other.areas.includes(f.area)) return false;
  if (f.money && other.budget < f.money) return false;
  if (f.company && !other.offers.includes('samvaer')) return false;
  return true;
}

/** Money order: cheapest room first for students, highest budget first for hosts. */
function moneyOf(p: Profile): number {
  return p.role === 'host' ? p.rent : -p.budget;
}

interface Row {
  other: Profile;
  result: MatchResult;
  rank: number;
  connection?: Connection;
}

/** What should happen next for a pair, in words, plus the link to do it. */
function nextStep(c: Connection, meRole: Profile['role'], otherName: string, t: Dict, now: number): { text: string; link?: { to: string; label: string } } {
  const s = t.suggestions;
  const v = viewFor(meRole, c);
  if (v.theirDecision === 'declined') return { text: s.theyDeclined(otherName) };
  if (!isMutual(c)) return { text: s.waitingMatch(otherName) };
  const meet = `/forloeb/${c.id}/moede`;
  const agree = `/forloeb/${c.id}/aftale`;
  if (!c.meeting) return { text: s.bothWantMeet, link: { to: meet, label: s.planMeeting } };
  if (!c.meeting.confirmed) {
    return c.meeting.proposedBy === meRole
      ? { text: s.youProposed(otherName), link: { to: meet, label: s.seeMeeting } }
      : { text: s.theyProposed(otherName), link: { to: meet, label: s.answerMeeting } };
  }
  if (!bothContinue(c)) {
    // The other person's answer stays private until both have answered.
    if (v.myContinue === 'accepted') return { text: s.waitingContinue(otherName), link: { to: meet, label: s.seeMeeting } };
    const when = t.fmt.when(formatDate(c.meeting.date, t), c.meeting.time);
    return { text: s.meetingAt(when), link: { to: meet, label: s.answerAfterMeeting } };
  }
  if (!c.agreement) return { text: s.bothContinue, link: { to: agree, label: s.makeAgreement } };
  if (isAgreed(c)) {
    const trial = trialStatus(c.agreement, now);
    return { text: trial.over ? s.trialOver : s.inTrial(trial.weeksLeft), link: { to: `/forloeb/${c.id}/proeve`, label: s.seeTrial } };
  }
  return v.iConfirmed
    ? { text: s.youConfirmed(otherName), link: { to: agree, label: s.seeAgreement } }
    : { text: s.theyWrote(otherName), link: { to: agree, label: s.readAgreement } };
}

export function Suggestions() {
  const { me, t, now, students, hosts, connectionWith, decide } = useApp();
  const location = useLocation();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  if (!me) return null;
  const blockedName = (location.state as { blocked?: string } | null)?.blocked;
  const s = t.suggestions;

  const ranked = me.role === 'student'
    ? rankHostsForStudent(me, hosts, t)
    : rankStudentsForHost(me, students, t);

  const rows: Row[] = ranked.map((r, i) => ({ ...r, rank: i + 1, connection: connectionWith(r.other.id) }));
  const mine = (r: Row) => (r.connection ? viewFor(me.role, r.connection).myDecision : null);
  const ended = (r: Row) => !!r.connection && isEnded(r.connection);

  const ongoing = rows.filter((r) => mine(r) === 'accepted' && !ended(r));
  const allFresh = rows.filter((r) => mine(r) === null);
  const fresh = allFresh
    .filter((r) => passes(r.other, filters))
    .sort((a, b) => (filters.sort === 'money' ? moneyOf(a.other) - moneyOf(b.other) : a.rank - b.rank));
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const f = t.filter;
  const isStudent = me.role === 'student';

  const changeFilter = (change: Partial<Filters>) => {
    const [key, value] = Object.entries(change)[0];
    logEvent({ type: 'filter_used', role: me.role, field: key, value: String(value) });
    setFilters((old) => ({ ...old, ...change }));
  };
  const declined = rows.filter((r) => mine(r) === 'declined');
  const finished = rows.filter((r) => mine(r) === 'accepted' && ended(r));

  const answer = (row: Row, decision: 'accepted' | 'declined') => {
    logEvent({
      type: decision === 'accepted' ? 'match_accepted' : 'match_declined',
      role: me.role, other: otherLabel(row.other), fit: row.result.level, rank: row.rank,
    });
    decide(row.other.id, decision);
  };

  return (
    <>
      <h1 tabIndex={-1}>{s.title}</h1>
      <p className="lead">{me.role === 'student' ? s.leadStudent : s.leadHost}</p>
      {blockedName && <Notice tone="good"><p><strong>{t.block.done(blockedName)}</strong></p></Notice>}

      {ongoing.length > 0 && (
        <section className="block" aria-labelledby="ongoing-title">
          <h2 id="ongoing-title">{s.ongoingTitle}</h2>
          <ul className="rows">
            {ongoing.map(({ other, connection }) => {
              const step = nextStep(connection!, me.role, other.firstName, t, now);
              return (
                <li key={other.id} className="rowcard">
                  <div className="who">
                    <Avatar name={other.firstName} />
                    <div>
                      <h3>{other.firstName}</h3>
                      <p role="status">{step.text}</p>
                    </div>
                  </div>
                  <div className="rowcard__actions">
                    {step.link && <Link to={step.link.to} className="btn btn--primary">{step.link.label}</Link>}
                    {isMutual(connection!) && (
                      <Link to={`/forloeb/${connection!.id}/beskeder`} className="btn btn--secondary">{t.messages.link(other.firstName)}</Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="block" aria-labelledby="fresh-title">
        <h2 id="fresh-title">{s.freshTitle}</h2>
        {allFresh.length > 0 && (
          <div className="filters" role="group" aria-labelledby="filter-title">
            <h3 id="filter-title">{f.title}</h3>
            <div className="filters__row">
              <div className="filters__item">
                <label htmlFor="flt-area">{f.area}</label>
                <select id="flt-area" value={filters.area} onChange={(e) => changeFilter({ area: e.target.value })}>
                  <option value="">{f.areaAll}</option>
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="filters__item">
                <label htmlFor="flt-money">{isStudent ? f.maxRent : f.minBudget}</label>
                <select id="flt-money" value={filters.money} onChange={(e) => changeFilter({ money: Number(e.target.value) })}>
                  <option value={0}>{f.any}</option>
                  {MONEY_STEPS.map((n) => (
                    <option key={n} value={n}>{isStudent ? f.rentOption(formatKr(n, t)) : f.budgetOption(formatKr(n, t))}</option>
                  ))}
                </select>
              </div>
              <div className="filters__item">
                <label htmlFor="flt-sort">{f.sort}</label>
                <select id="flt-sort" value={filters.sort} onChange={(e) => changeFilter({ sort: e.target.value as Sort })}>
                  <option value="fit">{f.sortFit}</option>
                  <option value="money">{isStudent ? f.sortRentLow : f.sortBudgetHigh}</option>
                </select>
              </div>
            </div>
            <label className="check check--plain filters__check">
              <input type="checkbox" checked={filters.company} onChange={(e) => changeFilter({ company: e.target.checked })} />
              <span>{isStudent ? f.companyStudent : f.companyHost}</span>
            </label>
            <p className="filters__count" role="status">{f.showing(fresh.length, allFresh.length)}</p>
            {filtered && (
              <button type="button" className="linkbutton" onClick={() => setFilters(NO_FILTERS)}>{f.reset}</button>
            )}
          </div>
        )}
        {allFresh.length === 0 ? (
          <p>{s.noMore}</p>
        ) : fresh.length === 0 ? (
          <p>{f.noneMatch}</p>
        ) : (
          <ul className="cards">
            {fresh.map((row) => {
              const { other, result } = row;
              return (
                <li key={other.id}>
                  <article className="card" aria-labelledby={`name-${other.id}`}>
                    <header className="card__head">
                      <div className="who">
                        <Avatar name={other.firstName} size="lg" />
                        <div>
                          <h3 id={`name-${other.id}`}>{other.firstName}</h3>
                          <p className="card__tag">{profileTagline(other, t)}</p>
                          {other.role === 'student' && <VerifiedBadge domain={other.verifiedDomain} />}
                          {other.role === 'host' && other.helper && <HelperBadge />}
                        </div>
                      </div>
                      <p className={`fit fit--${result.level}`}>{t.fit[result.level]}</p>
                    </header>

                    <p className="card__intro">{other.intro}</p>

                    {result.reasons.length > 0 && (
                      <div className="why">
                        <h4>{s.whyTitle}</h4>
                        <ul className="ticks">
                          {result.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                        </ul>
                      </div>
                    )}
                    {result.toDiscuss.length > 0 && (
                      <div className="why why--discuss">
                        <h4>{s.discussTitle}</h4>
                        <ul className="dots">
                          {result.toDiscuss.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </div>
                    )}

                    <details className="more">
                      <summary>{s.readMore(other.firstName)}</summary>
                      <ProfileSummary profile={other} />
                    </details>

                    <div className="actions">
                      <button type="button" className="btn btn--primary" onClick={() => answer(row, 'accepted')}>
                        {s.yes(other.firstName)}
                      </button>
                      <button type="button" className="btn btn--secondary" onClick={() => answer(row, 'declined')}>
                        {s.no}
                      </button>
                    </div>
                    <p className="card__block"><Link to={`/bloker/${other.id}`}>{t.block.link(other.firstName)}</Link></p>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {finished.length > 0 && (
        <section className="block" aria-labelledby="ended-title">
          <h2 id="ended-title">{s.endedTitle}</h2>
          <ul className="rows">
            {finished.map(({ other, connection }) => (
              <li key={other.id} className="rowcard rowcard--quiet">
                <div>
                  <h3>{other.firstName}</h3>
                  <p>
                    {viewFor(me.role, connection!).myContinue === 'declined'
                      ? t.ended.byMe(other.firstName)
                      : t.ended.neutral(other.firstName)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {declined.length > 0 && (
        <section className="block" aria-labelledby="declined-title">
          <h2 id="declined-title">{s.declinedTitle}</h2>
          <ul className="rows">
            {declined.map(({ other }) => (
              <li key={other.id} className="rowcard rowcard--quiet">
                <div>
                  <h3>{other.firstName}</h3>
                  <p>{profileTagline(other, t)}</p>
                </div>
                <button
                  type="button" className="btn btn--secondary"
                  onClick={() => {
                    logEvent({ type: 'match_undo', role: me.role, other: otherLabel(other) });
                    decide(other.id, null);
                  }}
                >
                  {s.undo(other.firstName)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
