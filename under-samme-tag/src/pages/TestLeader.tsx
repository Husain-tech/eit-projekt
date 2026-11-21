// The test leader page at /test. Testers do not see a link to it except a
// quiet one in the footer. It shows what happened in this browser and lets
// the test leader download it as CSV for the report.

import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearTestLog } from '../data/store';
import { LANGS, type Dict } from '../i18n';
import { useApp } from '../state/AppContext';
import { STEP_ORDER, downloadCsv, logEvent, readLog, summarise, toCsv } from '../state/testLog';
import type { TestSession } from '../types';

/** Wide tables scroll sideways on a phone. The region can get keyboard focus, so it can be scrolled without a mouse. */
function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return <div className="tablewrap" role="region" aria-label={label} tabIndex={0}>{children}</div>;
}

function clock(ms: number, lang: string): string {
  return new Date(ms).toLocaleString(lang === 'da' ? 'da-DK' : 'en-GB', { dateStyle: 'short', timeStyle: 'medium' });
}

function secs(ms: number, t: Dict): string {
  return t.test.seconds(Math.max(0, Math.round(ms / 1000)));
}

function stepName(step: string, t: Dict): string {
  if (STEP_ORDER.includes(step)) return t.form.steps[step as keyof Dict['form']['steps']];
  if (step === 'meeting') return t.steps.names[1];
  if (step === 'agreement') return t.steps.names[2];
  return step;
}

function fieldName(field: string, t: Dict): string {
  const names: Record<string, string> = {
    ...t.form.fieldNames,
    date: t.meeting.fieldDate,
    tasks: t.form.fieldNames.offers,
    rules: t.agreement.factRules,
  };
  return names[field] ?? field;
}

function personName(other: string | undefined, t: Dict): string {
  if (!other) return '';
  return other === '#own' ? t.test.ownOther : other;
}

function fileDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function TestLeader() {
  const { t, state, setAutoContinueAnswer, skipTime, resetTime, resetDemo } = useApp();
  const navigate = useNavigate();
  const [log, setLog] = useState(readLog);
  const x = t.test;

  // Keep the page current if the tester uses the site in another tab.
  useEffect(() => {
    const refresh = () => setLog(readLog());
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const sessions = log.sessions;
  const current: TestSession | undefined = sessions[sessions.length - 1];
  const earlier = sessions.slice(0, -1).reverse();
  const sum = current ? summarise(current) : null;

  const download = (list: TestSession[], name: string) => downloadCsv(name, toCsv(list, t));

  const newSession = () => {
    if (!window.confirm(x.newSessionConfirm)) return;
    resetDemo();
    setLog(readLog());
    navigate('/test');
  };

  const clearAll = () => {
    if (!window.confirm(x.clearConfirm)) return;
    clearTestLog();
    setLog(readLog());
  };

  const sizeName = (v: string) => t.layout.sizes[Number(v)] ?? v;
  const langName = (v: string) => LANGS.find((l) => l.value === v)?.name ?? v;
  const fitName = (f?: string) => (f ? t.fit[f as keyof Dict['fit']] : '');

  return (
    <div className="testpage">
      <h1 tabIndex={-1}>{x.title}</h1>
      <p className="lead">{x.lead}</p>
      <p><Link to="/">{x.back}</Link></p>

      <section className="block" aria-labelledby="t-session">
        <h2 id="t-session">{x.session}</h2>
        {!sum || current.events.length <= 1 ? (
          <p>{x.noEvents}</p>
        ) : null}
        {sum && (
          <dl className="facts">
            <div><dt>{x.started}</dt><dd>{clock(sum.startedAt, state.lang)}</dd></div>
            <div><dt>{x.duration}</dt><dd>{secs(sum.lastAt - sum.startedAt, t)}</dd></div>
            <div><dt>{x.role}</dt><dd>{sum.role === 'student' ? x.roleStudent : sum.role === 'host' ? x.roleHost : x.roleUnknown}</dd></div>
            <div>
              <dt>{x.profile}</dt>
              <dd>{!sum.profile ? x.roleUnknown : sum.profile.kind === 'own' ? x.profileOwn : x.profileDemo(sum.profile.name)}</dd>
            </div>
            {sum.role === 'student' && (
              <div><dt>{x.verified}</dt><dd>{sum.verified ? t.verify.factYes(sum.verified) : t.verify.factNo}</dd></div>
            )}
            <div><dt>{x.language}</dt><dd>{langName(state.lang)}</dd></div>
            <div><dt>{x.textSize}</dt><dd>{sizeName(String(state.textSize))}</dd></div>
          </dl>
        )}
      </section>

      <section className="block" aria-labelledby="t-settings">
        <h2 id="t-settings">{x.settingsTitle}</h2>
        <fieldset className="field">
          <legend className="field__label">{x.autoContinue}</legend>
          <p className="field__hint">{x.autoContinueHint}</p>
          <div className="checks checks--row">
            <label className="check">
              <input
                type="radio" name="autoContinue" checked={state.autoContinueAnswer === 'accepted'}
                onChange={() => setAutoContinueAnswer('accepted')}
              />
              <span>{x.autoYes}</span>
            </label>
            <label className="check">
              <input
                type="radio" name="autoContinue" checked={state.autoContinueAnswer === 'declined'}
                onChange={() => setAutoContinueAnswer('declined')}
              />
              <span>{x.autoNo}</span>
            </label>
          </div>
        </fieldset>

        <h3>{x.timeTitle}</h3>
        <p className="field__hint">{x.timeHint}</p>
        <p role="status"><strong>{x.timeNow(state.timeOffsetDays)}</strong></p>
        <div className="actions">
          <button
            type="button" className="btn btn--secondary"
            onClick={() => {
              skipTime(7);
              logEvent({ type: 'time_skipped', value: '7' });
              setLog(readLog());
            }}
          >
            {x.skipWeek}
          </button>
          {state.timeOffsetDays > 0 && <button type="button" className="btn btn--secondary" onClick={resetTime}>{x.resetTime}</button>}
        </div>
      </section>

      {sum && (
        <>
          <section className="block" aria-labelledby="t-form">
            <h2 id="t-form">{x.formTitle}</h2>
            <p>{x.formIntro}</p>
            <TableScroll label={x.formTitle}>
              <table className="table">
                <thead>
                  <tr><th scope="col">{x.colStep}</th><th scope="col">{x.colDone}</th><th scope="col">{x.colTime}</th><th scope="col">{x.colErrors}</th></tr>
                </thead>
                <tbody>
                  {sum.steps.length === 0 && <tr><td colSpan={4}>{x.none}</td></tr>}
                  {sum.steps.map((row) => (
                    <tr key={row.step}>
                      <th scope="row">{stepName(row.step, t)}</th>
                      <td>{row.count > 0 ? x.colTimes(row.count) : x.notDone}</td>
                      <td>{row.count > 0 ? secs(row.totalMs, t) : ''}</td>
                      <td>{row.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </section>

          <section className="block" aria-labelledby="t-flow">
            <h2 id="t-flow">{x.flowTitle}</h2>
            <TableScroll label={x.flowTitle}>
              <table className="table">
                <thead>
                  <tr><th scope="col">{x.colWhat}</th><th scope="col">{x.colPerson}</th><th scope="col">{x.colAt}</th><th scope="col">{x.colSincePrev}</th></tr>
                </thead>
                <tbody>
                  {sum.milestones.map((ms, i) => (
                    <tr key={`${ms.type}-${ms.at}-${i}`}>
                      <th scope="row">{x.events[ms.type]}</th>
                      <td>{personName(ms.other, t)}</td>
                      <td>{secs(ms.at - sum.startedAt, t)}</td>
                      <td>{i === 0 ? '' : secs(ms.at - sum.milestones[i - 1].at, t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </section>

          <section className="block" aria-labelledby="t-matches">
            <h2 id="t-matches">{x.matchesTitle}</h2>
            {[{ title: x.accepted, rows: sum.accepted, id: 'acc' }, { title: x.declined, rows: sum.declined, id: 'dec' }].map((group) => (
              <div key={group.id} className="tablegroup">
                <h3>{group.title}</h3>
                {group.rows.length === 0 ? <p>{x.none}</p> : (
                  <TableScroll label={group.title}>
                    <table className="table">
                      <thead>
                        <tr><th scope="col">{x.colPerson}</th><th scope="col">{x.colFit}</th><th scope="col">{x.colRank}</th><th scope="col">{x.colAt}</th></tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row, i) => (
                          <tr key={`${row.other}-${i}`}>
                            <th scope="row">{personName(row.other, t)}</th>
                            <td>{fitName(row.fit)}</td>
                            <td>{row.rank ?? ''}</td>
                            <td>{secs(row.at - sum.startedAt, t)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableScroll>
                )}
              </div>
            ))}
          </section>

          <section className="block" aria-labelledby="t-errors">
            <h2 id="t-errors">{x.errorsTitle}</h2>
            {sum.errors.length === 0 ? <p>{x.none}</p> : (
              <TableScroll label={x.errorsTitle}>
                <table className="table">
                  <thead>
                    <tr><th scope="col">{x.colStep}</th><th scope="col">{x.colField}</th><th scope="col">{x.colCount}</th></tr>
                  </thead>
                  <tbody>
                    {sum.errors.map((row) => (
                      <tr key={`${row.step}-${row.field}`}>
                        <th scope="row">{stepName(row.step, t)}</th>
                        <td>{fieldName(row.field, t)}</td>
                        <td>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </section>

          <section className="block" aria-labelledby="t-checkins">
            <h2 id="t-checkins">{x.checkinsTitle}</h2>
            {sum.checkins.length === 0 ? <p>{x.none}</p> : (
              <TableScroll label={x.checkinsTitle}>
                <table className="table">
                  <thead>
                    <tr><th scope="col">{x.colWeek}</th><th scope="col">{x.colPerson}</th><th scope="col">{x.colAnswer}</th><th scope="col">{x.colAt}</th></tr>
                  </thead>
                  <tbody>
                    {sum.checkins.map((row, i) => (
                      <tr key={`${row.at}-${i}`}>
                        <th scope="row">{row.step?.replace('week-', '') ?? ''}</th>
                        <td>{personName(row.other, t)}</td>
                        <td>{t.trial.answers[row.value as keyof Dict['trial']['answers']] ?? row.value}</td>
                        <td>{secs(row.at - sum.startedAt, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </section>

          <section className="block" aria-labelledby="t-blocks">
            <h2 id="t-blocks">{x.blocksTitle}</h2>
            {sum.blocks.length === 0 ? <p>{x.none}</p> : (
              <TableScroll label={x.blocksTitle}>
                <table className="table">
                  <thead>
                    <tr><th scope="col">{x.colPerson}</th><th scope="col">{x.colReason}</th><th scope="col">{x.colAt}</th></tr>
                  </thead>
                  <tbody>
                    {sum.blocks.map((row, i) => (
                      <tr key={`${row.at}-${i}`}>
                        <th scope="row">{personName(row.other, t)}</th>
                        <td>{t.block.reasons[row.value as keyof Dict['block']['reasons']] ?? row.value}</td>
                        <td>{secs(row.at - sum.startedAt, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </section>

          <section className="block" aria-labelledby="t-choices">
            <h2 id="t-choices">{x.sizesTitle}</h2>
            {sum.choices.length === 0 ? <p>{x.none}</p> : (
              <TableScroll label={x.sizesTitle}>
                <table className="table">
                  <thead>
                    <tr><th scope="col">{x.colWhat}</th><th scope="col">{x.colChoice}</th><th scope="col">{x.colAt}</th></tr>
                  </thead>
                  <tbody>
                    {sum.choices.map((c, i) => (
                      <tr key={`${c.type}-${c.at}-${i}`}>
                        <th scope="row">{c.type === 'text_size' ? x.textSize : x.language}</th>
                        <td>{c.type === 'text_size' ? sizeName(c.value) : langName(c.value)}</td>
                        <td>{secs(c.at - sum.startedAt, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </section>
        </>
      )}

      <section className="block" aria-labelledby="t-save">
        <h2 id="t-save">{x.downloadTitle}</h2>
        <div className="actions">
          {current && (
            <button type="button" className="btn btn--primary" onClick={() => download([current], `under-samme-tag_test_${fileDate(current.startedAt)}.csv`)}>
              {x.downloadCsv}
            </button>
          )}
          {sessions.length > 1 && (
            <button type="button" className="btn btn--secondary" onClick={() => download(sessions, `under-samme-tag_alle-test_${fileDate(Date.now())}.csv`)}>
              {x.downloadAll}
            </button>
          )}
        </div>
        <div className="actions">
          <button type="button" className="btn btn--secondary" onClick={newSession}>{x.newSession}</button>
        </div>
        <p className="field__hint">{x.newSessionHint}</p>
      </section>

      {earlier.length > 0 && (
        <section className="block" aria-labelledby="t-earlier">
          <h2 id="t-earlier">{x.earlierTitle}</h2>
          <TableScroll label={x.earlierTitle}>
            <table className="table">
              <thead>
                <tr><th scope="col">{x.colSession}</th><th scope="col">{x.started}</th><th scope="col">{x.colEvents}</th><th scope="col"><span className="visually-hidden">{x.download}</span></th></tr>
              </thead>
              <tbody>
                {earlier.map((s) => (
                  <tr key={s.id}>
                    <th scope="row">{s.id}</th>
                    <td>{clock(s.startedAt, state.lang)}</td>
                    <td>{s.events.length}</td>
                    <td>
                      <button type="button" className="btn btn--secondary" onClick={() => download([s], `under-samme-tag_test_${fileDate(s.startedAt)}.csv`)}>
                        {x.download}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </section>
      )}

      <p className="quiet">
        <button type="button" className="linkbutton linkbutton--danger" onClick={clearAll}>{x.clearAll}</button>
      </p>
    </div>
  );
}
